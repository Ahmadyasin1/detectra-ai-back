import { motion, useReducedMotion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type PageHeroStat = {
  icon?: LucideIcon;
  value: string;
  label: string;
  color?: string;
};

export type PageHeroProps = {
  badge?: string;
  badgeIcon?: LucideIcon;
  badgePulse?: boolean;
  title: string;
  titleAccent?: string;
  description?: string;
  stats?: PageHeroStat[];
  backTo?: { href: string; label: string };
  actions?: ReactNode;
  align?: 'center' | 'left';
  size?: 'default' | 'compact';
  className?: string;
  children?: ReactNode;
};

/** Shared ambient background used on all marketing / app page headers */
export function HeroBackground() {
  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 55% at 50% -8%, rgba(34,211,238,0.11) 0%, transparent 62%), radial-gradient(ellipse 45% 35% at 92% 88%, rgba(99,102,241,0.07) 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.028]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-0 left-1/2 h-px w-[min(90%,42rem)] -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent"
      />
    </>
  );
}

export default function PageHero({
  badge,
  badgeIcon: BadgeIcon,
  badgePulse = true,
  title,
  titleAccent,
  description,
  stats,
  backTo,
  actions,
  align = 'center',
  size = 'default',
  className = '',
  children,
}: PageHeroProps) {
  const reduceMotion = useReducedMotion();
  const centered = align === 'center';
  const compact = size === 'compact';

  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: compact ? 10 : 16 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay },
        };

  return (
    <section
      className={`relative overflow-hidden ${compact ? 'pt-20 pb-8 sm:pt-24 sm:pb-10' : 'pt-24 pb-12 sm:pt-28 sm:pb-16 lg:pb-20'} ${className}`}
    >
      <HeroBackground />

      <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
        {backTo && (
          <motion.div {...fade(0)} className={`mb-6 sm:mb-8 ${centered ? 'flex justify-center sm:justify-start' : ''}`}>
            <Link
              to={backTo.href}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-sm text-gray-400 transition hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {backTo.label}
            </Link>
          </motion.div>
        )}

        <motion.div
          {...fade(0.05)}
          className={centered ? 'mx-auto max-w-4xl text-center' : 'max-w-3xl text-left'}
        >
          {badge && (
            <span
              className={`mb-4 sm:mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3.5 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300 sm:text-[11px] sm:tracking-widest ${centered ? 'mx-auto' : ''}`}
            >
              {badgePulse && (
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-400 animate-pulse" aria-hidden />
              )}
              {BadgeIcon && <BadgeIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />}
              {badge}
            </span>
          )}

          <h1
            className={`font-extrabold tracking-tight text-white ${
              compact
                ? 'text-2xl sm:text-3xl lg:text-4xl leading-tight'
                : 'text-[clamp(1.75rem,5.5vw,3.5rem)] leading-[1.08]'
            }`}
          >
            {title}
            {titleAccent && (
              <>
                {' '}
                <span className="bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 bg-clip-text text-transparent">
                  {titleAccent}
                </span>
              </>
            )}
          </h1>

          {description && (
            <p
              className={`mt-3 sm:mt-4 text-gray-400 leading-relaxed ${
                compact ? 'text-sm sm:text-base max-w-2xl' : 'text-base sm:text-lg max-w-2xl'
              } ${centered ? 'mx-auto' : ''}`}
            >
              {description}
            </p>
          )}

          {actions && (
            <div
              className={`mt-6 sm:mt-8 flex flex-col sm:flex-row gap-3 ${
                centered ? 'items-stretch sm:items-center sm:justify-center' : 'items-stretch sm:items-center'
              }`}
            >
              {actions}
            </div>
          )}
        </motion.div>

        {children && (
          <motion.div {...fade(0.15)} className="mt-8 sm:mt-10">
            {children}
          </motion.div>
        )}

        {stats && stats.length > 0 && (
          <motion.div
            {...fade(0.2)}
            className={`mt-8 sm:mt-10 flex flex-wrap gap-4 sm:gap-6 ${centered ? 'justify-center' : ''}`}
          >
            {stats.map(({ icon: Icon, value, label, color = 'text-cyan-400' }) => (
              <motion.div
                key={label}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 min-w-[8.5rem]"
              >
                {Icon && (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-black/40">
                    <Icon className={`h-4 w-4 ${color}`} />
                  </div>
                )}
                <div className="text-left">
                  <p className={`text-sm font-bold tabular-nums ${color}`}>{value}</p>
                  <p className="text-[11px] text-gray-500">{label}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
}

/** Primary / secondary CTA buttons matching the design system */
export function HeroButtonPrimary({
  children,
  onClick,
  to,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-bold text-black shadow-[0_0_32px_rgba(255,255,255,0.18)] transition hover:scale-[1.02] hover:bg-gray-100 ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function HeroButtonSecondary({
  children,
  onClick,
  to,
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  to?: string;
  className?: string;
}) {
  const cls = `inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/10 ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}
