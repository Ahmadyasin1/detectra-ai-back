"use client";

import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import useSWR from "swr";
import { ArrowLeft, Shield, AlertTriangle } from "lucide-react";
import { fetcher } from "@/lib/api";
import type { FullAnalysisResults } from "@/lib/types";
import { SEVERITY_BG } from "@/lib/types";
import TimelineViewer from "@/components/TimelineViewer";
import DetectionChart from "@/components/DetectionChart";
import ExportButtons from "@/components/ExportButtons";
import SurveillancePanel from "@/components/SurveillancePanel";
import { cn } from "@/lib/utils";

const RISK_COLORS: Record<string, string> = {
  normal:   "text-emerald-400",
  low:      "text-yellow-400",
  medium:   "text-orange-400",
  high:     "text-red-400",
  critical: "text-red-300",
};

export default function TimelinePage() {
  const { videoId } = useParams<{ videoId: string }>();
  const searchParams = useSearchParams();
  const jobId = searchParams.get("job");

  const { data: results, isLoading } = useSWR<FullAnalysisResults>(
    jobId ? `/results/job/${jobId}` : null,
    fetcher
  );

  if (!jobId) return <div className="text-slate-400 p-8">No analysis job specified.</div>;

  const hasSurveillance = results?.surveillance_summary && results.surveillance_summary.total_anomaly_events > 0;
  const overallRisk = results?.surveillance_summary?.overall_risk || "normal";
  const alertCount = results?.summary_stats?.alerts_triggered || 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/${videoId}`}
            className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-200 text-sm mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Video
          </Link>
          <h1 className="text-2xl font-bold text-white">Timeline Report</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            Job #{jobId} · Multimodal Analysis Results
            {results && (
              <span className="ml-2">
                · Risk:{" "}
                <span className={cn("font-semibold capitalize", RISK_COLORS[overallRisk])}>
                  {overallRisk}
                </span>
              </span>
            )}
          </p>
        </div>
        {results && <ExportButtons jobId={parseInt(jobId)} />}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : !results ? (
        <div className="card p-16 text-center text-slate-400">Results not found.</div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
            {[
              { label: "Objects",   value: results.summary_stats.total_object_detections },
              { label: "Logos",     value: results.summary_stats.total_logo_detections },
              { label: "Actions",   value: results.summary_stats.total_action_segments },
              { label: "Speech",    value: results.summary_stats.total_speech_segments },
              { label: "Audio",     value: results.summary_stats.total_audio_events },
              { label: "Insights",  value: results.summary_stats.total_fused_insights },
              { label: "Anomalies", value: results.summary_stats.total_anomaly_events || 0 },
              { label: "Alerts",    value: alertCount, highlight: alertCount > 0 },
            ].map(({ label, value, highlight }) => (
              <div key={label} className={cn("card p-4 text-center", highlight && "border-red-500/30 bg-red-500/5")}>
                <div className={cn("text-2xl font-bold", highlight ? "text-red-400" : "text-white")}>{value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Surveillance Alert Banner */}
          {alertCount > 0 && (
            <div className="card p-4 border-red-500/30 bg-red-500/5 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-300 font-semibold text-sm">
                  {alertCount} surveillance alert{alertCount !== 1 ? "s" : ""} triggered
                </p>
                <p className="text-slate-400 text-xs mt-0.5">
                  Review the Surveillance Analysis section below for detailed alert information.
                </p>
              </div>
            </div>
          )}

          {/* Charts */}
          <DetectionChart results={results} />

          {/* Interactive Timeline */}
          <TimelineViewer results={results} jobId={parseInt(jobId)} />

          {/* Surveillance Analysis */}
          {hasSurveillance && results.surveillance_summary && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-400" />
                Surveillance Analysis
              </h2>
              <SurveillancePanel
                surveillance={results.surveillance_summary}
                anomalyEvents={results.anomaly_events || []}
              />
            </div>
          )}

          {/* Unique Entities */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                title: "Objects Detected",
                items: results.summary_stats.unique_objects,
                color: "bg-indigo-500/20 text-indigo-400 border-indigo-500/20",
              },
              {
                title: "Logos Detected",
                items: results.summary_stats.unique_logos,
                color: "bg-amber-500/20 text-amber-400 border-amber-500/20",
              },
              {
                title: "Actions Detected",
                items: results.summary_stats.unique_actions,
                color: "bg-emerald-500/20 text-emerald-400 border-emerald-500/20",
              },
            ].map(({ title, items, color }) => (
              <div key={title} className="card p-4">
                <h3 className="text-sm font-semibold text-slate-300 mb-3">{title}</h3>
                {items.length === 0 ? (
                  <p className="text-slate-600 text-sm">None detected</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <span key={item} className={`badge border ${color} capitalize`}>
                        {item}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Speech Transcript */}
          {results.speech_segments.length > 0 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-4">Full Speech Transcript</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {results.speech_segments.map((seg) => {
                  const text = (seg.data as { text?: string }).text || "";
                  const lang = (seg.data as { language?: string }).language || "";
                  if (!text) return null;
                  return (
                    <div key={seg.id} className="flex gap-3 text-sm">
                      <span className="text-slate-500 font-mono text-xs flex-shrink-0 pt-0.5">
                        {Math.floor(seg.timestamp_start_s / 60).toString().padStart(2, "0")}:
                        {(seg.timestamp_start_s % 60).toFixed(0).padStart(2, "0")}
                      </span>
                      <p className="text-slate-300 leading-relaxed">{text}</p>
                      {lang && <span className="text-slate-600 text-xs ml-auto">[{lang}]</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
