// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
}

export interface Token {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

// ─── Video ────────────────────────────────────────────────────────────────────
export type VideoStatus = "uploaded" | "queued" | "processing" | "completed" | "failed";

export interface Video {
  id: number;
  original_filename: string;
  file_size_bytes: number;
  duration_seconds: number | null;
  width: number | null;
  height: number | null;
  fps: number | null;
  status: VideoStatus;
  thumbnail_path: string | null;
  created_at: string;
}

export interface VideoPage {
  items: Video[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

// ─── Analysis ─────────────────────────────────────────────────────────────────
export type JobStatus = "pending" | "running" | "completed" | "failed";

export interface AnalysisConfig {
  enable_object_detection: boolean;
  enable_logo_recognition: boolean;
  enable_motion_recognition: boolean;
  enable_speech_to_text: boolean;
  enable_audio_classification: boolean;
  enable_fusion: boolean;
  frame_extraction_fps: number;
}

export interface AnalysisJob {
  job_id: number;
  video_id: number;
  status: JobStatus;
  progress_pct: number;
  current_stage: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ProgressEvent {
  job_id: number;
  progress: number;
  stage: string;
  status: JobStatus;
  message?: string;
}

// ─── Results ──────────────────────────────────────────────────────────────────
export type Modality = "object" | "logo" | "motion" | "speech" | "audio" | "fused" | "anomaly";

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface ObjectDetection {
  class_name: string;
  confidence: number;
  bbox: BoundingBox;
}

export interface LogoDetection {
  brand: string;
  confidence: number;
}

export interface ActionDetection {
  action: string;
  confidence: number;
  top3: Array<{ action: string; confidence: number }>;
}

export interface SpeechWord {
  word: string;
  start: number;
  end: number;
  probability: number;
}

export interface SpeechData {
  text: string;
  language: string;
  avg_logprob: number;
  no_speech_prob: number;
  words: SpeechWord[];
}

export interface AudioEventData {
  event_class: string;
  top3: Array<{ class: string; confidence: number }>;
  is_highlighted: boolean;
}

export interface FusedInsightData {
  time_bin: number;
  scene_label: string;
  scene_confidence: number;
  anomaly_score: number;
  visual_audio_correlation: number;
  summary: string;
  contributing_events: string[];
  top3_scenes: Array<{ scene: string; confidence: number }>;
}

export type AnomalySeverity = "normal" | "low" | "medium" | "high" | "critical";

export interface AnomalyEventData {
  anomaly_score: number;
  alert: boolean;
  severity: AnomalySeverity;
  flags: string[];
  persons: number;
  action: string;
  audio_type: string;
  speech_detected: boolean;
  rule_scores: Record<string, number>;
}

export interface Result {
  id: number;
  job_id: number;
  modality: Modality;
  timestamp_start_s: number;
  timestamp_end_s: number;
  data: Record<string, unknown>;
  confidence: number | null;
  created_at: string;
}

export interface SummaryStats {
  total_object_detections: number;
  total_logo_detections: number;
  total_action_segments: number;
  total_speech_segments: number;
  total_audio_events: number;
  total_fused_insights: number;
  total_anomaly_events: number;
  unique_objects: string[];
  unique_logos: string[];
  unique_actions: string[];
  alerts_triggered: number;
  overall_risk_level: string;
}

export interface SurveillanceSummary {
  overall_risk: string;
  max_anomaly_score: number;
  total_anomaly_events: number;
  alert_count: number;
  severity_breakdown: Record<string, number>;
  alert_timestamps: number[];
  anomaly_types: Record<string, number>;
  highest_risk_timestamp: number | null;
  video_narrative: string;
  dominant_scene: string;
  person_present_seconds: number;
  vehicle_present_seconds: number;
  total_object_count: number;
  unique_classes: string[];
  class_frequencies: Record<string, number>;
  peak_activity_timestamp: number;
}

export interface FullAnalysisResults {
  job_id: number;
  video_id: number;
  status: string;
  object_detections: Result[];
  logo_detections: Result[];
  motion_detections: Result[];
  speech_segments: Result[];
  audio_events: Result[];
  fused_insights: Result[];
  anomaly_events: Result[];
  summary_stats: SummaryStats;
  surveillance_summary: SurveillanceSummary;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
export const MODALITY_COLORS: Record<Modality, string> = {
  object:  "#6366f1",
  logo:    "#f59e0b",
  motion:  "#10b981",
  speech:  "#3b82f6",
  audio:   "#ec4899",
  fused:   "#8b5cf6",
  anomaly: "#f43f5e",
};

export const MODALITY_LABELS: Record<Modality, string> = {
  object:  "Objects",
  logo:    "Logos",
  motion:  "Actions",
  speech:  "Speech",
  audio:   "Audio",
  fused:   "Insights",
  anomaly: "Alerts",
};

export const SEVERITY_COLORS: Record<AnomalySeverity, string> = {
  normal:   "#475569",
  low:      "#eab308",
  medium:   "#f97316",
  high:     "#ef4444",
  critical: "#dc2626",
};

export const SEVERITY_BG: Record<AnomalySeverity, string> = {
  normal:   "bg-slate-500/20 text-slate-400 border-slate-500/30",
  low:      "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  medium:   "bg-orange-500/20 text-orange-400 border-orange-500/30",
  high:     "bg-red-500/20 text-red-400 border-red-500/30",
  critical: "bg-red-600/30 text-red-300 border-red-600/40",
};

export const STAGE_LABELS: Record<string, string> = {
  initializing:              "Initializing pipeline...",
  stream_agent:              "Extracting frames & audio...",
  preprocessing:             "Extracting frames & audio...",
  preprocessing_complete:    "Preprocessing done",
  perception_agent:          "Running parallel AI inference...",
  object_detection:          "Detecting objects...",
  object_detection_complete: "Object detection done",
  logo_recognition:          "Recognizing logos...",
  logo_recognition_complete: "Logo recognition done",
  motion_recognition:        "Analyzing actions...",
  motion_recognition_complete: "Action recognition done",
  speech_recognition:        "Transcribing speech...",
  speech_recognition_complete: "Speech recognition done",
  audio_classification:      "Classifying audio events...",
  audio_classification_complete: "Audio classification done",
  reasoning_agent:           "Fusing modalities & analyzing anomalies...",
  multimodal_fusion:         "Fusing modalities...",
  anomaly_detection:         "Detecting surveillance anomalies...",
  completed:                 "Analysis complete!",
  failed:                    "Analysis failed",
};
