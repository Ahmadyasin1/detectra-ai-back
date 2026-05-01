"use client";

import { useMemo } from "react";
import {
  Shield, ShieldAlert, ShieldCheck, AlertTriangle, Clock,
  Users, Car, Eye, Activity, TrendingUp,
} from "lucide-react";
import type { SurveillanceSummary, AnomalySeverity, Result } from "@/lib/types";
import { SEVERITY_BG, SEVERITY_COLORS } from "@/lib/types";
import { formatTimestamp, cn } from "@/lib/utils";

interface Props {
  surveillance: SurveillanceSummary;
  anomalyEvents: Result[];
}

const RISK_CONFIG: Record<string, { icon: typeof Shield; bg: string; border: string; text: string; label: string }> = {
  normal:   { icon: ShieldCheck,  bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Normal" },
  low:      { icon: Shield,       bg: "bg-yellow-500/10",  border: "border-yellow-500/20",  text: "text-yellow-400",  label: "Low Risk" },
  medium:   { icon: ShieldAlert,  bg: "bg-orange-500/10",  border: "border-orange-500/20",  text: "text-orange-400",  label: "Medium Risk" },
  high:     { icon: ShieldAlert,  bg: "bg-red-500/10",     border: "border-red-500/20",     text: "text-red-400",     label: "High Risk" },
  critical: { icon: ShieldAlert,  bg: "bg-red-600/20",     border: "border-red-600/30",     text: "text-red-300",     label: "CRITICAL" },
};

function RiskMeter({ score }: { score: number }) {
  const pct = Math.min(100, Math.round(score * 100));
  const color = score < 0.2 ? "#10b981" : score < 0.5 ? "#eab308" : score < 0.7 ? "#f97316" : "#ef4444";
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-slate-400">
        <span>Max Anomaly Score</span>
        <span className="font-mono font-semibold" style={{ color }}>{score.toFixed(3)}</span>
      </div>
      <div className="h-2 bg-surface rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-600">
        <span>Safe</span>
        <span>Moderate</span>
        <span>Critical</span>
      </div>
    </div>
  );
}

export default function SurveillancePanel({ surveillance, anomalyEvents }: Props) {
  const risk = RISK_CONFIG[surveillance.overall_risk] || RISK_CONFIG.normal;
  const RiskIcon = risk.icon;

  const alertEvents = useMemo(
    () => anomalyEvents.filter((r) => r.data.alert).slice(0, 20),
    [anomalyEvents]
  );

  const severityOrder: Record<string, number> = { normal: 0, low: 1, medium: 2, high: 3, critical: 4 };
  const topAlerts = useMemo(
    () => [...alertEvents].sort((a, b) =>
      (severityOrder[b.data.severity as string] || 0) - (severityOrder[a.data.severity as string] || 0)
    ).slice(0, 8),
    [alertEvents]
  );

  const anomalyTypesEntries = Object.entries(surveillance.anomaly_types || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Risk Level Header */}
      <div className={cn("card p-5 border", risk.border, risk.bg)}>
        <div className="flex items-start gap-4">
          <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0", risk.bg, "border", risk.border)}>
            <RiskIcon className={cn("w-6 h-6", risk.text)} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className={cn("text-lg font-bold", risk.text)}>{risk.label}</h2>
              <span className={cn("badge border text-xs", SEVERITY_BG[surveillance.overall_risk as AnomalySeverity])}>
                {surveillance.alert_count} alert{surveillance.alert_count !== 1 ? "s" : ""}
              </span>
            </div>
            {surveillance.video_narrative && (
              <p className="text-slate-300 text-sm leading-relaxed">{surveillance.video_narrative}</p>
            )}
          </div>
        </div>

        <div className="mt-4">
          <RiskMeter score={surveillance.max_anomaly_score} />
        </div>
      </div>

      {/* Stat Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: AlertTriangle, label: "Total Anomaly Events", value: surveillance.total_anomaly_events, color: "text-orange-400" },
          { icon: ShieldAlert,   label: "High/Critical Alerts", value: surveillance.alert_count,          color: "text-red-400" },
          { icon: Users,         label: "Person-Seconds",       value: `${surveillance.person_present_seconds}s`,  color: "text-blue-400" },
          { icon: Car,           label: "Vehicle-Seconds",      value: `${surveillance.vehicle_present_seconds}s`, color: "text-indigo-400" },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="card p-4">
            <Icon className={cn("w-5 h-5 mb-2", color)} />
            <div className="text-xl font-bold text-white">{value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert Event Feed */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-400" />
            Alert Events
            {topAlerts.length === 0 && <span className="text-slate-500 font-normal">(none detected)</span>}
          </h3>
          {topAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-emerald-400 text-sm py-4">
              <ShieldCheck className="w-4 h-4" />
              No alerts triggered — video appears normal
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {topAlerts.map((evt, i) => {
                const sev = (evt.data.severity as AnomalySeverity) || "normal";
                const flags = (evt.data.flags as string[]) || [];
                const action = evt.data.action as string;
                return (
                  <div key={i} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-surface border border-surface-border">
                    <div className={cn("mt-0.5 w-2 h-2 rounded-full flex-shrink-0")}
                      style={{ backgroundColor: SEVERITY_COLORS[sev] }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn("badge border text-[10px]", SEVERITY_BG[sev])}>{sev.toUpperCase()}</span>
                        <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {formatTimestamp(evt.timestamp_start_s)}
                        </span>
                      </div>
                      <div className="text-xs text-slate-300 mt-1 flex flex-wrap gap-1">
                        {action && action !== "unknown" && (
                          <span className="bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded text-[10px]">{action}</span>
                        )}
                        {flags.slice(0, 3).map((f) => (
                          <span key={f} className="bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded text-[10px]">{f.replace(/_/g, " ")}</span>
                        ))}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-mono font-semibold" style={{ color: SEVERITY_COLORS[sev] }}>
                        {typeof evt.data.anomaly_score === "number" ? evt.data.anomaly_score.toFixed(2) : "—"}
                      </div>
                      <div className="text-[10px] text-slate-600">score</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Anomaly Type Breakdown */}
        <div className="card p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-orange-400" />
            Anomaly Type Breakdown
          </h3>
          {anomalyTypesEntries.length === 0 ? (
            <p className="text-slate-600 text-sm">No anomaly types recorded</p>
          ) : (
            <div className="space-y-2.5">
              {anomalyTypesEntries.map(([type, count]) => {
                const maxCount = anomalyTypesEntries[0]?.[1] || 1;
                const pct = Math.round((count / maxCount) * 100);
                return (
                  <div key={type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-300 capitalize">{type.replace(/_/g, " ")}</span>
                      <span className="text-slate-500 font-mono">{count}</span>
                    </div>
                    <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Scene context */}
          {surveillance.dominant_scene && (
            <div className="pt-3 border-t border-surface-border">
              <div className="flex items-center gap-2 text-xs">
                <Eye className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-slate-500">Dominant scene:</span>
                <span className="text-slate-300 font-medium capitalize">
                  {surveillance.dominant_scene.replace(/_/g, " ")}
                </span>
              </div>
              {surveillance.highest_risk_timestamp !== null && (
                <div className="flex items-center gap-2 text-xs mt-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-slate-500">Highest risk at:</span>
                  <span className="text-red-400 font-mono">
                    {formatTimestamp(surveillance.highest_risk_timestamp)}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
