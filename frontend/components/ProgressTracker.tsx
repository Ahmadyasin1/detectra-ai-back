"use client";

import { useEffect, useRef, useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { analysisApi } from "@/lib/api";
import { STAGE_LABELS, ProgressEvent } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  jobId: number;
  onComplete?: () => void;
}

interface ProgressState {
  progress: number;
  stage: string;
  status: string;
}

const PIPELINE_STAGES = [
  { key: "preprocessing",       label: "Preprocessing" },
  { key: "object_detection",    label: "Object Detection" },
  { key: "logo_recognition",    label: "Logo Recognition" },
  { key: "motion_recognition",  label: "Action Recognition" },
  { key: "speech_recognition",  label: "Speech-to-Text" },
  { key: "audio_classification",label: "Audio Events" },
  { key: "multimodal_fusion",   label: "Fusion Engine" },
  { key: "completed",           label: "Complete" },
];

function stageIndex(stage: string): number {
  const base = stage.replace("_complete", "");
  return PIPELINE_STAGES.findIndex((s) => s.key === base || s.key === stage);
}

export default function ProgressTracker({ jobId, onComplete }: Props) {
  const [state, setState] = useState<ProgressState>({
    progress: 0,
    stage: "initializing",
    status: "pending",
  });
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = analysisApi.streamProgress(jobId, (event: ProgressEvent) => {
      setState({ progress: event.progress, stage: event.stage, status: event.status });
      if (event.status === "completed" || event.status === "failed") {
        es.close();
        onComplete?.();
      }
    });
    esRef.current = es;
    return () => { es.close(); };
  }, [jobId, onComplete]);

  const isCompleted = state.status === "completed";
  const isFailed = state.status === "failed";
  const currentStageIdx = stageIndex(state.stage);

  return (
    <div className="card p-6 border-brand-500/20 bg-brand-500/5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center",
          isCompleted ? "bg-emerald-500/20" : isFailed ? "bg-red-500/20" : "bg-brand-500/20"
        )}>
          {isCompleted
            ? <CheckCircle className="w-5 h-5 text-emerald-400" />
            : isFailed
            ? <AlertCircle className="w-5 h-5 text-red-400" />
            : <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />}
        </div>
        <div>
          <h2 className="text-base font-semibold text-white">
            {isCompleted ? "Analysis Complete!" : isFailed ? "Analysis Failed" : "Analyzing Video…"}
          </h2>
          <p className="text-slate-400 text-sm">
            {STAGE_LABELS[state.stage] || state.stage}
          </p>
        </div>
        <div className="ml-auto text-2xl font-bold text-white tabular-nums">
          {Math.round(state.progress)}%
        </div>
      </div>

      {/* Overall progress bar */}
      <div className="h-2 bg-surface-border rounded-full overflow-hidden mb-5">
        <div
          className="progress-fill h-full rounded-full"
          style={{ width: `${state.progress}%` }}
        />
      </div>

      {/* Stage indicators */}
      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isDone = currentStageIdx > idx || isCompleted;
          const isActive = !isCompleted && currentStageIdx === idx;
          return (
            <div key={stage.key} className="text-center">
              <div className={cn(
                "w-8 h-8 rounded-full mx-auto flex items-center justify-center mb-1 text-xs font-bold transition-all",
                isDone  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                isActive ? "bg-brand-500/30 text-brand-400 border border-brand-500/40 ring-2 ring-brand-500/20" :
                           "bg-surface text-slate-600 border border-surface-border"
              )}>
                {isDone ? <CheckCircle className="w-3.5 h-3.5" /> : idx + 1}
              </div>
              <p className={cn(
                "text-[10px] leading-tight",
                isDone ? "text-emerald-500" : isActive ? "text-brand-400" : "text-slate-600"
              )}>
                {stage.label}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
