// HuggingFace Inference API — open-source LLM for video Q&A
// Model: Mistral-7B-Instruct-v0.2 (best free open-source instruction model)
// Add VITE_HF_TOKEN to .env for higher rate limits and priority access

import { distinctPersonCount, type AnalysisResult } from './detectraApi';

const HF_API  = 'https://api-inference.huggingface.co/models';
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN ?? '';
const MODEL_ID = 'mistralai/Mistral-7B-Instruct-v0.2';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Mistral instruct format: <s>[INST] … [/INST] … </s>[INST] …
function buildPrompt(systemContext: string, history: ChatMessage[]): string {
  let out = '';
  for (let i = 0; i < history.length; i++) {
    const msg = history[i];
    if (msg.role === 'user') {
      const payload = i === 0 ? `${systemContext}\n\n${msg.content}` : msg.content;
      out += `<s>[INST] ${payload} [/INST]`;
    } else {
      out += ` ${msg.content}</s>`;
    }
  }
  return out;
}

// Build a rich plaintext context document from the AnalysisResult
export function buildVideoContext(result: Record<string, unknown>): string {
  const dur    = (result.duration_s as number) || 0;
  const dMin   = Math.floor(dur / 60);
  const dSec   = Math.floor(dur % 60);

  type Row = Record<string, unknown>;

  const events = ((result.surveillance_events as Row[]) || [])
    .map(e => {
      const ts = e.timestamp_s as number;
      const mm = Math.floor(ts / 60);
      const ss = String(Math.floor(ts % 60)).padStart(2, '0');
      return `  [${String(e.severity).toUpperCase()}] ${mm}:${ss} — ${e.description} (${Math.round((e.confidence as number) * 100)}% conf)`;
    })
    .join('\n');

  const topObjects = ((result.top_objects as Row[]) || [])
    .slice(0, 10)
    .map(o => `  ${o.label}: ${o.count}×`)
    .join('\n');

  const audioEvts = ((result.audio_events as Row[]) || [])
    .slice(0, 20)
    .map(a => {
      const ts = Math.floor(a.timestamp_s as number);
      return `  [${ts}s] ${String(a.event_type).replace(/_/g, ' ')}: ${a.details || ''}`;
    })
    .join('\n');

  const fusionAlerts = ((result.fusion_insights as Row[]) || [])
    .filter(f => f.alert)
    .map(f => {
      const s = Math.floor(f.window_start_s as number);
      const e = Math.floor(f.window_end_s as number);
      return `  [${s}–${e}s] ${String(f.scene_label).replace(/_/g, ' ')}: ${f.description}`;
    })
    .join('\n');

  const sc = (result.severity_counts as Row) || {};
  const langs = ((result.detected_languages as Row[]) || [])
    .map(l => `${l.name || l.code} (${l.segment_count} segs)`)
    .join(', ');

  const transcript = result.full_transcript as string | undefined;
  const survCount = ((result.surveillance_events as Row[]) || []).length;
  const trackCount = distinctPersonCount(result as unknown as AnalysisResult);

  return `VIDEO INTELLIGENCE REPORT
==========================
File: ${result.video_name || 'Unknown'}
Duration: ${dMin}:${String(dSec).padStart(2, '0')}
Resolution: ${result.width}×${result.height} @ ${((result.fps as number) || 0).toFixed(1)} fps
Total Frames: ${((result.total_frames as number) || 0).toLocaleString()}
Processing Time: ${((result.processing_time_s as number) || 0).toFixed(1)}s

RISK ASSESSMENT
Risk Level: ${result.risk_level || 'UNKNOWN'}
Risk Score: ${(((result.risk_score as number) || 0) * 100).toFixed(0)}/100
Severity — Critical: ${sc.critical || 0}, High: ${sc.high || 0}, Medium: ${sc.medium || 0}, Low: ${sc.low || 0}

SURVEILLANCE EVENTS (${survCount} total)
${events || '  None detected'}

PERSONS & TRACKING
Distinct individuals (estimated): ${trackCount}
Max concurrent in frame: ${(result.max_concurrent_persons as number) || 0}
Peak activity at: ${Math.floor(((result.peak_activity_ts as number) || 0) / 60)}:${String(Math.floor(((result.peak_activity_ts as number) || 0) % 60)).padStart(2, '0')}
Total object detections: ${(result.total_object_count as number) || 0}

DETECTED OBJECTS (top 10)
${topObjects || '  None detected'}

SPEECH & LANGUAGE
Languages: ${langs || 'None'}
${transcript ? `Transcript excerpt: "${transcript.slice(0, 600)}${transcript.length > 600 ? '…' : ''}"` : 'No speech detected'}

ENVIRONMENTAL AUDIO EVENTS
${audioEvts || '  None detected'}

FUSION ALERTS (cross-modal anomalies)
${fusionAlerts || '  None'}

AI NARRATIVE SUMMARY
${(result.summary as string) || 'No summary generated'}`;
}

const SYSTEM_PROMPT =
  `You are Detectra AI Assistant — an expert surveillance intelligence analyst embedded in the Detectra AI platform.
You have full access to a completed AI video analysis report including detected events, tracked persons, speech transcripts, audio events, and risk assessment.
Answer questions based ONLY on the provided analysis data. Be concise, factual, and professional.
Do NOT use markdown formatting — plain text only. If asked about something not in the data, say so clearly.
When citing timestamps, use MM:SS format.`;

export async function chatWithVideo(
  context: string,
  history: ChatMessage[],
): Promise<string> {
  const sysCtx = `${SYSTEM_PROMPT}\n\n${context}`;
  const prompt = buildPrompt(sysCtx, history);

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (HF_TOKEN) headers['Authorization'] = `Bearer ${HF_TOKEN}`;

  let response: Response;
  try {
    response = await fetch(`${HF_API}/${MODEL_ID}`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens:   400,
          temperature:      0.35,
          top_p:            0.92,
          do_sample:        true,
          return_full_text: false,
          stop:             ['</s>', '[INST]', '<s>'],
        },
        options: {
          wait_for_model: true,
          use_cache:      false,
        },
      }),
      signal: AbortSignal.timeout(120_000),
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      throw new Error('Request timed out — the AI model may be loading. Try again in 30 seconds.');
    }
    throw err;
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (response.status === 503) {
      throw new Error('AI model is warming up. Please wait 30 seconds and try again.');
    }
    throw new Error((body.error as string) || `AI service error (${response.status})`);
  }

  const data = await response.json() as unknown;
  const text = Array.isArray(data)
    ? (data[0] as Record<string, unknown>)?.generated_text
    : (data as Record<string, unknown>)?.generated_text;

  return String(text || '')
    .trim()
    .replace(/\[INST\][\s\S]*$/m, '')
    .replace(/<\/s>[\s\S]*$/m, '')
    .trim();
}
