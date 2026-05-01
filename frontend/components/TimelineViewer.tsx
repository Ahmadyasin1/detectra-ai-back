"use client";

import { useState, useMemo } from "react";
import { formatTimestamp, formatConfidence, cn } from "@/lib/utils";
import type { FullAnalysisResults, Result, Modality, AnomalySeverity } from "@/lib/types";
import { MODALITY_COLORS, MODALITY_LABELS, SEVERITY_COLORS, SEVERITY_BG } from "@/lib/types";

interface Props {
  results: FullAnalysisResults;
  jobId: number;
}

const ALL_MODALITIES: Modality[] = ["object", "logo", "motion", "speech", "audio", "fused", "anomaly"];

function getResultsForModality(results: FullAnalysisResults, m: Modality): Result[] {
  switch (m) {
    case "object":  return results.object_detections;
    case "logo":    return results.logo_detections;
    case "motion":  return results.motion_detections;
    case "speech":  return results.speech_segments;
    case "audio":   return results.audio_events;
    case "fused":   return results.fused_insights;
    case "anomaly": return results.anomaly_events || [];
  }
}

function getLabel(result: Result): string {
  const d = result.data as Record<string, unknown>;
  if (result.modality === "object") {
    const dets = (d.detections as Array<{ class_name: string }>) || [];
    return dets.map((x) => x.class_name).slice(0, 2).join(", ") || "Object";
  }
  if (result.modality === "logo") {
    const dets = (d.detections as Array<{ brand: string }>) || [];
    return dets.map((x) => x.brand).slice(0, 2).join(", ") || "Logo";
  }
  if (result.modality === "motion")  return (d.action as string) || "Action";
  if (result.modality === "speech")  return `"${((d.text as string) || "").slice(0, 40)}"`;
  if (result.modality === "audio")   return (d.event_class as string) || "Audio";
  if (result.modality === "fused")   return (d.scene_label as string)?.replace(/_/g, " ") || "Insight";
  if (result.modality === "anomaly") {
    const sev = (d.severity as string) || "normal";
    const flags = (d.flags as string[]) || [];
    return `${sev.toUpperCase()}${flags.length ? ` — ${flags[0].replace(/_/g, " ")}` : ""}`;
  }
  return "Event";
}

function getDetail(result: Result): string {
  const d = result.data as Record<string, unknown>;
  if (result.modality === "speech") return (d.text as string) || "";
  if (result.modality === "fused")  return (d.summary as string) || "";
  if (result.modality === "motion") {
    const top3 = (d.top3 as Array<{ action: string; confidence: number }>) || [];
    return top3.map((t) => `${t.action} (${formatConfidence(t.confidence)})`).join(" · ");
  }
  if (result.modality === "anomaly") {
    const flags = ((d.flags as string[]) || []).join(", ").replace(/_/g, " ");
    const score = (d.anomaly_score as number) || 0;
    const persons = (d.persons as number) || 0;
    const parts = [];
    if (score > 0) parts.push(`Score: ${score.toFixed(3)}`);
    if (persons > 0) parts.push(`${persons} person${persons !== 1 ? "s" : ""}`);
    if (flags) parts.push(flags);
    return parts.join(" · ");
  }
  return "";
}

function getBarColor(result: Result): string {
  if (result.modality === "anomaly") {
    const sev = (result.data.severity as AnomalySeverity) || "normal";
    return SEVERITY_COLORS[sev] || MODALITY_COLORS.anomaly;
  }
  return MODALITY_COLORS[result.modality as Modality] || "#6366f1";
}

export default function TimelineViewer({ results, jobId }: Props) {
  const [activeModalities, setActiveModalities] = useState<Set<Modality>>(
    new Set(ALL_MODALITIES.filter((m) => getResultsForModality(results, m).length > 0))
  );
  const [minConf, setMinConf] = useState(0);
  const [selectedResult, setSelectedResult] = useState<Result | null>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const allResults = useMemo(
    () => ALL_MODALITIES.flatMap((m) => getResultsForModality(results, m)),
    [results]
  );

  const maxTime = useMemo(
    () => Math.max(60, ...allResults.map((r) => r.timestamp_end_s)),
    [allResults]
  );

  function toggleModality(m: Modality) {
    setActiveModalities((prev) => {
      const next = new Set(prev);
      next.has(m) ? next.delete(m) : next.add(m);
      return next;
    });
  }

  const filteredByModality = useMemo(
    () =>
      ALL_MODALITIES.filter((m) => activeModalities.has(m)).map((m) => ({
        modality: m,
        results: getResultsForModality(results, m).filter(
          (r) => (r.confidence ?? 1) >= minConf
        ),
      })).filter(({ results: r }) => r.length > 0),
    [results, activeModalities, minConf]
  );

  const availableModalities = useMemo(
    () => ALL_MODALITIES.filter((m) => getResultsForModality(results, m).length > 0),
    [results]
  );

  return (
    <div className="card p-6 space-y-5">
      <h2 className="text-lg font-semibold text-white">Interactive Timeline</h2>

      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center">
        {/* Modality toggles */}
        <div className="flex flex-wrap gap-2">
          {availableModalities.map((m) => (
            <button
              key={m}
              onClick={() => toggleModality(m)}
              className={cn(
                "badge border text-xs font-semibold transition-all",
                activeModalities.has(m)
                  ? "border-transparent text-white"
                  : "bg-transparent border-surface-border text-slate-500"
              )}
              style={
                activeModalities.has(m)
                  ? {
                      backgroundColor: MODALITY_COLORS[m] + "30",
                      borderColor: MODALITY_COLORS[m] + "60",
                      color: MODALITY_COLORS[m],
                    }
                  : {}
              }
            >
              {MODALITY_LABELS[m]}
              <span className="ml-1 opacity-70">
                ({getResultsForModality(results, m).length})
              </span>
            </button>
          ))}
        </div>

        {/* Confidence filter */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-xs text-slate-500">Min conf:</span>
          <input
            type="range" min={0} max={0.9} step={0.05}
            value={minConf}
            onChange={(e) => setMinConf(parseFloat(e.target.value))}
            className="w-24 accent-brand-500"
          />
          <span className="text-xs text-slate-400 w-10">{Math.round(minConf * 100)}%</span>
        </div>
      </div>

      {/* Timeline scrubber */}
      <div className="relative">
        <input
          type="range" min={0} max={maxTime} step={0.1}
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="w-full accent-brand-500"
        />
        <div className="flex justify-between text-xs text-slate-600 mt-1">
          <span>{formatTimestamp(0)}</span>
          <span className="text-brand-400 font-mono">{formatTimestamp(currentTime)}</span>
          <span>{formatTimestamp(maxTime)}</span>
        </div>
      </div>

      {/* Swim lanes */}
      <div className="overflow-x-auto">
        <div className="min-w-[600px]">
          {filteredByModality.map(({ modality, results: mResults }) => {
            const baseColor = MODALITY_COLORS[modality];
            return (
              <div key={modality} className="flex items-center gap-3 mb-2">
                <div
                  className="w-20 flex-shrink-0 text-xs font-medium text-right"
                  style={{ color: baseColor }}
                >
                  {MODALITY_LABELS[modality]}
                </div>
                <div className="flex-1 swim-lane relative bg-surface rounded overflow-hidden">
                  {mResults.map((r) => {
                    const leftPct = (r.timestamp_start_s / maxTime) * 100;
                    const widthPct = Math.max(
                      0.5,
                      ((r.timestamp_end_s - r.timestamp_start_s) / maxTime) * 100
                    );
                    const barColor = getBarColor(r);
                    const isAlert = modality === "anomaly" && (r.data as { alert?: boolean }).alert;
                    return (
                      <button
                        key={r.id}
                        onClick={() => { setSelectedResult(r); setCurrentTime(r.timestamp_start_s); }}
                        title={getLabel(r)}
                        className={cn(
                          "absolute top-1 h-8 rounded cursor-pointer transition-all border",
                          "hover:brightness-125",
                          isAlert && "ring-1 ring-red-400/60"
                        )}
                        style={{
                          left: `${leftPct}%`,
                          width: `${widthPct}%`,
                          minWidth: "4px",
                          backgroundColor: barColor + "50",
                          borderColor: barColor + "80",
                        }}
                      />
                    );
                  })}
                  {/* Current time indicator */}
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white/40 pointer-events-none"
                    style={{ left: `${(currentTime / maxTime) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      {selectedResult && (
        <div className="mt-4 p-4 bg-surface rounded-xl border border-surface-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <span
                className="badge text-xs mb-2"
                style={{
                  backgroundColor: MODALITY_COLORS[selectedResult.modality as Modality] + "20",
                  color: MODALITY_COLORS[selectedResult.modality as Modality],
                }}
              >
                {MODALITY_LABELS[selectedResult.modality as Modality]}
              </span>
              {selectedResult.modality === "anomaly" && (
                <span className={cn(
                  "badge border text-xs ml-2",
                  SEVERITY_BG[(selectedResult.data.severity as AnomalySeverity) || "normal"]
                )}>
                  {((selectedResult.data.severity as string) || "normal").toUpperCase()}
                </span>
              )}
              <h3 className="text-base font-semibold text-white mt-1">{getLabel(selectedResult)}</h3>
              <p className="text-slate-400 text-sm mt-1">
                {formatTimestamp(selectedResult.timestamp_start_s)} → {formatTimestamp(selectedResult.timestamp_end_s)}
                {selectedResult.confidence !== null && (
                  <span className="ml-3 text-slate-500">Confidence: {formatConfidence(selectedResult.confidence)}</span>
                )}
              </p>
              {getDetail(selectedResult) && (
                <p className="text-slate-300 text-sm mt-2 leading-relaxed">{getDetail(selectedResult)}</p>
              )}
            </div>
            <button
              onClick={() => setSelectedResult(null)}
              className="text-slate-500 hover:text-slate-300 text-lg flex-shrink-0"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {allResults.length === 0 && (
        <div className="text-center text-slate-500 py-10">
          No results available for the selected filters.
        </div>
      )}
    </div>
  );
}
