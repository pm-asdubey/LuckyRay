'use client';

/**
 * LuckyRay Logo
 *
 * Brand concept: "Lakeiren" (लकीरें) = lines on your palm / fate lines
 * Combined with "Lucky Ray" = a ray of light/fortune from your palm
 *
 * Visual: A stylised open palm with three classical Jyotish lines
 * (life, heart, head) that converge into a rising ray of light from the
 * palm's centre — representing fate written in the hand, illuminated
 * by the stars.
 *
 * The design is intentionally minimal and mysterious — no cartoonish
 * elements, just precise curves and a subtle glow.
 */

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;         // width = height (square SVG)
  variant?: 'default' | 'light' | 'mono';
  className?: string;
  showWordmark?: boolean;
}

export function LuckyRayLogo({ size = 40, variant = 'default', className, showWordmark = false }: LogoProps) {
  const colors = {
    default: {
      ray:    '#a78bfa',   // violet-400
      lines:  '#7c3aed',   // violet-600
      glow:   'rgba(124,58,237,0.18)',
      ring:   'rgba(139,92,246,0.15)',
      center: '#c4b5fd',   // violet-300
      bg:     'transparent',
    },
    light: {
      ray:    '#6d28d9',   // violet-700
      lines:  '#5b21b6',   // violet-800
      glow:   'rgba(109,40,217,0.12)',
      ring:   'rgba(109,40,217,0.1)',
      center: '#7c3aed',
      bg:     'transparent',
    },
    mono: {
      ray:    'currentColor',
      lines:  'currentColor',
      glow:   'transparent',
      ring:   'transparent',
      center: 'currentColor',
      bg:     'transparent',
    },
  };

  const c = colors[variant];

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      {/* Icon mark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="LuckyRay — Lakeiren"
        role="img"
      >
        {/* Outer ring — subtle halo */}
        <circle cx="32" cy="32" r="30" stroke={c.ring} strokeWidth="1" />

        {/* Mid ring */}
        <circle cx="32" cy="32" r="22" stroke={c.glow} strokeWidth="6" />

        {/*
          Palm lines — three arcs representing the three classical
          palmistry lines: life (left arc), heart (upper curve), head (middle)
          All converge toward the centre of the palm at roughly (30, 35)
        */}

        {/* Life line — curves from upper mount to base, left of centre */}
        <path
          d="M 24 16 C 20 24, 19 32, 22 46"
          stroke={c.lines}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Heart line — arcs across the upper palm */}
        <path
          d="M 17 28 C 24 24, 36 24, 46 30"
          stroke={c.lines}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* Head line — nearly horizontal, slightly curved */}
        <path
          d="M 18 34 C 26 32, 36 32, 46 36"
          stroke={c.lines}
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.7"
        />

        {/*
          Fate / Sun line — rises from the base of the palm upward and
          then extends BEYOND the palm boundary as a "ray of light",
          representing the celestial ray / Lucky Ray concept.
          This is the core of the logo — fate written in the palm,
          projecting outward as a divine ray.
        */}

        {/* Fate line lower half — inside the palm, rising */}
        <path
          d="M 32 46 C 32 40, 31 36, 30 30"
          stroke={c.ray}
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* The Ray — fate line continues beyond the palm, becoming a beam */}
        <path
          d="M 30 30 C 30 24, 31 18, 32 8"
          stroke={c.ray}
          strokeWidth="2.5"
          strokeLinecap="round"
          opacity="1"
        />

        {/* Ray tip glow — tiny star at the apex of the ray */}
        <circle cx="32" cy="8" r="2" fill={c.ray} opacity="0.9" />
        <circle cx="32" cy="8" r="4" fill={c.glow} />

        {/* Small cross-ray — the "star" suggestion */}
        <line x1="30" y1="8" x2="34" y2="8" stroke={c.ray} strokeWidth="1" opacity="0.5" />
        <line x1="32" y1="6" x2="32" y2="10" stroke={c.ray} strokeWidth="1" opacity="0.5" />

        {/* Centre node — where all lines converge */}
        <circle cx="30" cy="30" r="2" fill={c.center} opacity="0.8" />

        {/* Soft inner glow at convergence point */}
        <circle cx="30" cy="30" r="5" fill={c.glow} />
      </svg>

      {/* Wordmark (optional) */}
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-semibold tracking-wide"
            style={{
              fontSize: size * 0.38,
              color: variant === 'light' ? '#1e1b4b' : '#ede9fe',
              letterSpacing: '0.04em',
            }}
          >
            LuckyRay
          </span>
          <span
            className="tracking-widest"
            style={{
              fontSize: size * 0.19,
              color: variant === 'light' ? '#7c3aed' : '#7c3aed',
              letterSpacing: '0.2em',
              marginTop: 1,
            }}
          >
            लकीरें
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * Logo as a pure string SVG (for embedding in PDF, emails, etc.).
 * Returns an SVG data URL.
 */
export function getLogoDataUrl(size = 128): string {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" stroke="rgba(139,92,246,0.15)" stroke-width="1"/>
    <circle cx="32" cy="32" r="22" stroke="rgba(124,58,237,0.18)" stroke-width="6"/>
    <path d="M 24 16 C 20 24, 19 32, 22 46" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
    <path d="M 17 28 C 24 24, 36 24, 46 30" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" opacity="0.85"/>
    <path d="M 18 34 C 26 32, 36 32, 46 36" stroke="#7c3aed" stroke-width="1.8" stroke-linecap="round" opacity="0.7"/>
    <path d="M 32 46 C 32 40, 31 36, 30 30" stroke="#a78bfa" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
    <path d="M 30 30 C 30 24, 31 18, 32 8" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round"/>
    <circle cx="32" cy="8" r="2" fill="#a78bfa" opacity="0.9"/>
    <circle cx="32" cy="8" r="4" fill="rgba(124,58,237,0.18)"/>
    <line x1="30" y1="8" x2="34" y2="8" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <line x1="32" y1="6" x2="32" y2="10" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <circle cx="30" cy="30" r="2" fill="#c4b5fd" opacity="0.8"/>
    <circle cx="30" cy="30" r="5" fill="rgba(124,58,237,0.18)"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
