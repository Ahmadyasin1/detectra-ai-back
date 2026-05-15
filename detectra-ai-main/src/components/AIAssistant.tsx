import { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Bot, User, Sparkles, RefreshCw, ChevronRight,
  AlertTriangle, Loader2, Info,
} from 'lucide-react';
import { chatWithVideo, buildVideoContext, ChatMessage } from '../lib/hfApi';
import { askJobQuestion, type AnalysisResult } from '../lib/detectraApi';

// ── Pre-built questions ───────────────────────────────────────────────────────

const QUICK_QUESTIONS = [
  'What are the most critical security events detected?',
  'How many people were tracked and what were they doing?',
  'Were there any dangerous audio events like gunshots or screams?',
  'What is the overall risk assessment and why?',
  'Summarize everything that happened in this video',
  'At what point did the highest anomaly activity occur?',
  'List all detected speech or dialogue',
  'Were there any suspicious behaviors detected?',
];

// ── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      {[0, 1, 2].map(d => (
        <motion.div
          key={d}
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay: d * 0.18, ease: 'easeInOut' }}
          className="w-2 h-2 rounded-full bg-purple-400"
        />
      ))}
    </div>
  );
}

// ── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === 'user';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-purple-500/25">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}

      <div className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
        isUser
          ? 'bg-gradient-to-br from-cyan-500/20 to-blue-600/15 border border-cyan-500/30 text-gray-200 rounded-tr-sm'
          : 'bg-white/10 border border-white/20/60 text-gray-200 rounded-tl-sm'
      }`}>
        {msg.content}
      </div>

      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center flex-shrink-0 mt-0.5">
          <User className="w-4 h-4 text-cyan-400" />
        </div>
      )}
    </motion.div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AIAssistant({ result, jobId }: { result: AnalysisResult; jobId?: string }) {
  const [messages, setMessages]   = useState<ChatMessage[]>([]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');
  const [showInfo, setShowInfo]   = useState(false);
  const bottomRef                 = useRef<HTMLDivElement>(null);
  const inputRef                  = useRef<HTMLTextAreaElement>(null);

  const context = buildVideoContext(result as unknown as Record<string, unknown>);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setError('');
    const userMsg: ChatMessage   = { role: 'user', content: trimmed };
    const newHistory: ChatMessage[] = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      let reply: string;
      if (jobId) {
        try {
          const r = await askJobQuestion(jobId, trimmed);
          reply = r.answer;
        } catch {
          reply = await chatWithVideo(context, newHistory);
        }
      } else {
        reply = await chatWithVideo(context, newHistory);
      }
      if (!reply?.trim()) throw new Error('Empty response from AI — please try again.');
      setMessages(prev => [...prev, { role: 'assistant', content: reply.trim() }]);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to get AI response';
      setError(msg);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => { setMessages([]); setError(''); };

  return (
    <div className="flex flex-col h-[560px]">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/10 bg-white/5 backdrop-blur-md flex-shrink-0">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/25 flex-shrink-0">
          <Sparkles className="w-[18px] h-[18px] text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm leading-none">AI Video Assistant</p>
          <p className="text-gray-500 text-xs mt-0.5">
            {jobId ? 'Server RAG + Mistral (Detectra API)' : 'Mistral-7B · HuggingFace Inference'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setShowInfo(s => !s)}
            className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors rounded-lg hover:bg-white/20"
            title="About this feature"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 text-gray-600 hover:text-gray-400 transition-colors rounded-lg hover:bg-white/20"
              title="Clear conversation"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ── Info banner ── */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden flex-shrink-0"
          >
            <div className="px-5 py-3 bg-purple-500/8 border-b border-purple-500/20 text-xs text-gray-400 leading-relaxed">
              {jobId ? (
                <>
                  Questions are sent to your <span className="text-purple-300 font-medium">Detectra API</span> (<code className="px-1 bg-white/10 rounded text-purple-300">/api/jobs/…/ask</code>)
                  with the same RAG context as the analyzer report. Configure <code className="px-1 bg-white/10 rounded text-purple-300">HF_TOKEN</code> on the server for reliable answers.
                  If the API is unavailable, the client falls back to direct HuggingFace calls when <code className="px-1 bg-white/10 rounded text-purple-300">VITE_HF_TOKEN</code> is set.
                </>
              ) : (
                <>
                  This assistant uses <span className="text-purple-300 font-medium">Mistral-7B-Instruct-v0.2</span> via HuggingFace Inference API with analysis context embedded in the prompt.
                  Add <code className="px-1 bg-white/10 rounded text-purple-300">VITE_HF_TOKEN</code> for higher rate limits. For production, prefer opening results from a completed job so the server-backed RAG path is used.
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Chat messages area ── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scroll-smooth">

        {/* Welcome + quick questions (empty state) */}
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

            {/* Bot greeting */}
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-purple-500/25">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/10 border border-white/20/60 rounded-2xl rounded-tl-sm px-4 py-3 max-w-sm">
                <p className="text-gray-200 text-sm leading-relaxed">
                  I've analyzed <span className="text-cyan-400 font-semibold">{result.video_name}</span> in full.
                  The analysis found <span className="text-white font-semibold">{result.surveillance_events.length} surveillance events</span> with a{' '}
                  <span className={`font-semibold ${
                    result.risk_level === 'CRITICAL' ? 'text-red-400'
                    : result.risk_level === 'HIGH' ? 'text-orange-400'
                    : result.risk_level === 'MEDIUM' ? 'text-yellow-400'
                    : 'text-green-400'
                  }`}>{result.risk_level}</span> risk level.
                  Ask me anything about what was detected.
                </p>
              </div>
            </div>

            {/* Quick question chips */}
            <div className="ml-11 space-y-1.5">
              <p className="text-gray-600 text-xs font-medium uppercase tracking-wider mb-2">Suggested questions</p>
              {QUICK_QUESTIONS.map((q, i) => (
                <motion.button
                  key={q}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.04 * i }}
                  onClick={() => sendMessage(q)}
                  disabled={loading}
                  className="group flex items-center gap-2 w-full text-left px-3.5 py-2.5 bg-white/5 backdrop-blur-md hover:bg-white/20 border border-white/10 hover:border-purple-500/40 rounded-xl text-gray-400 hover:text-gray-200 text-xs transition-all duration-150"
                >
                  <ChevronRight className="w-3 h-3 text-purple-500 flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  {q}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Message history */}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble key={i} msg={msg} />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-purple-500/25">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
            <div className="bg-white/10 border border-white/20/60 rounded-2xl rounded-tl-sm px-4 py-3">
              <TypingDots />
            </div>
          </motion.div>
        )}

        {/* Error state */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 px-4 py-3 bg-red-500/8 border border-red-500/25 rounded-xl text-sm"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-red-300 font-medium">AI Error</p>
                <p className="text-red-400/80 text-xs mt-0.5">{error}</p>
              </div>
              <button
                onClick={() => setError('')}
                className="text-red-500 hover:text-red-300 transition-colors text-xs"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={bottomRef} />
      </div>

      {/* ── Input area ── */}
      <div className="px-4 py-3.5 border-t border-white/10 bg-white/5 backdrop-blur-md flex-shrink-0">
        <div className="flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about the video analysis… (Enter to send)"
            disabled={loading}
            rows={1}
            className="flex-1 px-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-sm text-white placeholder-gray-600 focus:outline-none focus:border-purple-500/60 transition-colors resize-none leading-relaxed"
            style={{ maxHeight: 100, overflowY: 'auto' }}
            onInput={e => {
              const el = e.target as HTMLTextAreaElement;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 100) + 'px';
            }}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-purple-500/25 transition-all"
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <p className="text-gray-700 text-[11px]">Shift+Enter for new line · Enter to send</p>
          <p className="text-gray-700 text-[11px]">
            {HF_TOKEN ? '🔑 Auth enabled' : 'Free tier · may be slow'}
          </p>
        </div>
      </div>
    </div>
  );
}

// Expose HF_TOKEN check for the info line
const HF_TOKEN = import.meta.env.VITE_HF_TOKEN ?? '';
