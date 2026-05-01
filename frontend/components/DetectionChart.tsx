"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  LineChart, Line, ReferenceLine, Area, AreaChart,
} from "recharts";
import type { FullAnalysisResults } from "@/lib/types";
import { MODALITY_COLORS, SEVERITY_COLORS } from "@/lib/types";

interface Props {
  results: FullAnalysisResults;
}

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ec4899", "#8b5cf6"];

const tooltipStyle = {
  backgroundColor: "#1e293b",
  border: "1px solid #334155",
  borderRadius: "8px",
  color: "#f1f5f9",
  fontSize: "12px",
};

export default function DetectionChart({ results }: Props) {
  // ── Modality summary bar ──────────────────────────────────────────────────
  const modalityData = [
    { name: "Objects",  count: results.summary_stats.total_object_detections,  fill: MODALITY_COLORS.object },
    { name: "Logos",    count: results.summary_stats.total_logo_detections,    fill: MODALITY_COLORS.logo },
    { name: "Actions",  count: results.summary_stats.total_action_segments,    fill: MODALITY_COLORS.motion },
    { name: "Speech",   count: results.summary_stats.total_speech_segments,    fill: MODALITY_COLORS.speech },
    { name: "Audio",    count: results.summary_stats.total_audio_events,       fill: MODALITY_COLORS.audio },
    { name: "Insights", count: results.summary_stats.total_fused_insights,     fill: MODALITY_COLORS.fused },
    { name: "Anomalies",count: results.summary_stats.total_anomaly_events || 0, fill: MODALITY_COLORS.anomaly },
  ].filter((d) => d.count > 0);

  // ── Object class pie ──────────────────────────────────────────────────────
  const objClassCounts: Record<string, number> = {};
  for (const r of results.object_detections) {
    const dets = (r.data as { detections?: Array<{ class_name: string }> }).detections || [];
    for (const d of dets) {
      objClassCounts[d.class_name] = (objClassCounts[d.class_name] || 0) + 1;
    }
  }
  const objPieData = Object.entries(objClassCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // ── Fusion anomaly & correlation over time ────────────────────────────────
  const fusedTimeData = results.fused_insights.map((r) => ({
    time: parseFloat(r.timestamp_start_s.toFixed(0)),
    anomaly: parseFloat(((r.data as { anomaly_score?: number }).anomaly_score || 0).toFixed(3)),
    correlation: parseFloat(((r.data as { visual_audio_correlation?: number }).visual_audio_correlation || 0).toFixed(3)),
  }));

  // ── Anomaly score over time from surveillance events ─────────────────────
  const anomalyTimeData = (results.anomaly_events || []).map((r) => {
    const severity = (r.data as { severity?: string }).severity || "normal";
    const score = (r.data as { anomaly_score?: number }).anomaly_score || 0;
    const alert = (r.data as { alert?: boolean }).alert || false;
    return {
      time: parseFloat(r.timestamp_start_s.toFixed(1)),
      score: parseFloat(score.toFixed(3)),
      alert: alert ? score : null,
      fill: alert
        ? (SEVERITY_COLORS as Record<string, string>)[severity] || "#ef4444"
        : "#f43f5e30",
    };
  });

  // ── Audio type distribution ───────────────────────────────────────────────
  const audioTypeCounts: Record<string, number> = {};
  for (const r of results.audio_events) {
    const cls = (r.data as { event_class?: string }).event_class || "unknown";
    audioTypeCounts[cls] = (audioTypeCounts[cls] || 0) + 1;
  }
  const audioPieData = Object.entries(audioTypeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name, value }));

  const hasAnomaly = anomalyTimeData.length > 0;
  const hasFused = fusedTimeData.length > 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Modality counts */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Detections by Modality</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={modalityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {modalityData.map((d, i) => (
                <Cell key={i} fill={d.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Object class pie */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Detected Objects</h3>
        {objPieData.length === 0 ? (
          <div className="h-[200px] flex items-center justify-center text-slate-600 text-sm">No objects detected</div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={objPieData} cx="50%" cy="50%" outerRadius={75} dataKey="value" nameKey="name">
                {objPieData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Surveillance anomaly score over time */}
      {hasAnomaly && (
        <div className="card p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Surveillance Anomaly Score Over Time
            <span className="text-slate-500 font-normal ml-2">— red dots indicate triggered alerts</span>
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={anomalyTimeData} margin={{ top: 4, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="anomalyGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis
                dataKey="time"
                tick={{ fill: "#94a3b8", fontSize: 10 }}
                label={{ value: "Time (s)", position: "insideBottom", fill: "#64748b", fontSize: 11 }}
              />
              <YAxis domain={[0, 1]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <ReferenceLine y={0.5} stroke="#f97316" strokeDasharray="4 4" label={{ value: "Alert", fill: "#f97316", fontSize: 10 }} />
              <ReferenceLine y={0.7} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "High", fill: "#ef4444", fontSize: 10 }} />
              <Area type="monotone" dataKey="score" stroke="#f43f5e" strokeWidth={2} fill="url(#anomalyGrad)" name="Anomaly Score" dot={false} />
              <Line type="monotone" dataKey="alert" stroke="#dc2626" strokeWidth={0} dot={{ r: 4, fill: "#dc2626", strokeWidth: 0 }} name="Alert" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Fusion anomaly & correlation over time */}
      {hasFused && (
        <div className={`card p-5 ${hasAnomaly ? "" : "lg:col-span-2"}`}>
          <h3 className="text-sm font-semibold text-slate-300 mb-4">
            Fusion Engine — Anomaly &amp; Visual-Audio Correlation
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={fusedTimeData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="time" tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <YAxis domain={[0, 1]} tick={{ fill: "#94a3b8", fontSize: 10 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#94a3b8" }} />
              <Line type="monotone" dataKey="anomaly" stroke="#f43f5e" strokeWidth={2} dot={false} name="Anomaly Score" />
              <Line type="monotone" dataKey="correlation" stroke="#6366f1" strokeWidth={2} dot={false} name="V-A Correlation" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Audio type pie */}
      {audioPieData.length > 0 && (
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Audio Event Types</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={audioPieData} cx="50%" cy="50%" outerRadius={65} dataKey="value" nameKey="name">
                {audioPieData.map((_, i) => (
                  <Cell key={i} fill={["#ec4899","#8b5cf6","#3b82f6","#10b981","#f59e0b","#f43f5e"][i % 6]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "10px", color: "#94a3b8" }} iconType="circle" iconSize={7} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
