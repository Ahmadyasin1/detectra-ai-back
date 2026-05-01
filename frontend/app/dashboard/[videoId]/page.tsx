"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import toast from "react-hot-toast";
import {
  ArrowLeft, Play, Settings2, ChevronRight, AlertCircle,
  CheckCircle, Loader2, Clock, BarChart3,
} from "lucide-react";
import { videosApi, analysisApi, fetcher } from "@/lib/api";
import { formatBytes, formatDuration, formatDate, cn } from "@/lib/utils";
import type { Video, AnalysisJob, AnalysisConfig } from "@/lib/types";
import ProgressTracker from "@/components/ProgressTracker";

const DEFAULT_CONFIG: AnalysisConfig = {
  enable_object_detection: true,
  enable_logo_recognition: true,
  enable_motion_recognition: true,
  enable_speech_to_text: true,
  enable_audio_classification: true,
  enable_fusion: true,
  frame_extraction_fps: 1.0,
};

const CONFIG_LABELS: Array<{ key: keyof AnalysisConfig; label: string; desc: string }> = [
  { key: "enable_object_detection",   label: "Object Detection",    desc: "YOLOv8n on 80 COCO classes" },
  { key: "enable_logo_recognition",   label: "Logo Recognition",    desc: "Custom ViT on OpenLogos-32" },
  { key: "enable_motion_recognition", label: "Action Recognition",  desc: "VideoMAE on UCF-101" },
  { key: "enable_speech_to_text",     label: "Speech-to-Text",      desc: "Whisper base auto-language" },
  { key: "enable_audio_classification",label: "Audio Events",       desc: "YAMNet 521 AudioSet classes" },
  { key: "enable_fusion",             label: "Multimodal Fusion",   desc: "Cross-modal transformer" },
];

export default function VideoDetailPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const router = useRouter();
  const id = parseInt(videoId);

  const { data: video, isLoading: loadingVideo } = useSWR<Video>(
    `/videos/${id}`, fetcher, { refreshInterval: 5000 }
  );

  const { data: jobs, mutate: mutateJobs } = useSWR<AnalysisJob[]>(
    `/analysis/video/${id}/jobs`, fetcher, { refreshInterval: 5000 }
  );

  const [config, setConfig] = useState<AnalysisConfig>(DEFAULT_CONFIG);
  const [launching, setLaunching] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [activeJobId, setActiveJobId] = useState<number | null>(null);
  const [showConfig, setShowConfig] = useState(false);

  const latestJob = jobs?.[0];
  const isRunning = latestJob?.status === "running" || latestJob?.status === "pending";
  const isCompleted = latestJob?.status === "completed";

  useEffect(() => {
    if (latestJob?.status === "running" || latestJob?.status === "pending") {
      setActiveJobId(latestJob.job_id);
    }
  }, [latestJob]);

  async function cancelAnalysis() {
    if (!latestJob) return;
    setCancelling(true);
    try {
      await analysisApi.cancel(latestJob.job_id);
      toast.success("Analysis cancelled");
      setActiveJobId(null);
      mutateJobs();
    } catch {
      toast.error("Failed to cancel analysis");
    } finally {
      setCancelling(false);
    }
  }

  async function startAnalysis() {
    setLaunching(true);
    try {
      const job = await analysisApi.start(id, config);
      setActiveJobId(job.job_id);
      toast.success("Analysis started!");
      mutateJobs();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      toast.error(msg || "Failed to start analysis");
    } finally {
      setLaunching(false);
    }
  }

  if (loadingVideo) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="skeleton h-8 w-48" />
        <div className="skeleton h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!video) return <div className="text-slate-400">Video not found.</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back */}
      <Link href="/dashboard" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </Link>

      {/* Video card */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row gap-6">
          {/* Thumbnail */}
          <div className="w-full sm:w-56 h-36 bg-surface rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
            {video.thumbnail_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={videosApi.thumbnailUrl(video.id)} alt={video.original_filename} className="w-full h-full object-cover" />
            ) : (
              <Play className="w-10 h-10 text-slate-600" />
            )}
          </div>
          {/* Meta */}
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white mb-3 break-all">{video.original_filename}</h1>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              {[
                ["Size", formatBytes(video.file_size_bytes)],
                ["Duration", video.duration_seconds ? formatDuration(video.duration_seconds) : "—"],
                ["Resolution", video.width ? `${video.width}×${video.height}` : "—"],
                ["FPS", video.fps ? `${video.fps.toFixed(1)}` : "—"],
                ["Status", video.status],
                ["Uploaded", formatDate(video.created_at)],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-slate-500">{label}</p>
                  <p className="text-slate-200 font-medium capitalize">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Active job progress */}
      {activeJobId && (isRunning || latestJob?.status === "pending") && (
        <div className="space-y-3">
          <ProgressTracker
            jobId={activeJobId}
            onComplete={() => { mutateJobs(); setActiveJobId(null); }}
          />
          <div className="flex justify-end">
            <button
              onClick={cancelAnalysis}
              disabled={cancelling}
              className="btn-ghost text-sm text-red-400 hover:text-red-300 flex items-center gap-2"
            >
              {cancelling
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <AlertCircle className="w-4 h-4" />}
              {cancelling ? "Cancelling…" : "Cancel Analysis"}
            </button>
          </div>
        </div>
      )}

      {/* Completed result links */}
      {isCompleted && latestJob && (
        <div className="card p-6 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-semibold text-white">Analysis Complete</h2>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Completed {formatDate(latestJob.completed_at || latestJob.created_at)} · Job #{latestJob.job_id}
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/dashboard/${id}/timeline?job=${latestJob.job_id}`}
              className="btn-primary flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              View Timeline Report
            </Link>
          </div>
        </div>
      )}

      {/* Start Analysis */}
      {!isRunning && !isCompleted && (
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Start Analysis</h2>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className="btn-ghost text-sm flex items-center gap-1.5"
            >
              <Settings2 className="w-4 h-4" />
              Configure
              <ChevronRight className={cn("w-4 h-4 transition-transform", showConfig && "rotate-90")} />
            </button>
          </div>

          {showConfig && (
            <div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {CONFIG_LABELS.map(({ key, label, desc }) => (
                <label key={key} className="flex items-start gap-3 p-3 rounded-lg bg-surface cursor-pointer hover:bg-white/5 transition-colors">
                  <input
                    type="checkbox"
                    checked={config[key] as boolean}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.checked })}
                    className="mt-0.5 accent-brand-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">{label}</p>
                    <p className="text-xs text-slate-500">{desc}</p>
                  </div>
                </label>
              ))}
              <div className="sm:col-span-2 p-3 rounded-lg bg-surface">
                <label className="text-sm font-medium text-slate-200">
                  Frame Extraction Rate: {config.frame_extraction_fps} FPS
                </label>
                <input
                  type="range"
                  min={0.1} max={5} step={0.1}
                  value={config.frame_extraction_fps}
                  onChange={(e) => setConfig({ ...config, frame_extraction_fps: parseFloat(e.target.value) })}
                  className="w-full mt-2 accent-brand-500"
                />
                <p className="text-xs text-slate-500 mt-1">Higher = more detail, slower processing</p>
              </div>
            </div>
          )}

          <button
            onClick={startAnalysis}
            disabled={launching}
            className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center"
          >
            {launching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {launching ? "Launching..." : "Start Multimodal Analysis"}
          </button>
        </div>
      )}

      {/* Previous jobs */}
      {jobs && jobs.length > 0 && (
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Analysis History</h2>
          <div className="space-y-2">
            {jobs.map((job) => (
              <div key={job.job_id} className="flex items-center justify-between p-3 rounded-lg bg-surface">
                <div className="flex items-center gap-3">
                  {job.status === "completed" && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                  {job.status === "failed" && <AlertCircle className="w-4 h-4 text-red-400" />}
                  {(job.status === "running" || job.status === "pending") && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
                  <div>
                    <p className="text-sm font-medium text-slate-200">Job #{job.job_id}</p>
                    <p className="text-xs text-slate-500">{formatDate(job.created_at)}</p>
                  </div>
                </div>
                {job.status === "completed" && (
                  <Link href={`/dashboard/${id}/timeline?job=${job.job_id}`} className="text-brand-400 text-sm hover:underline">
                    View →
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
