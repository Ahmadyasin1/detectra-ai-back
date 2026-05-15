"""
Detectra AI v4 — Object Detector + Segmentation + Pose + ByteTrack
===================================================================
YOLOv8s-seg (44.9 mAP) + YOLOv8n-pose (17-kp skeleton) + ByteTrack.
Replaces previous YOLOv8n-only detector with full v4 perception stack.
"""
from __future__ import annotations

import math
from collections import Counter, defaultdict, deque
from pathlib import Path
from typing import Any

import cv2
import numpy as np
import structlog

from app.config import settings
from app.services.pipeline.preprocessor import Frame

logger = structlog.get_logger(__name__)

POSE_KP = [
    "nose","l_eye","r_eye","l_ear","r_ear",
    "l_shoulder","r_shoulder","l_elbow","r_elbow",
    "l_wrist","r_wrist","l_hip","r_hip",
    "l_knee","r_knee","l_ankle","r_ankle",
]
_KP = {n: i for i, n in enumerate(POSE_KP)}
WEAPON_CLASSES = {"baseball bat", "knife", "scissors"}


class ObjectDetectorService:
    """
    v4 perception: YOLOv8s-seg + ByteTrack + YOLOv8n-pose + ActionBuffer.
    """
    _seg_model  = None
    _pose_model = None
    CONF = 0.28
    IOU  = 0.45

    def __init__(self):
        self._track_ages:   dict = defaultdict(int)
        self._vel_hist:     dict = defaultdict(lambda: deque(maxlen=10))
        self._action_buf:   dict = defaultdict(lambda: deque(maxlen=5))
        self._committed:    dict = {}
        self._dwell:        dict = {}
        self._nearby_pairs: set  = set()
        self._clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    @classmethod
    def _load_models(cls):
        if cls._seg_model is None:
            from ultralytics import YOLO
            seg_path  = Path(settings.MODELS_DIR) / "yolov8s-seg.pt"
            pose_path = Path(settings.MODELS_DIR) / "yolov8n-pose.pt"
            cls._seg_model  = YOLO(str(seg_path)  if seg_path.exists()  else "yolov8s-seg.pt")
            cls._pose_model = YOLO(str(pose_path) if pose_path.exists() else "yolov8n-pose.pt")
            logger.info("YOLOv8s-seg + pose loaded")

    @staticmethod
    def _iou4(a, b) -> float:
        ix1=max(a[0],b[0]); iy1=max(a[1],b[1])
        ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
        if ix2<=ix1 or iy2<=iy1: return 0.0
        inter=(ix2-ix1)*(iy2-iy1)
        return inter/((a[2]-a[0])*(a[3]-a[1])+(b[2]-b[0])*(b[3]-b[1])-inter+1e-8)

    def _velocity(self, tid, ts, cx, cy) -> float:
        self._vel_hist[tid].append((ts, cx, cy))
        h = list(self._vel_hist[tid])
        if len(h) < 2: return 0.0
        dt = h[-1][0]-h[0][0]
        return math.hypot(h[-1][1]-h[0][1], h[-1][2]-h[0][2])/dt if dt > 1e-4 else 0.0

    def _torso_angle(self, kps) -> float:
        ls,rs,lh,rh = kps[_KP["l_shoulder"]],kps[_KP["r_shoulder"]],kps[_KP["l_hip"]],kps[_KP["r_hip"]]
        if ls[2]<0.3 or lh[2]<0.3: return 0.0
        sx,sy=(ls[0]+rs[0])/2,(ls[1]+rs[1])/2
        hx,hy=(lh[0]+rh[0])/2,(lh[1]+rh[1])/2
        return abs(math.degrees(math.atan2(abs(hx-sx),abs(hy-sy)+1e-6)))

    def _classify_raw(self, cx, cy, kps, vel, tid, ts, aspect) -> str:
        if aspect > 1.6: return "fallen"
        if kps is not None and kps[_KP["l_shoulder"],2]>=0.3 and kps[_KP["l_hip"],2]>=0.3:
            if self._torso_angle(kps) > 50: return "fallen"
        in_fight = any(tid in p for p in self._nearby_pairs)
        arm = 1.0
        if kps is not None:
            ls,rs,lw,rw = kps[_KP["l_shoulder"]],kps[_KP["r_shoulder"]],kps[_KP["l_wrist"]],kps[_KP["r_wrist"]]
            if ls[2]>=0.3 and rs[2]>=0.3 and lw[2]>=0.3 and rw[2]>=0.3:
                arm = abs(rw[0]-lw[0])/(abs(rs[0]-ls[0])+1e-6)
        if in_fight and vel > 0.05 and (arm > 1.8 or vel > 0.10): return "fighting"
        if vel > 0.14: return "running"
        if vel > 0.06: return "walking"
        if vel > 0.04: return "slow walking"
        dwell = self._dwell.get(tid)
        if dwell:
            dt = ts-dwell[0]; dist = math.hypot(cx-dwell[1],cy-dwell[2])
            if dt >= 12.0 and dist < 0.10: return "loitering"
            if dist > 0.10: self._dwell[tid] = (ts, cx, cy)
        return "standing" if vel < 0.012 else "stationary"

    def _smooth_action(self, tid, raw) -> str:
        buf = self._action_buf[tid]; buf.append(raw); hist = list(buf)
        for crit in ("fallen","fighting"):
            if hist[-min(3,len(hist)):].count(crit) >= 2:
                self._committed[tid] = crit; return crit
        if len(hist) >= 3:
            best, cnt = Counter(hist[-3:]).most_common(1)[0]
            if cnt >= 2: self._committed[tid] = best
        return self._committed.get(tid, raw)

    def detect(self, frames: list[Frame], extraction_fps: float | None = None) -> list[dict[str, Any]]:
        self._load_models()
        seg  = self._seg_model; pose = self._pose_model
        fps  = extraction_fps or getattr(settings, "FRAME_EXTRACTION_FPS", 3)
        prev_gray = None; results = []

        for frame in frames:
            img_bgr = frame.image; ts = frame.timestamp_s
            yuv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2YUV)
            yuv[:,:,0] = self._clahe.apply(yuv[:,:,0])
            img_enh = cv2.cvtColor(yuv, cv2.COLOR_YUV2BGR)
            frgb = cv2.cvtColor(img_enh, cv2.COLOR_BGR2RGB)
            fgry = cv2.cvtColor(img_enh, cv2.COLOR_BGR2GRAY)

            flow_mag = 0.0
            if prev_gray is not None:
                flw = cv2.calcOpticalFlowFarneback(prev_gray,fgry,None,0.5,3,15,3,5,1.2,0)
                flow_mag = float(np.mean(np.sqrt(flw[...,0]**2+flw[...,1]**2)))
            prev_gray = fgry

            seg_res  = seg.track(frgb, conf=self.CONF, iou=self.IOU, persist=True,
                                  verbose=False, tracker="bytetrack.yaml")
            pose_res = pose(frgb, conf=self.CONF, verbose=False)
            pose_list = []
            if pose_res and pose_res[0].keypoints is not None:
                for j, kd in enumerate(pose_res[0].keypoints.data):
                    pb = pose_res[0].boxes[j]
                    pose_list.append(([float(v) for v in pb.xyxyn[0]], kd.cpu().numpy()))

            detections_out = []; weapon_detected = False
            persons_for_pairs = []

            if seg_res and seg_res[0].boxes is not None:
                boxes = seg_res[0].boxes; names = seg_res[0].names
                for box in boxes:
                    if names.get(int(box.cls[0]),"")=="person" and box.id is not None:
                        x1,y1,x2,y2=[float(v) for v in box.xyxyn[0]]
                        persons_for_pairs.append((int(box.id[0]),x1,y1,x2,y2))
                self._nearby_pairs = set()
                for i,(ta,ax1,ay1,ax2,ay2) in enumerate(persons_for_pairs):
                    for (tb,bx1,by1,bx2,by2) in persons_for_pairs[i+1:]:
                        if self._iou4((ax1,ay1,ax2,ay2),(bx1,by1,bx2,by2))>0.05:
                            self._nearby_pairs.add((min(ta,tb),max(ta,tb)))

                for i, box in enumerate(boxes):
                    cls_id=int(box.cls[0]); cname=names.get(cls_id,f"cls_{cls_id}")
                    conf=float(box.conf[0]); x1,y1,x2,y2=[float(v) for v in box.xyxyn[0]]
                    tid=int(box.id[0]) if box.id is not None else None
                    cx,cy=(x1+x2)/2,(y1+y2)/2; w_b,h_b=x2-x1,y2-y1; aspect=w_b/(h_b+1e-6)
                    if cname in WEAPON_CLASSES: weapon_detected=True
                    kps_arr=None
                    if cname=="person" and pose_list:
                        best_iou=0.0
                        for pbbox,pkps in pose_list:
                            iou=self._iou4((x1,y1,x2,y2),tuple(pbbox))
                            if iou>best_iou: best_iou=iou; kps_arr=pkps
                    action=""
                    if cname=="person" and tid is not None:
                        if tid not in self._dwell: self._dwell[tid]=(ts,cx,cy)
                        self._track_ages[tid]+=1
                        vel=self._velocity(tid,ts,cx,cy)
                        action=self._smooth_action(tid,self._classify_raw(cx,cy,kps_arr,vel,tid,ts,aspect))
                    det={"class_name":cname,"confidence":round(conf,3),
                         "bbox":{"x1":x1,"y1":y1,"x2":x2,"y2":y2},
                         "track_id":tid,"action":action,"aspect":round(aspect,3)}
                    if kps_arr is not None: det["keypoints"]=kps_arr.tolist()
                    detections_out.append(det)

            flags=[]; person_dets=[d for d in detections_out if d["class_name"]=="person"]
            for d in person_dets:
                if d["action"]=="fallen":   flags.append("FALL")
                if d["action"]=="fighting": flags.append("FIGHT")
                if d["action"]=="loitering":flags.append("LOITER")
                if d["action"]=="running":  flags.append("RUN")
            if weapon_detected: flags.append("WEAPON")
            runners=sum(1 for d in person_dets if d["action"] in ("running","fast walking"))
            if runners>=3 and runners>=0.55*max(1,len(person_dets)): flags.append("STAMPEDE")

            acts=[d["action"] for d in person_dets if d["action"]]
            dom=Counter(acts).most_common(1)[0][0] if acts else ""
            results.append({
                "timestamp_start_s": ts,
                "timestamp_end_s":   ts+1.0/fps,
                "confidence": max((d["confidence"] for d in detections_out),default=0.0),
                "data":{
                    "detections":detections_out,
                    "person_count":len(person_dets),
                    "total_objects":len(detections_out),
                    "dominant_action":dom,
                    "flow_magnitude":round(flow_mag,3),
                    "surveillance_flags":flags,
                    "weapon_detected":weapon_detected,
                },
            })
        logger.info("v4 detection complete", frames=len(frames))
        return results
