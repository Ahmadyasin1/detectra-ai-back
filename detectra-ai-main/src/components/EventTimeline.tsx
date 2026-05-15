import { useState, useRef, useCallback } from 'react';
import {
  SurveillanceEvent, SpeechSegment, FusionInsight,
  severityHex, anomalyColor, fmtSeconds,
} from '../lib/detectraApi';

interface TooltipData {
  x: number;
  y: number;
  content: string;
  color: string;
}

interface EventTimelineProps {
  duration:           number;
  surveillanceEvents: SurveillanceEvent[];
  speechSegments:     SpeechSegment[];
  fusionInsights:     FusionInsight[];
  anomalyTimeline:    number[];
}

const LANE_H    = 18;   // height of each swim-lane row
const LABEL_W   = 72;   // left label column width
const PADDING   = 8;    // vertical padding around lanes
const TICK_H    = 20;   // time-axis tick row height
const TOTAL_H   = PADDING + TICK_H + LANE_H * 3 + LANE_H + PADDING; // axis+fusion+events+speech+audio

export default function EventTimeline({
  duration,
  surveillanceEvents,
  speechSegments,
  fusionInsights,
  anomalyTimeline,
}: EventTimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const [hoverT, setHoverT] = useState<number | null>(null);

  const toX = useCallback(
    (t: number, totalW: number) =>
      LABEL_W + (Math.max(0, Math.min(t, duration)) / Math.max(duration, 1)) * (totalW - LABEL_W),
    [duration]
  );

  // Y positions for each lane (top of lane)
  const Y_AXIS    = PADDING;
  const Y_FUSION  = Y_AXIS + TICK_H;
  const Y_EVENTS  = Y_FUSION + LANE_H;
  const Y_SPEECH  = Y_EVENTS + LANE_H;
  const Y_AUDIO   = Y_SPEECH + LANE_H;

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect();
      if (!rect) return;
      const totalW = rect.width;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const t = ((mx - LABEL_W) / (totalW - LABEL_W)) * duration;
      setHoverT(Math.max(0, Math.min(t, duration)));

      // Tooltip detection
      const hit = (ts: number, slack = 6): boolean => Math.abs(toX(ts, totalW) - mx) < slack;

      for (const ev of surveillanceEvents) {
        if (hit(ev.timestamp_s, 8)) {
          setTooltip({
            x: mx, y: my,
            content: `${fmtSeconds(ev.timestamp_s)}: ${ev.description}`,
            color: severityHex(ev.severity),
          });
          return;
        }
      }
      for (const seg of speechSegments.filter(s => !s.is_noise)) {
        const x1 = toX(seg.start_s, totalW);
        const x2 = toX(seg.end_s, totalW);
        if (mx >= x1 - 2 && mx <= x2 + 2 && my >= Y_SPEECH && my <= Y_SPEECH + LANE_H) {
          setTooltip({
            x: mx, y: my,
            content: `${fmtSeconds(seg.start_s)}-${fmtSeconds(seg.end_s)}: "${seg.text.slice(0, 60)}${seg.text.length > 60 ? '…' : ''}"`,
            color: '#4ade80',
          });
          return;
        }
      }
      for (const ins of fusionInsights) {
        const x1 = toX(ins.window_start_s, totalW);
        const x2 = toX(ins.window_end_s, totalW);
        if (mx >= x1 && mx <= x2 && my >= Y_FUSION && my <= Y_FUSION + LANE_H) {
          setTooltip({
            x: mx, y: my,
            content: `${fmtSeconds(ins.window_start_s)}: ${ins.scene_label} (anomaly ${ins.anomaly_score.toFixed(2)})`,
            color: anomalyColor(ins.anomaly_score),
          });
          return;
        }
      }
      setTooltip(null);
    },
    [duration, surveillanceEvents, speechSegments, fusionInsights, toX, Y_FUSION, Y_SPEECH]
  );

  // Time tick marks
  const tickCount = Math.min(12, Math.floor(duration / 10) + 1);
  const tickStep  = duration / Math.max(tickCount - 1, 1);

  return (
    <div className="relative w-full select-none">
      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mb-3 text-xs text-gray-500">
        {[
          { color: '#ef4444', label: 'Critical event' },
          { color: '#f97316', label: 'High event' },
          { color: '#eab308', label: 'Medium event' },
          { color: '#4ade80', label: 'Speech' },
          { color: '#22d3ee', label: 'Fusion window' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color, opacity: 0.8 }} />
            {label}
          </div>
        ))}
      </div>

      <svg
        ref={svgRef}
        className="w-full rounded-xl overflow-visible cursor-crosshair"
        style={{ height: TOTAL_H }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setTooltip(null); setHoverT(null); }}
      >
        {/* Background */}
        <rect x="0" y="0" width="100%" height={TOTAL_H} fill="#030712" rx="12" />

        {/* Lane labels */}
        {[
          { y: Y_FUSION, label: 'Fusion' },
          { y: Y_EVENTS, label: 'Events' },
          { y: Y_SPEECH, label: 'Speech' },
          { y: Y_AUDIO,  label: 'Audio' },
        ].map(({ y, label }) => (
          <text key={label} x={LABEL_W - 6} y={y + LANE_H / 2 + 1} textAnchor="end"
            fontSize="9" fill="#4b5563" dominantBaseline="middle" className="font-mono">
            {label}
          </text>
        ))}

        {/* Lane separators */}
        {[Y_EVENTS, Y_SPEECH, Y_AUDIO].map(y => (
          <line key={y} x1={LABEL_W} x2="100%" y1={y} y2={y} stroke="#1f2937" strokeWidth="1" />
        ))}

        {/* SVG width-responsive inner block */}
        <svg x={LABEL_W} y="0" width={`calc(100% - ${LABEL_W}px)`} overflow="visible">
          {/* Fusion windows (background shading by anomaly score) */}
          {fusionInsights.map((ins, i) => {
            const x1 = `${(ins.window_start_s / duration) * 100}%`;
            const w  = `${((ins.window_end_s - ins.window_start_s) / duration) * 100}%`;
            const col = anomalyColor(ins.anomaly_score);
            const h   = Math.max(4, ins.anomaly_score * LANE_H);
            return (
              <rect key={i}
                x={x1} y={Y_FUSION + LANE_H - h} width={w} height={h}
                fill={col} opacity={0.55} rx="2"
              />
            );
          })}

          {/* Surveillance events (vertical bars) */}
          {surveillanceEvents.map((ev, i) => {
            const x = `${(ev.timestamp_s / duration) * 100}%`;
            const col = severityHex(ev.severity);
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={Y_EVENTS + 2} y2={Y_EVENTS + LANE_H - 2}
                  stroke={col} strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                <circle cx={x} cy={Y_EVENTS + LANE_H / 2} r="5"
                  fill={col} opacity="0.85" />
              </g>
            );
          })}

          {/* Speech segments */}
          {speechSegments.filter(s => !s.is_noise).map((seg, i) => {
            const x1 = `${(seg.start_s / duration) * 100}%`;
            const w  = `${Math.max(0.3, ((seg.end_s - seg.start_s) / duration) * 100)}%`;
            return (
              <rect key={i}
                x={x1} y={Y_SPEECH + 4} width={w} height={LANE_H - 8}
                fill="#4ade80" opacity={0.6 * seg.confidence + 0.1} rx="2"
              />
            );
          })}

          {/* Audio events (dots on bottom lane) */}
          {anomalyTimeline.map((score, t) => {
            if (score < 0.05) return null;
            const x = `${(t / Math.max(duration, 1)) * 100}%`;
            const col = anomalyColor(score);
            const r = Math.max(2, score * 5);
            return (
              <circle key={t} cx={x} cy={Y_AUDIO + LANE_H / 2} r={r}
                fill={col} opacity={0.7} />
            );
          })}

          {/* Time ticks & labels */}
          {Array.from({ length: tickCount }, (_, i) => {
            const t = tickStep * i;
            const x = `${(t / duration) * 100}%`;
            return (
              <g key={i}>
                <line x1={x} x2={x} y1={Y_AXIS} y2={Y_AXIS + TICK_H / 2}
                  stroke="#374151" strokeWidth="1" />
                <text x={x} y={Y_AXIS + 3} textAnchor="middle"
                  fontSize="8" fill="#6b7280" dominantBaseline="hanging">
                  {fmtSeconds(t)}
                </text>
              </g>
            );
          })}

          {/* Hover cursor */}
          {hoverT !== null && (
            <line
              x1={`${(hoverT / duration) * 100}%`}
              x2={`${(hoverT / duration) * 100}%`}
              y1={Y_AXIS}
              y2={Y_AUDIO + LANE_H}
              stroke="#ffffff"
              strokeWidth="1"
              opacity="0.15"
              strokeDasharray="3,3"
            />
          )}
        </svg>
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 max-w-xs px-3 py-2 bg-white/5 backdrop-blur-md border rounded-xl text-xs text-white shadow-xl"
          style={{
            borderColor: tooltip.color + '60',
            left: Math.min(tooltip.x + 12, window.innerWidth - 260),
            top: tooltip.y + 16,
          }}
        >
          <div className="flex items-start gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: tooltip.color }} />
            <span className="leading-tight">{tooltip.content}</span>
          </div>
        </div>
      )}
    </div>
  );
}
