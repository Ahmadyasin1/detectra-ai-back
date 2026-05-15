import { motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  Play,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { HeroButtonPrimary, HeroButtonSecondary } from './PageHero';

const DEFAULT_HERO_VIDEOS = [
  'https://txkwnceefmaotmqluajc.supabase.co/storage/v1/object/sign/videos/2ad58a3a_labeled%20(1).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85M2I5Nzc3Ny03Y2UzLTQ4ODItODI1My0wMTE5ODRkMDcwYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvMmFkNThhM2FfbGFiZWxlZCAoMSkubXA0IiwiaWF0IjoxNzc3Nzk1NTYxLCJleHAiOjIwOTMxNTU1NjF9.oDpA57BCjwoDtsBvhA6gbQGBKhnCDXVo6c7_7e1lN6k',
  'https://txkwnceefmaotmqluajc.supabase.co/storage/v1/object/sign/videos/53894342_labeled%20(1)%20(1).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85M2I5Nzc3Ny03Y2UzLTQ4ODItODI1My0wMTE5ODRkMDcwYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvNTM4OTQzNDJfbGFiZWxlZCAoMSkgKDEpLm1wNCIsImlhdCI6MTc3Nzc5NTcxNiwiZXhwIjoyMDkzMTU1NzE2fQ.kA1uC6KXy2AQcbj9GNzAS8k3F3QT-ZkCgFwbn1RHN4c',
  'https://txkwnceefmaotmqluajc.supabase.co/storage/v1/object/sign/videos/080e267f_labeled%20(1)%20(1).mp4?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV85M2I5Nzc3Ny03Y2UzLTQ4ODItODI1My0wMTE5ODRkMDcwYjUiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJ2aWRlb3MvMDgwZTI2N2ZfbGFiZWxlZCAoMSkgKDEpLm1wNCIsImlhdCI6MTc3Nzc5NTk2NSwiZXhwIjoyMDkzMTU1OTY1fQ.pnBDCPCiWGytwi_WQfZuYoDPbgTKMrySyYxPkvXNfDg',
];

const SCENARIO_LABELS = [
  'Street surveillance — object & person tracking',
  'Retail / public space — activity & scene context',
  'Traffic & mobility — multi-object fusion',
];

const TRUST_CHIPS = [
  { icon: ShieldCheck, label: 'Evidence-backed outputs' },
  { icon: CheckCircle2, label: 'Confidence-scored events' },
  { icon: Lock, label: 'Your uploads stay private' },
];

const HERO_VIDEOS = (
  (import.meta.env.VITE_HERO_VIDEO_URLS as string | undefined)
    ?.split(',')
    .map((url) => url.trim())
    .filter(Boolean)
) || DEFAULT_HERO_VIDEOS;

export default function Hero() {
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [activeVideo, setActiveVideo] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [failedVideos, setFailedVideos] = useState<number[]>([]);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const getNextVideoIndex = (current: number, skipped: number[]) => {
    const seen = new Set<number>();
    let next = (current + 1) % HERO_VIDEOS.length;
    while (skipped.includes(next) && !seen.has(next)) {
      seen.add(next);
      next = (next + 1) % HERO_VIDEOS.length;
    }
    return next;
  };

  const advanceVideo = useCallback(
    (skipped?: number[]) => {
      setActiveVideo((current) => getNextVideoIndex(current, skipped ?? failedVideos));
    },
    [failedVideos],
  );

  const goToVideo = (index: number) => {
    if (failedVideos.includes(index)) return;
    setActiveVideo(index);
  };

  useEffect(() => {
    if (reduceMotion) return;
    const interval = window.setInterval(() => advanceVideo(), 12000);
    return () => window.clearInterval(interval);
  }, [advanceVideo, reduceMotion]);

  useEffect(() => {
    setVideoReady(false);
    if (!videoRef.current) return;

    const video = videoRef.current;
    video.load();
    const playPromise = video.play();
    playPromise?.catch(() => {});
  }, [activeVideo]);

  const scenarioLabel =
    SCENARIO_LABELS[activeVideo % SCENARIO_LABELS.length] ?? SCENARIO_LABELS[0];

  return (
    <section
      className="relative w-full overflow-hidden bg-black text-white"
      aria-labelledby="hero-heading"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        initial={false}
        animate={{ opacity: 1 }}
      >
        <motion.div
          className="absolute -top-24 left-1/2 h-[min(50vh,360px)] w-[min(100vw,720px)] -translate-x-1/2 rounded-full bg-cyan-500/15 blur-[100px]"
          animate={reduceMotion ? undefined : { opacity: [0.35, 0.55, 0.35] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <div className="absolute -bottom-32 left-1/2 h-64 w-[min(90vw,560px)] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[100px]" />
      </motion.div>

      <motion.div
        className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center px-4 pb-12 pt-24 sm:px-6 sm:pb-16 sm:pt-28 lg:pt-32"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-5 sm:mb-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-300 sm:text-[11px] sm:tracking-widest">
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
            Detectra AI v5 · Multimodal intelligence
          </span>
        </motion.div>

        <motion.h1
          id="hero-heading"
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="max-w-4xl text-center text-[clamp(2rem,6.5vw,4.25rem)] font-extrabold leading-[1.08] tracking-tight"
        >
          See everything.{' '}
          <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            Miss nothing.
          </span>
        </motion.h1>

        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.1 }}
          className="mt-4 max-w-2xl text-center text-base leading-relaxed text-gray-400 sm:mt-5 sm:text-lg md:text-xl"
        >
          Turn CCTV and body-cam footage into trustworthy intelligence — incidents, activity,
          multilingual speech, and decision-ready reports your team can defend.
        </motion.p>

        <motion.ul
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="mt-6 flex w-full max-w-3xl flex-col gap-2 sm:mt-7 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3"
          aria-label="Trust highlights"
        >
          {TRUST_CHIPS.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-gray-300 sm:text-sm"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-cyan-400" aria-hidden />
              {label}
            </li>
          ))}
        </motion.ul>

        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.18 }}
          className="mt-8 flex w-full max-w-md flex-col items-stretch gap-3 sm:mt-10 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4"
        >
          {user ? (
            <HeroButtonPrimary to="/analyze" className="w-full sm:w-auto">
              Analyze video <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </HeroButtonPrimary>
          ) : (
            <HeroButtonPrimary
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent('open-auth-modal', { detail: { mode: 'signup' } }),
                )
              }
              className="w-full sm:w-auto"
            >
              Start free analysis <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />
            </HeroButtonPrimary>
          )}
          <HeroButtonSecondary to="/demo" className="w-full sm:w-auto">
            <Play className="h-4 w-4 shrink-0 fill-white" aria-hidden />
            Watch demo
          </HeroButtonSecondary>
        </motion.div>

        {/* Video showcase — unobstructed on all breakpoints */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="mt-10 w-full sm:mt-14 lg:mt-16"
        >
          <div className="group relative mx-auto w-full max-w-5xl">
            <motion.div
              className="rounded-2xl bg-gradient-to-b from-cyan-500/30 via-white/10 to-transparent p-[1px] shadow-[0_24px_80px_rgba(6,182,212,0.12)] sm:rounded-3xl"
              whileHover={reduceMotion ? undefined : { scale: 1.005 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            >
              <motion.div
                className="relative overflow-hidden rounded-2xl bg-black sm:rounded-3xl"
                layout
              >
                {/* Window chrome */}
                <motion.div
                  className="flex items-center gap-2 border-b border-white/10 bg-gradient-to-b from-zinc-900/95 to-black/80 px-3 py-2.5 sm:px-4 sm:py-3"
                  role="presentation"
                >
                  <span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400/90" />
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
                  <p className="mx-auto truncate px-2 text-center font-mono text-[9px] font-medium uppercase tracking-wider text-cyan-300/80 sm:text-[10px] sm:tracking-widest">
                    <span className="hidden min-[400px]:inline">Detectra · </span>
                    Analysis preview
                  </p>
                  <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300 sm:inline-flex">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    Sample
                  </span>
                </motion.div>

                <div className="relative aspect-video w-full max-h-[min(52vh,380px)] bg-zinc-950 sm:max-h-none">
                  <video
                    ref={videoRef}
                    key={activeVideo}
                    src={HERO_VIDEOS[activeVideo]}
                    autoPlay
                    muted
                    playsInline
                    loop
                    preload="auto"
                    crossOrigin="anonymous"
                    aria-label={`Detectra analysis demo: ${scenarioLabel}`}
                    onCanPlay={() => {
                      setVideoReady(true);
                      setErrorCount(0);
                    }}
                    onLoadedData={() => setVideoReady(true)}
                    onError={() => {
                      setErrorCount((count) => count + 1);
                      setFailedVideos((current) => {
                        const updated = current.includes(activeVideo)
                          ? current
                          : [...current, activeVideo];
                        setActiveVideo(getNextVideoIndex(activeVideo, updated));
                        return updated;
                      });
                    }}
                    className="h-full w-full object-contain sm:object-cover"
                  />

                  {!videoReady && (
                    <div
                      className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950"
                      role="status"
                      aria-live="polite"
                    >
                      <motion.div
                        className="flex flex-col items-center gap-3 px-4 text-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                      >
                        <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
                        <p className="text-sm text-gray-400">
                          {errorCount > 0 ? 'Switching to next sample…' : 'Loading analysis preview…'}
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {/* Light edge fade only — keeps bounding boxes visible */}
                  <motion.div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/50 to-transparent sm:h-20"
                    aria-hidden
                  />

                  {/* Compact corner badge — not blocking the feed */}
                  <motion.div
                    className="pointer-events-none absolute left-2 top-2 z-10 max-w-[calc(100%-4rem)] sm:left-3 sm:top-3"
                    initial={reduceMotion ? false : { opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                  >
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-black/70 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur-md sm:px-2.5 sm:text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" aria-hidden />
                      Pre-analyzed demo footage
                    </span>
                  </motion.div>

                  {/* Carousel controls */}
                  {HERO_VIDEOS.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setActiveVideo(
                            (activeVideo - 1 + HERO_VIDEOS.length) % HERO_VIDEOS.length,
                          )
                        }
                        className="absolute left-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white opacity-80 backdrop-blur-md transition hover:bg-black/80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 sm:left-3 sm:h-10 sm:w-10"
                        aria-label="Previous demo clip"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => advanceVideo()}
                        className="absolute right-2 top-1/2 z-20 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white opacity-80 backdrop-blur-md transition hover:bg-black/80 hover:opacity-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-400 sm:right-3 sm:h-10 sm:w-10"
                        aria-label="Next demo clip"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            </motion.div>

            {/* Caption + trust — below video so overlays never hide detections */}
            <motion.div
              className="mt-4 space-y-4 sm:mt-5"
              initial={reduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <motion.div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-cyan-400 sm:text-xs">
                    What you are seeing
                  </p>
                  <p className="mt-1 text-sm font-semibold leading-snug text-white sm:text-base">
                    {scenarioLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-gray-500 sm:text-sm">
                    Real outputs from our v5 pipeline — bounding boxes, tracks, scene context, and
                    risk scoring on sample surveillance clips. Upload your own video in the analyzer
                    for the same treatment.
                  </p>
                </motion.div>

                {HERO_VIDEOS.length > 1 && (
                  <div
                    className="flex shrink-0 items-center justify-center gap-2 sm:justify-end"
                    role="tablist"
                    aria-label="Demo clips"
                  >
                    {HERO_VIDEOS.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        role="tab"
                        aria-selected={i === activeVideo}
                        aria-label={`Demo clip ${i + 1}`}
                        disabled={failedVideos.includes(i)}
                        onClick={() => goToVideo(i)}
                        className={`h-2 rounded-full transition-all ${
                          i === activeVideo
                            ? 'w-7 bg-cyan-400'
                            : 'w-2 bg-white/25 hover:bg-white/40'
                        } ${failedVideos.includes(i) ? 'cursor-not-allowed opacity-30' : ''}`}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-4 min-[480px]:grid-cols-3 sm:gap-3">
                {[
                  { value: '6+', label: 'AI models fused per clip' },
                  { value: '250+', label: 'Brand & logo references' },
                  { value: '3', label: 'Export formats (video, report, JSON)' },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center sm:text-left sm:px-4 sm:py-3"
                  >
                    <p className="text-lg font-bold text-white sm:text-xl">{stat.value}</p>
                    <p className="text-[11px] leading-snug text-gray-500 sm:text-xs">{stat.label}</p>
                  </div>
                ))}
              </div>

              <p className="text-center text-[11px] text-gray-600 sm:text-left sm:text-xs">
                Demonstration uses pre-recorded, labeled samples — not a live camera feed. Your
                uploads are processed for your account only.
              </p>
            </motion.div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
}
