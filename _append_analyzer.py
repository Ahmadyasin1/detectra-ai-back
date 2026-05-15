"""Appends the DetectraAnalyzer class + output + CLI to analyze_videos.py"""
import pathlib

ADDITION = r'''

# ══════════════════════════════════════════════════════════════════════════════
# Core Analyzer
# ══════════════════════════════════════════════════════════════════════════════

class DetectraAnalyzer:
    def __init__(self):
        self._seg   = None
        self._pose  = None
        self._whisper = None
        self._logo  = LogoDetector()
        self._fusion = FusionEngine()
        self._surv  = SurveillanceDetector()
        print("\n" + "="*70)
        print("  Detectra AI v3.0 — Enhanced Production Analyzer")
        print("  YOLOv8s-Seg + Pose + Whisper-Small + MFCC + Fusion Transformer")
        print("="*70)

    def _load_seg(self):
        if self._seg is None:
            print(f"  [YOLO-Seg] Loading {YOLO_SEG_MODEL}...")
            from ultralytics import YOLO
            self._seg = YOLO(YOLO_SEG_MODEL)
            print("  [YOLO-Seg] Ready")
        return self._seg

    def _load_pose(self):
        if self._pose is None:
            print(f"  [YOLO-Pose] Loading {YOLO_POSE_MODEL}...")
            from ultralytics import YOLO
            self._pose = YOLO(YOLO_POSE_MODEL)
            print("  [YOLO-Pose] Ready")
        return self._pose

    def _load_whisper(self):
        if self._whisper is None:
            print(f"  [Whisper] Loading {WHISPER_MODEL}...")
            import whisper as _w
            self._whisper = _w.load_model(WHISPER_MODEL)
            print("  [Whisper] Ready")
        return self._whisper

    def _extract_audio(self, video_path: Path) -> "Path | None":
        out = OUTPUT_DIR / f"_tmp_{video_path.stem}.wav"
        try:
            r = subprocess.run(
                ["ffmpeg", "-y", "-i", str(video_path),
                 "-vn", "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                 "-af", "highpass=f=80,lowpass=f=8000", str(out)],
                capture_output=True, timeout=120,
            )
            stderr = r.stderr.decode("utf-8", errors="replace")
            if "Audio" in stderr and out.exists() and out.stat().st_size > 2000:
                return out
            print("  [INFO] No audio stream")
        except FileNotFoundError:
            print("  [WARN] ffmpeg not in PATH")
        except Exception as e:
            print(f"  [WARN] Audio extraction: {e}")
        if out.exists():
            out.unlink(missing_ok=True)
        return None

    def _denoise_audio(self, audio_path: Path) -> Path:
        out = OUTPUT_DIR / f"_tmp_{audio_path.stem}_dn.wav"
        try:
            import noisereduce as nr
            import librosa
            import soundfile as sf
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                y, sr = librosa.load(str(audio_path), sr=16000, mono=True)
            noise = y[:int(sr * 0.5)] if len(y) > sr else y
            reduced = nr.reduce_noise(y=y, sr=sr, y_noise=noise,
                                      stationary=False, prop_decrease=0.75)
            sf.write(str(out), reduced, sr)
            print("  [Audio] Denoised")
            return out
        except Exception as e:
            print(f"  [WARN] Denoise: {e}")
            return audio_path

    def analyze(self, video_path: Path) -> VideoAnalysis:
        t0 = time.perf_counter()
        print(f"\n{'─'*70}\n  Analyzing: {video_path.name}\n{'─'*70}")
        cap = cv2.VideoCapture(str(video_path))
        src_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        W = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        H = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        nf = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        dur = nf / src_fps
        cap.release()
        print(f"  {W}x{H} | {dur:.1f}s | {src_fps:.1f}fps")

        analysis = VideoAnalysis(video_path=video_path, duration_s=dur,
                                 width=W, height=H, fps=src_fps, total_frames=nf)

        print(f"\n  [1/5] Perception: YOLOv8s-Seg + Pose + ByteTrack + OCR")
        analysis.frame_results, analysis.unique_track_ids, analysis.logo_detections = \
            self._run_perception(video_path, analysis)

        print(f"\n  [2/5] Speech: Whisper-{WHISPER_MODEL} + MFCC audio")
        audio_path = self._extract_audio(video_path)
        if audio_path:
            if USE_DENOISE:
                audio_path = self._denoise_audio(audio_path)
            analysis.speech_segments = self._run_whisper(audio_path, dur)
            analysis.audio_events    = classify_audio(str(audio_path), dur)
            audio_path.unlink(missing_ok=True)
            (OUTPUT_DIR / f"_tmp_{video_path.stem}.wav").unlink(missing_ok=True)
        else:
            print("  [INFO] No audio")

        print(f"\n  [3/5] Fusion: 4-head cross-attention transformer")
        analysis.fusion_insights = self._fusion.fuse(
            analysis.frame_results, analysis.audio_events,
            analysis.speech_segments, dur)
        mx = max((fi.anomaly_score for fi in analysis.fusion_insights), default=0.0)
        alerts = sum(1 for fi in analysis.fusion_insights if fi.alert)
        print(f"    {len(analysis.fusion_insights)} windows | max={mx:.3f} | alerts={alerts}")

        print(f"\n  [4/5] Surveillance: fall/fight/loitering/crowd")
        analysis.surveillance_events = self._surv.analyze(
            analysis.frame_results, analysis.audio_events)
        print(f"    {len(analysis.surveillance_events)} events")

        print(f"\n  [5/5] Output: stats + labeled video + report")
        self._compute_stats(analysis)
        analysis.labeled_video_path = self._write_labeled_video(video_path, analysis)
        analysis.report_path        = self._write_html_report(analysis)
        analysis.processing_time_s  = time.perf_counter() - t0
        print(f"\n  Done: {analysis.processing_time_s:.1f}s | persons={len(analysis.unique_track_ids)}")
        return analysis

    # ── IoU helper ─────────────────────────────────────────────────────────
    @staticmethod
    def _iou4(a, b):
        ix1=max(a[0],b[0]); iy1=max(a[1],b[1])
        ix2=min(a[2],b[2]); iy2=min(a[3],b[3])
        if ix2<=ix1 or iy2<=iy1: return 0.0
        inter=(ix2-ix1)*(iy2-iy1)
        ua=(a[2]-a[0])*(a[3]-a[1]); ub=(b[2]-b[0])*(b[3]-b[1])
        return inter/(ua+ub-inter+1e-8)

    # ── Perception ─────────────────────────────────────────────────────────
    def _run_perception(self, video_path, analysis):
        seg  = self._load_seg()
        pose_model = self._load_pose()
        action_rec = PoseActionRecognizer()

        frame_results = []; all_logos = []; all_tids = set()
        track_ages: dict = defaultdict(int)

        cap      = cv2.VideoCapture(str(video_path))
        src_fps  = analysis.fps
        interval = max(1, int(src_fps / ANALYSIS_FPS))
        logo_int = max(1, int(src_fps))
        fi = 0; analyzed = 0; prev_gray = None

        while True:
            ret, frame = cap.read()
            if not ret: break
            if fi % interval == 0:
                ts   = fi / src_fps
                frgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                fgry = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

                # Optical flow
                flow_mag = 0.0
                if prev_gray is not None:
                    flw = cv2.calcOpticalFlowFarneback(
                        prev_gray, fgry, None, 0.5, 3, 15, 3, 5, 1.2, 0)
                    flow_mag = float(np.mean(np.sqrt(flw[...,0]**2+flw[...,1]**2)))
                prev_gray = fgry

                # Segmentation + tracking
                seg_res  = seg.track(frgb, conf=YOLO_CONF, iou=YOLO_IOU,
                                     persist=True, verbose=False,
                                     tracker="bytetrack.yaml")
                # Pose estimation
                pose_res = pose_model(frgb, conf=YOLO_CONF, verbose=False)
                pose_list = []
                if pose_res and pose_res[0].keypoints is not None:
                    for j, kd in enumerate(pose_res[0].keypoints.data):
                        kps_arr = kd.cpu().numpy()
                        pb = pose_res[0].boxes[j]
                        pose_list.append(([float(v) for v in pb.xyxyn[0]], PoseKPs(kps_arr)))

                detections = []
                if seg_res and seg_res[0].boxes is not None:
                    boxes = seg_res[0].boxes
                    masks = seg_res[0].masks
                    names = seg_res[0].names
                    for i, box in enumerate(boxes):
                        cls_id = int(box.cls[0])
                        cname  = names.get(cls_id, f"cls_{cls_id}")
                        conf   = float(box.conf[0])
                        x1,y1,x2,y2 = [float(v) for v in box.xyxyn[0]]
                        tid    = int(box.id[0]) if box.id is not None else None

                        mask_arr = None
                        if masks is not None and i < len(masks.data):
                            mask_arr = masks.data[i].cpu().numpy()

                        best_pose = None
                        if cname == "person" and pose_list:
                            best_iou = 0.0
                            for pbbox, pkps in pose_list:
                                iou = self._iou4((x1,y1,x2,y2), tuple(pbbox))
                                if iou > best_iou:
                                    best_iou = iou; best_pose = pkps

                        if tid is not None:
                            track_ages[tid] += 1; all_tids.add(tid)

                        det = Detection(
                            class_name=cname, confidence=conf,
                            x1=x1, y1=y1, x2=x2, y2=y2,
                            mask=mask_arr, track_id=tid, pose=best_pose,
                            track_age=track_ages.get(tid,0))
                        detections.append(det)

                actions_map = action_rec.update(ts, detections)
                for det in detections:
                    if det.track_id in actions_map:
                        det.action = actions_map[det.track_id]
                dom = action_rec.get_dominant(detections)

                flags = []
                for det in detections:
                    if det.class_name == "person":
                        if det.action == "fallen":   flags.append("FALL")
                        if det.action == "fighting":  flags.append("FIGHT")
                        if det.action == "loitering": flags.append("LOITER")

                if fi % logo_int == 0:
                    all_logos.extend(self._logo.detect(frame, ts))

                pc = sum(1 for d in detections if d.class_name == "person")
                pid = {d.track_id for d in detections if d.class_name=="person" and d.track_id}
                frame_results.append(FrameResult(
                    frame_idx=fi, timestamp_s=ts, detections=detections,
                    person_count=pc, unique_track_ids=pid,
                    dominant_action=dom, flow_magnitude=flow_mag,
                    surveillance_flags=flags))
                analyzed += 1
                if analyzed % 20 == 0:
                    print(f"    frame {analyzed} | t={ts:.1f}s | persons={pc} | tracks={len(all_tids)} | flags={flags}")
            fi += 1
        cap.release()

        seen = set(); unique_logos = []
        for lg in all_logos:
            k = (lg.brand, round(lg.timestamp_s/2))
            if k not in seen: seen.add(k); unique_logos.append(lg)
        print(f"    Done: {analyzed} frames | {len(all_tids)} tracks | {len(unique_logos)} logos")
        return frame_results, all_tids, unique_logos

    # ── Whisper ─────────────────────────────────────────────────────────────
    def _run_whisper(self, audio_path: Path, duration: float):
        import whisper as _w
        wm = self._load_whisper()
        segs = []
        try:
            audio  = _w.load_audio(str(audio_path))
            clip   = _w.pad_or_trim(audio)
            mel    = _w.log_mel_spectrogram(clip).to(wm.device)
            _, prbs= wm.detect_language(mel)
            lang   = max(prbs, key=prbs.get)
            lconf  = float(prbs[lang])
            lname  = LANG_NAMES.get(lang, lang.upper())
            print(f"    Language: {lname} ({lang}) conf={lconf:.1%}")
            if lconf < 0.55:
                print("    [INFO] Low conf — likely ambient, skipping")
                return []
            result = wm.transcribe(
                str(audio_path), language=lang, task="transcribe",
                fp16=False, word_timestamps=False, verbose=False,
                no_speech_threshold=0.50, logprob_threshold=-1.0,
                compression_ratio_threshold=2.4,
                condition_on_previous_text=True,
                initial_prompt="The following is spoken dialogue.")
            dl    = result.get("language", lang)
            dname = LANG_NAMES.get(dl, dl.upper())
            for seg in result.get("segments", []):
                text  = seg.get("text","").strip()
                logp  = seg.get("avg_logprob",-2.0)
                nsp   = seg.get("no_speech_prob",0.0)
                conf  = float(max(0.0,min(1.0,math.exp(max(logp,-3.0))*(1-nsp))))
                noise = (nsp>0.50 or logp<-1.0 or not text or len(text)<2)
                if noise: text="[noise]"
                segs.append(SpeechSegment(start_s=float(seg["start"]),end_s=float(seg["end"]),
                                          text=text,language=dl,language_name=dname,
                                          confidence=conf,is_noise=noise))
            real=sum(1 for s in segs if not s.is_noise)
            print(f"    Transcript: {real} speech + {len(segs)-real} noise")
        except Exception as e:
            print(f"  [WARN] Whisper: {e}"); traceback.print_exc()
        return segs

    # ── Stats ───────────────────────────────────────────────────────────────
    def _compute_stats(self, analysis: VideoAnalysis):
        classes=[]; actions=[]; max_p=0; peak_ts=0.0
        for fr in analysis.frame_results:
            classes.extend(d.class_name for d in fr.detections)
            if fr.dominant_action: actions.append(fr.dominant_action)
            if fr.person_count > max_p: max_p=fr.person_count; peak_ts=fr.timestamp_s
        analysis.class_frequencies  = dict(Counter(classes))
        analysis.action_frequencies = dict(Counter(actions))
        analysis.total_object_count = len(classes)
        analysis.max_persons_in_frame=max_p; analysis.peak_activity_ts=peak_ts
        if analysis.speech_segments:
            s0=analysis.speech_segments[0]
            analysis.detected_language=s0.language; analysis.detected_language_name=s0.language_name
        parts=[]
        for seg in analysis.speech_segments:
            m,s=divmod(seg.start_s,60)
            parts.append(f"[{int(m):02d}:{s:05.2f}] {'[noise]' if seg.is_noise else seg.text}")
        analysis.full_transcript="\n".join(parts)
        up=len(analysis.unique_track_ids)
        da=Counter(actions).most_common(1)[0][0] if actions else "unknown"
        mx=max((fi.anomaly_score for fi in analysis.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx)
        alerts=sum(1 for fi in analysis.fusion_insights if fi.alert)
        sv=len(analysis.surveillance_events)
        ps=[f"{analysis.width}x{analysis.height} | {analysis.duration_s:.1f}s."]
        if up>0: ps.append(f"{up} unique persons; peak {max_p} at t={peak_ts:.1f}s. Action: {da}.")
        else: ps.append("No persons detected.")
        top=[c for c,_ in Counter(classes).most_common(8) if c!="person"]
        if top: ps.append(f"Objects: {', '.join(top[:5])}.")
        sr=[s for s in analysis.speech_segments if not s.is_noise]
        if sr: ps.append(f"Speech: {len(sr)} segs ({analysis.detected_language_name or analysis.detected_language}).")
        elif analysis.audio_events:
            ac=Counter(e.event_type for e in analysis.audio_events).most_common(2)
            ps.append(f"Audio: {', '.join(f'{c}x{t}' for t,c in ac)}.")
        if analysis.logo_detections:
            brands=list({lg.brand for lg in analysis.logo_detections})[:4]
            ps.append(f"Logos: {', '.join(brands)}.")
        ps.append(f"Risk: {risk.upper()} (max={mx:.2f}, {alerts} alerts, {sv} surv events).")
        analysis.summary=" ".join(ps)
        print(f"    Stats | risk={risk} | persons={up} | classes={len(analysis.class_frequencies)}")

    # ── Labeled Video ───────────────────────────────────────────────────────
    def _write_labeled_video(self, video_path: Path, analysis: VideoAnalysis) -> Path:
        out=OUTPUT_DIR/f"{video_path.stem}_labeled.mp4"
        cap=cv2.VideoCapture(str(video_path))
        W=analysis.width; H=analysis.height; fps=analysis.fps
        writer=cv2.VideoWriter(str(out),cv2.VideoWriter_fourcc(*"mp4v"),fps,(W,H))
        fl={fr.frame_idx:fr for fr in analysis.frame_results}
        SKEL=[(0,1),(0,2),(1,3),(2,4),(5,6),(5,7),(7,9),(6,8),(8,10),
              (5,11),(6,12),(11,12),(11,13),(13,15),(12,14),(14,16)]

        def get_speech(ts):
            for seg in analysis.speech_segments:
                if seg.start_s<=ts<=seg.end_s and not seg.is_noise:
                    t=seg.text[:70]+("..." if len(seg.text)>70 else "")
                    return f"[{seg.language_name}] {t}"
            return ""
        def get_fusion(ts):
            for fi in analysis.fusion_insights:
                if fi.window_start_s<=ts<fi.window_end_s: return fi
            return None
        def get_sevents(ts):
            return [e for e in analysis.surveillance_events if abs(e.timestamp_s-ts)<2.0]

        fi_idx=0; last_fr=None
        while True:
            ret,frame=cap.read()
            if not ret: break
            ts=fi_idx/fps
            if fi_idx in fl: last_fr=fl[fi_idx]
            fr=last_fr
            if fr:
                overlay=frame.copy()
                for det in fr.detections:
                    if det.mask is not None:
                        color=_id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                        m=cv2.resize(det.mask.astype(np.uint8),(W,H),interpolation=cv2.INTER_NEAREST)
                        overlay[m>0]=color
                frame=cv2.addWeighted(overlay,MASK_ALPHA,frame,1-MASK_ALPHA,0)
                for det in fr.detections:
                    x1=int(det.x1*W); y1=int(det.y1*H); x2=int(det.x2*W); y2=int(det.y2*H)
                    color=_id_color(det.track_id) if det.track_id else _cls_color(det.class_name)
                    cv2.rectangle(frame,(x1,y1),(x2,y2),color,3 if det.class_name=="person" else 2)
                    lbl=det.class_name
                    if det.track_id: lbl+=f" #{det.track_id}"
                    if det.action:   lbl+=f" [{det.action}]"
                    lbl+=f" {det.confidence:.0%}"
                    fs=0.42; font=cv2.FONT_HERSHEY_SIMPLEX
                    (lw,lh),_=cv2.getTextSize(lbl,font,fs,1)
                    ly=max(y1-4,lh+4)
                    cv2.rectangle(frame,(x1,ly-lh-4),(x1+lw+4,ly+2),color,-1)
                    cv2.putText(frame,lbl,(x1+2,ly-2),font,fs,(255,255,255),1)
                    if DRAW_POSE and det.pose and det.class_name=="person":
                        kps=det.pose.kps
                        pts={i:(int(kps[i,0]*W),int(kps[i,1]*H)) for i in range(17) if kps[i,2]>=0.30}
                        for a_,b_ in SKEL:
                            if a_ in pts and b_ in pts:
                                cv2.line(frame,pts[a_],pts[b_],color,2)
                        for pt in pts.values(): cv2.circle(frame,pt,3,(255,255,255),-1)
                fus=get_fusion(ts); sev=fus.severity if fus else "normal"
                hc=SEV_COLORS.get(sev,(150,150,150))
                lines=[("Detectra AI v3.0",(0,225,130)),
                       (f"t={int(ts//60):02d}:{ts%60:05.2f}",(220,220,220)),
                       (f"Persons: {fr.person_count}",(220,220,220)),
                       (f"Objects: {len(fr.detections)}",(220,220,220))]
                if fr.dominant_action: lines.append((f"Action: {fr.dominant_action}",(120,210,255)))
                if fr.surveillance_flags: lines.append((f"FLAGS: {' | '.join(fr.surveillance_flags)}",(80,80,255)))
                if fus:
                    lines.append((f"Scene: {fus.scene_label[:20]}",(200,200,200)))
                    lines.append((f"Anomaly: {fus.anomaly_score:.2f} [{sev.upper()}]",hc))
                pw=220; ph=len(lines)*20+10
                cv2.rectangle(frame,(0,0),(pw,ph),(0,0,0),-1)
                cv2.rectangle(frame,(0,0),(pw,ph),hc,1)
                for i,(line,color) in enumerate(lines):
                    cv2.putText(frame,line,(6,16+i*20),cv2.FONT_HERSHEY_SIMPLEX,0.43,color,1)
                for idx,ev in enumerate(get_sevents(ts)[:2]):
                    ec=SEV_COLORS.get(ev.severity,(150,150,150))
                    banner=f"ALERT: {ev.event_type.upper()} — {ev.description[:60]}"
                    cv2.rectangle(frame,(0,H-60-idx*32),(W,H-28-idx*32),(20,20,20),-1)
                    cv2.putText(frame,banner,(10,H-38-idx*32),cv2.FONT_HERSHEY_SIMPLEX,0.52,ec,1)
                st=get_speech(ts)
                if st:
                    font=cv2.FONT_HERSHEY_SIMPLEX; fs2=0.52
                    (tw,th),_=cv2.getTextSize(st,font,fs2,1)
                    x=(W-tw)//2; y=H-22
                    sub=frame.copy()
                    cv2.rectangle(sub,(x-8,y-th-8),(x+tw+8,y+8),(0,0,0),-1)
                    cv2.addWeighted(sub,0.65,frame,0.35,0,frame)
                    cv2.putText(frame,st,(x,y),font,fs2,(240,240,80),1)
            writer.write(frame); fi_idx+=1
        cap.release(); writer.release()
        sz=out.stat().st_size//(1024*1024)
        print(f"    Labeled video: {out.name} ({sz} MB)")
        return out

    # ── HTML Report ─────────────────────────────────────────────────────────
    def _write_html_report(self, analysis: VideoAnalysis) -> Path:
        out=OUTPUT_DIR/f"{analysis.video_name}_report.html"
        def ft(s): m=int(s//60); return f"{m:02d}:{s%60:05.2f}"
        mx=max((fi.anomaly_score for fi in analysis.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx); alerts=sum(1 for fi in analysis.fusion_insights if fi.alert)
        RC={"normal":"#8b949e","low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171"}
        rc=RC.get(risk,"#8b949e"); up=len(analysis.unique_track_ids)

        # Chart data
        pts  =json.dumps([f"{fr.timestamp_s:.1f}" for fr in analysis.frame_results])
        pcnt =json.dumps([fr.person_count for fr in analysis.frame_results])
        flow =json.dumps([round(fr.flow_magnitude,2) for fr in analysis.frame_results])
        fts  =json.dumps([f"{fi.window_start_s:.1f}" for fi in analysis.fusion_insights])
        fanom=json.dumps([round(fi.anomaly_score,3) for fi in analysis.fusion_insights])
        falign=json.dumps([round(fi.visual_audio_alignment,3) for fi in analysis.fusion_insights])
        olbl =json.dumps([c for c,_ in Counter(analysis.class_frequencies).most_common(12)])
        oval =json.dumps([v for _,v in Counter(analysis.class_frequencies).most_common(12)])
        albl =json.dumps(AUDIO_TYPES)
        aval =json.dumps([Counter(e.event_type for e in analysis.audio_events).get(t,0) for t in AUDIO_TYPES])
        actlbl=json.dumps([a for a,_ in Counter(analysis.action_frequencies).most_common(10)])
        actval=json.dumps([v for _,v in Counter(analysis.action_frequencies).most_common(10)])

        def obj_rows():
            rows=""
            for cls,cnt in sorted(analysis.class_frequencies.items(),key=lambda x:-x[1]):
                pct=min(100,cnt*100//(analysis.total_object_count or 1))
                rows+=f"<tr><td>{cls}</td><td class='c mono'>{cnt}</td><td><div class='bw'><div class='bar' style='width:{pct}%'></div></div></td></tr>"
            return rows or "<tr><td colspan='3' class='c muted'>None</td></tr>"

        def act_rows():
            rows=""; tot=sum(analysis.action_frequencies.values()) or 1
            for act,cnt in Counter(analysis.action_frequencies).most_common(15):
                rows+=f"<tr><td>{act}</td><td class='mono'>{cnt}</td><td class='mono'>{cnt/tot*100:.1f}%</td></tr>"
            return rows or "<tr><td colspan='3' class='c muted'>None</td></tr>"

        def logo_rows():
            rows=""
            for lg in analysis.logo_detections[:30]:
                rows+=f"<tr><td class='mono'>{ft(lg.timestamp_s)}</td><td><b>{lg.brand}</b></td><td class='mono'>{lg.text_found}</td><td class='mono c'>{lg.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>No logos via OCR</td></tr>"

        def speech_rows():
            rows=""
            for seg in analysis.speech_segments:
                td='<span class="noise">[noise]</span>' if seg.is_noise else seg.text
                nr_cls="nr" if seg.is_noise else ""
                rows+=f"<tr class='{nr_cls}'><td class='mono'>{ft(seg.start_s)}&rarr;{ft(seg.end_s)}</td><td>{td}</td><td class='mono'>{seg.language_name}</td><td class='mono c'>{seg.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>No speech</td></tr>"

        def audio_rows():
            rows=""
            for ev in analysis.audio_events[:80]:
                bc={"speech":"badge-speech","music":"badge-music","noise":"badge-noise","silence":"badge-silence","ambient":"badge-ambient"}.get(ev.event_type,"badge-ambient")
                rows+=f"<tr><td class='mono'>{ft(ev.timestamp_s)}</td><td><span class='badge {bc}'>{ev.event_type}</span></td><td class='small'>{ev.details}</td><td class='mono c'>{ev.confidence:.1%}</td></tr>"
            return rows or "<tr><td colspan='4' class='c muted'>None</td></tr>"

        SB={"normal":"badge-normal","low":"badge-low","medium":"badge-medium","high":"badge-high","critical":"badge-critical"}
        def fusion_rows():
            rows=""
            for fi in analysis.fusion_insights:
                rs="style='background:rgba(248,113,113,.07)'" if fi.alert else ""
                af="<span class='alert-flag'>ALERT</span>" if fi.alert else ""
                scene=fi.scene_label.replace("_"," ").title()
                factors=", ".join(fi.contributing_factors) or "—"
                rows+=(f"<tr {rs}><td class='mono'>{ft(fi.window_start_s)}&ndash;{ft(fi.window_end_s)}</td>"
                       f"<td>{scene}</td><td class='mono c'>{fi.anomaly_score:.3f}</td>"
                       f"<td><span class='badge {SB.get(fi.severity,'badge-normal')}'>{fi.severity.upper()}</span>{af}</td>"
                       f"<td class='mono c'>{fi.visual_audio_alignment:.2f}</td><td class='small'>{factors}</td></tr>")
            return rows or "<tr><td colspan='6' class='c muted'>None</td></tr>"

        def surv_rows():
            rows=""
            SEC={"low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171","normal":"#8b949e"}
            for ev in analysis.surveillance_events:
                sc=SEC.get(ev.severity,"#8b949e")
                rows+=(f"<tr><td class='mono'>{ft(ev.timestamp_s)}</td>"
                       f"<td><b style='color:{sc}'>{ev.event_type.replace('_',' ').upper()}</b></td>"
                       f"<td>{ev.description}</td><td class='mono c'>{ev.confidence:.0%}</td></tr>")
            return rows or "<tr><td colspan='4' class='c muted'>No events</td></tr>"

        def timeline_rows():
            rows=""
            for fr in analysis.frame_results:
                if not fr.detections: continue
                pb=f"<span class='badge badge-person'>{fr.person_count}p</span>" if fr.person_count else ""
                ab=f"<span class='badge badge-action'>{fr.dominant_action}</span>" if fr.dominant_action else ""
                fb="".join(f"<span class='badge badge-flag'>{f}</span>" for f in fr.surveillance_flags)
                clss=", ".join(sorted(set(d.class_name for d in fr.detections)))
                rows+=(f"<tr><td class='mono'>{ft(fr.timestamp_s)}</td><td>{pb}{ab}{fb}</td>"
                       f"<td class='small'>{clss}</td><td class='mono c'>{len(fr.detections)}</td>"
                       f"<td class='mono c'>{fr.flow_magnitude:.1f}</td></tr>")
            return rows or "<tr><td colspan='5' class='c muted'>None</td></tr>"

        gen=datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        css="""
:root{--bg:#0d1117;--bg2:#161b22;--bg3:#1f2937;--bg4:#0a0f17;
--border:#30363d;--text:#e6edf3;--t2:#8b949e;--t3:#6e7681;
--green:#00e5a0;--blue:#60a5fa;--orange:#fb923c;--red:#f87171;
--yellow:#fbbf24;--purple:#c084fc;--mono:'JetBrains Mono','Courier New',monospace;}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',sans-serif;background:var(--bg);color:var(--text);font-size:14px;line-height:1.5}
.hero{background:linear-gradient(135deg,#0d1117,#0f1c2e,#1a2332);border-bottom:2px solid var(--green);padding:44px 60px}
.hero h1{font-size:36px;font-weight:800}.h1g{color:var(--green)}.h1w{color:var(--t2)}
.sub{color:var(--t2);margin-top:6px;font-size:15px}
.meta{display:flex;flex-wrap:wrap;gap:28px;margin-top:28px}
.mi{display:flex;flex-direction:column;gap:3px}
.mi label{font-size:10px;color:var(--t3);text-transform:uppercase;letter-spacing:.08em}
.mi value{font-family:var(--mono);font-size:13px}
.rb{display:flex;align-items:center;gap:16px;padding:14px 24px;border-radius:8px;margin:28px 0 4px;border:1px solid;font-weight:600}
.rb-normal{background:rgba(139,148,158,.08);border-color:var(--t3);color:var(--t3)}
.rb-low{background:rgba(96,165,250,.08);border-color:var(--blue);color:var(--blue)}
.rb-medium{background:rgba(251,191,36,.08);border-color:var(--yellow);color:var(--yellow)}
.rb-high{background:rgba(251,146,60,.08);border-color:var(--orange);color:var(--orange)}
.rb-critical{background:rgba(248,113,113,.12);border-color:var(--red);color:var(--red)}
.content{max-width:1440px;margin:0 auto;padding:32px 48px}
.section{background:var(--bg2);border:1px solid var(--border);border-radius:12px;margin-bottom:28px;overflow:hidden}
.sh{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:14px;background:rgba(0,0,0,.2)}
.sn{font-family:var(--mono);font-size:10px;color:var(--t3);background:var(--bg3);padding:4px 9px;border-radius:4px}
.sh h2{font-size:15px;font-weight:600}.tag{font-size:11px;color:var(--t3);margin-left:auto;background:var(--bg3);padding:3px 9px;border-radius:20px}
.sb{padding:22px 24px}
.sg{display:grid;grid-template-columns:repeat(auto-fill,minmax(138px,1fr));gap:14px;margin-bottom:20px}
.sc{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:18px 14px;text-align:center}
.sc .v{font-family:var(--mono);font-size:30px;font-weight:700;color:var(--green);line-height:1}
.sc .l{font-size:10px;color:var(--t3);margin-top:6px;text-transform:uppercase;letter-spacing:.05em}
.sc.al .v{color:var(--orange)}.sc.rs .v{color:""" + rc + """}
.sum{background:var(--bg3);border-left:3px solid var(--green);border-radius:0 8px 8px 0;padding:16px 20px;color:var(--t2);line-height:1.8;margin-bottom:20px}
table{width:100%;border-collapse:collapse;font-size:13px}
thead th{background:rgba(0,0,0,.3);padding:10px 14px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--t3);border-bottom:1px solid var(--border)}
tbody td{padding:9px 14px;border-bottom:1px solid rgba(48,54,61,.6);vertical-align:top}
tbody tr:last-child td{border-bottom:none}
tbody tr:hover td{background:rgba(255,255,255,.025)}
.nr td{opacity:.55}.mono{font-family:var(--mono);font-size:12px}.small{font-size:12px}.c{text-align:center}.muted{color:var(--t3)}
.badge{display:inline-block;padding:2px 9px;border-radius:20px;font-size:11px;font-weight:600;margin:1px}
.badge-person{background:rgba(0,229,160,.12);color:var(--green);border:1px solid rgba(0,229,160,.25)}
.badge-action{background:rgba(96,165,250,.12);color:var(--blue);border:1px solid rgba(96,165,250,.25)}
.badge-flag{background:rgba(248,113,113,.15);color:var(--red);border:1px solid rgba(248,113,113,.3)}
.badge-speech{background:rgba(0,229,160,.15);color:var(--green)}
.badge-music{background:rgba(192,132,252,.15);color:var(--purple)}
.badge-noise{background:rgba(251,146,60,.15);color:var(--orange)}
.badge-silence{background:rgba(110,118,129,.1);color:var(--t3)}
.badge-ambient{background:rgba(96,165,250,.12);color:var(--blue)}
.badge-normal{background:rgba(139,148,158,.1);color:var(--t3)}
.badge-low{background:rgba(96,165,250,.12);color:var(--blue)}
.badge-medium{background:rgba(251,191,36,.12);color:var(--yellow)}
.badge-high{background:rgba(251,146,60,.12);color:var(--orange)}
.badge-critical{background:rgba(248,113,113,.15);color:var(--red)}
.alert-flag{display:inline-block;margin-left:6px;padding:2px 7px;background:rgba(248,113,113,.2);color:var(--red);border:1px solid rgba(248,113,113,.4);border-radius:4px;font-size:10px;font-weight:700}
.noise{color:var(--t3);font-style:italic}
.bw{background:var(--bg3);border-radius:3px;height:7px;width:100%}.bar{background:var(--green);border-radius:3px;height:7px}
.cr{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px}
.cb{background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:18px;height:260px}
.arch{background:var(--bg4);border:1px solid var(--border);border-radius:8px;padding:18px;font-family:var(--mono);font-size:12px;color:var(--t2);line-height:1.9;margin-bottom:20px;white-space:pre}
.footer{text-align:center;padding:36px;color:var(--t3);font-size:12px;border-top:1px solid var(--border);margin-top:28px}
@media(max-width:900px){.content{padding:16px}.hero{padding:24px}.cr{grid-template-columns:1fr}}"""

        html=f"""<!DOCTYPE html><html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Detectra AI v3 — {analysis.video_name}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>{css}</style></head><body>
<div class="hero">
  <h1><span class="h1g">Detectra</span> <span class="h1w">AI</span> <span style="font-size:16px;color:var(--t3);font-weight:400">v3.0</span></h1>
  <div class="sub">Enhanced Deep Video Intelligence — {analysis.video_name}</div>
  <div class="meta">
    <div class="mi"><label>Video</label><value>{analysis.video_path.name}</value></div>
    <div class="mi"><label>Duration</label><value>{analysis.duration_s:.1f}s</value></div>
    <div class="mi"><label>Resolution</label><value>{analysis.width}x{analysis.height} @ {analysis.fps:.0f}fps</value></div>
    <div class="mi"><label>Language</label><value>{analysis.detected_language_name or "N/A"}</value></div>
    <div class="mi"><label>Risk</label><value style="color:{rc}">{risk.upper()}</value></div>
    <div class="mi"><label>Generated</label><value>{gen}</value></div>
    <div class="mi"><label>Process Time</label><value>{analysis.processing_time_s:.1f}s</value></div>
  </div>
</div>
<div class="content">
<div class="rb rb-{risk}">
  <span>RISK: {risk.upper()}</span><span>Max Anomaly: {mx:.3f}</span>
  <span>Alerts: {alerts}</span><span>Surv Events: {len(analysis.surveillance_events)}</span>
  <span>Fusion Windows: {len(analysis.fusion_insights)}</span>
</div>
<div class="section"><div class="sh"><span class="sn">01</span><h2>Executive Summary</h2></div>
<div class="sb"><div class="sum">{analysis.summary}</div>
<div class="sg">
  <div class="sc"><div class="v">{up}</div><div class="l">Unique Persons</div></div>
  <div class="sc"><div class="v">{analysis.max_persons_in_frame}</div><div class="l">Peak Count</div></div>
  <div class="sc"><div class="v">{len(analysis.class_frequencies)}</div><div class="l">Object Classes</div></div>
  <div class="sc"><div class="v">{analysis.total_object_count}</div><div class="l">Detections</div></div>
  <div class="sc"><div class="v">{len(analysis.speech_segments)}</div><div class="l">Speech Segs</div></div>
  <div class="sc"><div class="v">{len(analysis.audio_events)}</div><div class="l">Audio Events</div></div>
  <div class="sc"><div class="v">{len(analysis.logo_detections)}</div><div class="l">Logos</div></div>
  <div class="sc al"><div class="v">{alerts}</div><div class="l">Fusion Alerts</div></div>
  <div class="sc al"><div class="v">{len(analysis.surveillance_events)}</div><div class="l">Surv Events</div></div>
  <div class="sc rs"><div class="v">{risk.upper()}</div><div class="l">Risk Level</div></div>
</div>
<div class="cr"><div class="cb"><canvas id="c1"></canvas></div><div class="cb"><canvas id="c2"></canvas></div></div>
<div class="cr"><div class="cb"><canvas id="c3"></canvas></div><div class="cb"><canvas id="c4"></canvas></div></div>
<div class="cr"><div class="cb"><canvas id="c5"></canvas></div><div class="cb"><canvas id="c6"></canvas></div></div>
</div></div>
<div class="section"><div class="sh"><span class="sn">02</span><h2>Object Detection &amp; Segmentation</h2><span class="tag">YOLOv8s-Seg + ByteTrack</span></div>
<div class="sb"><table><thead><tr><th>Class</th><th class="c">Count</th><th>Bar</th></tr></thead><tbody>{obj_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">03</span><h2>Action Recognition</h2><span class="tag">YOLOv8n-Pose + Kinematics</span></div>
<div class="sb"><table><thead><tr><th>Action</th><th>Frames</th><th>Coverage</th></tr></thead><tbody>{act_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">04</span><h2>Logo &amp; Brand Detection</h2><span class="tag">EasyOCR + Brand Dictionary</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Brand</th><th>OCR Text</th><th class="c">Confidence</th></tr></thead><tbody>{logo_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">05</span><h2>Speech Transcription</h2><span class="tag">Whisper {WHISPER_MODEL} + noisereduce</span></div>
<div class="sb"><table><thead><tr><th>Time Range</th><th>Text</th><th>Language</th><th class="c">Conf</th></tr></thead><tbody>{speech_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">06</span><h2>Audio Classification</h2><span class="tag">Librosa MFCC — 1s windows</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Type</th><th>Details</th><th class="c">Conf</th></tr></thead><tbody>{audio_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">07</span><h2>Surveillance Events</h2><span class="tag">Fall / Fight / Loitering / Crowd / Abandoned Object</span></div>
<div class="sb"><table><thead><tr><th>Timestamp</th><th>Event</th><th>Description</th><th class="c">Conf</th></tr></thead><tbody>{surv_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">08</span><h2>Multimodal Fusion Engine</h2><span class="tag">4-Head Cross-Attention Transformer — {FUSION_WINDOW:.0f}s Windows</span></div>
<div class="sb">
<div class="arch">Visual Enc [COCO-80 + action-6 + flow-3] FC(89→128) | Audio Enc [type-5+RMS+ZCR+cent+speech] FC(9→128)
Cross-Attention ×2 (4 heads, d=128): visual queries attend audio keys/values
Temporal Self-Attention | EMA anomaly smoothing (alpha=0.5)
Scene: 16 labels | Anomaly: 0..1 | V-A Alignment: cosine</div>
<table><thead><tr><th>Window</th><th>Scene</th><th class="c">Anomaly</th><th>Severity</th><th class="c">Align</th><th>Factors</th></tr></thead><tbody>{fusion_rows()}</tbody></table></div></div>
<div class="section"><div class="sh"><span class="sn">09</span><h2>Frame Timeline</h2></div>
<div class="sb"><table><thead><tr><th>Time</th><th>Persons/Action/Flags</th><th>Objects</th><th class="c">Count</th><th class="c">Flow</th></tr></thead><tbody>{timeline_rows()}</tbody></table></div></div>
</div>
<div class="footer">Detectra AI v3.0 &mdash; UCP FYP F25AI009 &mdash; {gen}</div>
<script>
const CD={{color:'#8b949e',plugins:{{legend:{{labels:{{color:'#8b949e',font:{{size:11}}}}}}}},scales:{{x:{{ticks:{{color:'#6e7681',maxTicksLimit:20}},grid:{{color:'#21262d'}}}},y:{{ticks:{{color:'#6e7681'}},grid:{{color:'#21262d'}}}}}}}}
new Chart(document.getElementById('c1'),{{type:'line',data:{{labels:{pts},datasets:[{{label:'Persons',data:{pcnt},borderColor:'#00e5a0',backgroundColor:'rgba(0,229,160,.08)',borderWidth:2,pointRadius:0,fill:true,tension:0.3}}]}},options:{{...CD,plugins:{{...CD.plugins,title:{{display:true,text:'Person Count',color:'#e6edf3',font:{{size:12}}}}}}}}}}  );
new Chart(document.getElementById('c2'),{{type:'line',data:{{labels:{fts},datasets:[{{label:'Anomaly',data:{fanom},borderColor:'#f87171',backgroundColor:'rgba(248,113,113,.07)',borderWidth:2,pointRadius:2,fill:true,tension:0.3}},{{label:'V-A Align',data:{falign},borderColor:'#60a5fa',backgroundColor:'transparent',borderWidth:1.5,pointRadius:1,borderDash:[4,2]}}]}},options:{{...CD,scales:{{...CD.scales,y:{{...CD.scales.y,min:0,max:1}}}},plugins:{{...CD.plugins,title:{{display:true,text:'Anomaly & V-A Alignment',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c3'),{{type:'line',data:{{labels:{pts},datasets:[{{label:'Optical Flow',data:{flow},borderColor:'#c084fc',backgroundColor:'rgba(192,132,252,.08)',borderWidth:1.5,pointRadius:0,fill:true,tension:0.3}}]}},options:{{...CD,plugins:{{...CD.plugins,title:{{display:true,text:'Optical Flow',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c4'),{{type:'doughnut',data:{{labels:{albl},datasets:[{{data:{aval},backgroundColor:['#21262d','rgba(96,165,250,.6)','rgba(0,229,160,.6)','rgba(192,132,252,.6)','rgba(251,146,60,.6)'],borderColor:'#30363d',borderWidth:1}}]}},options:{{plugins:{{legend:{{labels:{{color:'#8b949e',font:{{size:11}}}}}},title:{{display:true,text:'Audio Events',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c5'),{{type:'bar',data:{{labels:{olbl},datasets:[{{label:'Count',data:{oval},backgroundColor:'rgba(0,229,160,.5)',borderColor:'#00e5a0',borderWidth:1}}]}},options:{{...CD,plugins:{{...CD.plugins,legend:{{display:false}},title:{{display:true,text:'Object Classes',color:'#e6edf3',font:{{size:12}}}}}}}}  );
new Chart(document.getElementById('c6'),{{type:'bar',data:{{labels:{actlbl},datasets:[{{label:'Frames',data:{actval},backgroundColor:'rgba(96,165,250,.5)',borderColor:'#60a5fa',borderWidth:1}}]}},options:{{...CD,plugins:{{...CD.plugins,legend:{{display:false}},title:{{display:true,text:'Actions',color:'#e6edf3',font:{{size:12}}}}}}}}  );
</script></body></html>"""
        out.write_text(html, encoding="utf-8")
        print(f"    Report: {out.name} ({out.stat().st_size//1024}KB)")
        return out


# ══════════════════════════════════════════════════════════════════════════════
# Combined Report
# ══════════════════════════════════════════════════════════════════════════════

def _write_combined_report(results: list):
    out=OUTPUT_DIR/"DETECTRA_AI_COMBINED_REPORT.html"
    RC={"normal":"#8b949e","low":"#60a5fa","medium":"#fbbf24","high":"#fb923c","critical":"#f87171"}
    cards=""
    for r in results:
        mx=max((fi.anomaly_score for fi in r.fusion_insights),default=0.0)
        risk=FusionEngine._severity(mx); rc=RC.get(risk,"#8b949e")
        rl=r.report_path.name if r.report_path else "#"
        vl=r.labeled_video_path.name if r.labeled_video_path else "#"
        cards+=(f'<div class="card"><div class="ch"><span class="cn">{r.video_name[:38]}</span>'
                f'<span style="color:{rc};font-size:11px;font-weight:700">{risk.upper()}</span></div>'
                f'<div class="cb"><div class="meta">{r.duration_s:.1f}s | {r.width}x{r.height}</div>'
                f'<table class="mt"><tr><td>Unique Persons</td><td><b>{len(r.unique_track_ids)}</b></td></tr>'
                f'<tr><td>Peak Persons</td><td><b>{r.max_persons_in_frame}</b></td></tr>'
                f'<tr><td>Language</td><td><b>{r.detected_language_name or "N/A"}</b></td></tr>'
                f'<tr><td>Logos</td><td><b>{len(r.logo_detections)}</b></td></tr>'
                f'<tr><td>Surv Events</td><td><b style="color:{rc}">{len(r.surveillance_events)}</b></td></tr>'
                f'<tr><td>Max Anomaly</td><td><b style="color:{rc}">{mx:.3f}</b></td></tr></table>'
                f'<div class="sum">{r.summary[:240]}...</div>'
                f'<div class="links"><a href="{rl}">Full Report</a><a href="{vl}">Labeled Video</a></div>'
                f'</div></div>')
    html=(f'<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Detectra AI — Combined</title>'
          f'<style>body{{font-family:-apple-system,sans-serif;background:#0d1117;color:#e6edf3;margin:0;padding:40px}}'
          f'h1{{color:#00e5a0;font-size:30px;font-weight:800}}h2{{color:#8b949e;font-size:14px;margin-top:6px}}'
          f'.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;margin-top:24px}}'
          f'.card{{background:#161b22;border:1px solid #30363d;border-radius:12px;overflow:hidden}}'
          f'.ch{{padding:14px 20px;background:#1f2937;border-bottom:1px solid #30363d;display:flex;justify-content:space-between;align-items:center}}'
          f'.cn{{font-weight:600;font-size:14px;color:#00e5a0}}.cb{{padding:16px 20px}}.meta{{font-size:12px;color:#6e7681;margin-bottom:12px}}'
          f'.mt{{width:100%;border-collapse:collapse;font-size:12px;margin-bottom:12px}}.mt td{{padding:5px 4px;border-bottom:1px solid #21262d}}.mt td:first-child{{color:#8b949e}}'
          f'.sum{{font-size:12px;color:#6e7681;margin:10px 0;line-height:1.6}}'
          f'.links{{display:flex;gap:10px;margin-top:14px}}.links a{{font-size:12px;color:#00e5a0;text-decoration:none;padding:7px 14px;border:1px solid rgba(0,229,160,.3);border-radius:8px}}'
          f'.footer{{text-align:center;color:#6e7681;font-size:12px;margin-top:48px;padding-top:24px;border-top:1px solid #30363d}}'
          f'</style></head><body><h1>Detectra AI v3.0</h1>'
          f'<h2>Combined — {len(results)} Videos | YOLOv8s-Seg + Pose + Whisper-Small</h2>'
          f'<div class="grid">{cards}</div>'
          f'<div class="footer">Detectra AI v3.0 &mdash; UCP FYP F25AI009 &mdash; {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</div>'
          f'</body></html>')
    out.write_text(html, encoding="utf-8")
    print(f"  Combined: {out}")


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def _print_summary(a: VideoAnalysis):
    mx=max((fi.anomaly_score for fi in a.fusion_insights),default=0.0)
    risk=FusionEngine._severity(mx)
    alerts=sum(1 for fi in a.fusion_insights if fi.alert)
    print(f"\n  {'━'*64}\n  RESULTS: {a.video_name}\n  {'━'*64}")
    print(f"  Duration      : {a.duration_s:.1f}s")
    print(f"  Unique Persons: {len(a.unique_track_ids)}")
    print(f"  Peak Persons  : {a.max_persons_in_frame} at t={a.peak_activity_ts:.1f}s")
    print(f"  Object Classes: {list(a.class_frequencies.keys())[:8]}")
    print(f"  Top Actions   : {list(a.action_frequencies.keys())[:6]}")
    print(f"  Speech Segs   : {len(a.speech_segments)} ({a.detected_language_name or 'none'})")
    print(f"  Logo Detect   : {len(a.logo_detections)}")
    print(f"  Surv Events   : {len(a.surveillance_events)}")
    print(f"  Fusion Risk   : {risk.upper()} (max={mx:.3f}, alerts={alerts})")
    print(f"  Process Time  : {a.processing_time_s:.1f}s")
    print(f"  {'━'*64}")
    if a.full_transcript:
        print(f"\n  TRANSCRIPT:\n{a.full_transcript[:500]}")


def main():
    parser=argparse.ArgumentParser(description="Detectra AI v3.0")
    parser.add_argument("--video", type=str)
    parser.add_argument("--all", action="store_true", default=True)
    args=parser.parse_args()
    analyzer=DetectraAnalyzer()
    if args.video:
        videos=[Path(args.video)]
    else:
        td=SCRIPT_DIR.parent/"test videos"
        if not td.exists(): td=SCRIPT_DIR/"test videos"
        videos=sorted(td.glob("*.mp4"))+sorted(td.glob("*.avi"))+sorted(td.glob("*.mov"))
    if not videos: print("No videos found"); sys.exit(1)
    print(f"\n  Found {len(videos)} video(s):\n")
    for v in videos: print(f"    * {v.name} ({v.stat().st_size//1024}KB)")
    results=[]
    for i,vp in enumerate(videos):
        print(f"\n{'='*70}\n  Video {i+1}/{len(videos)}: {vp.name}\n{'='*70}")
        try:
            r=analyzer.analyze(vp); results.append(r); _print_summary(r)
        except Exception as e:
            print(f"  [ERROR] {vp.name}: {e}"); traceback.print_exc()
    if len(results)>1: _write_combined_report(results)
    print(f"\n{'='*70}\n  COMPLETE — {len(results)}/{len(videos)} | output: {OUTPUT_DIR}\n{'='*70}\n")


if __name__=="__main__":
    main()
'''

target = pathlib.Path("f:/working/New FYP Ahmad Using Antigravity and Claude/detectra-ai/analyze_videos.py")
current = target.read_text(encoding="utf-8")
target.write_text(current + ADDITION, encoding="utf-8")
print(f"Done. File is now {len(current + ADDITION)} chars")
