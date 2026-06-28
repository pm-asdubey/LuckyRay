'use client';

/**
 * LuckyRay Logo — Lakeiren (लकीरें)
 *
 * Design concept: A stylised celestial eye — the "third eye" of Jyotish,
 * surrounded by an orbital ring suggesting planetary motion. The pupil
 * contains a subtle star/ray burst, evoking starlight and cosmic vision.
 * Minimal, geometric, mysterious. No hand/palm metaphor.
 */

import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  variant?: 'default' | 'light' | 'mono';
  className?: string;
  showWordmark?: boolean;
}

export function LuckyRayLogo({ size = 40, variant = 'default', className, showWordmark = false }: LogoProps) {
  const c = {
    default: {
      outer:  'rgba(139,92,246,0.12)',
      ring:   '#4c1d95',
      iris:   '#1e0a3c',
      pupil:  '#7c3aed',
      ray:    '#a78bfa',
      glow:   'rgba(167,139,250,0.25)',
      tick:   'rgba(139,92,246,0.4)',
      text:   '#ede9fe',
      sub:    '#7c3aed',
    },
    light: {
      outer:  'rgba(109,40,217,0.08)',
      ring:   '#7c3aed',
      iris:   '#f5f3ff',
      pupil:  '#6d28d9',
      ray:    '#5b21b6',
      glow:   'rgba(109,40,217,0.15)',
      tick:   'rgba(109,40,217,0.3)',
      text:   '#1e1b4b',
      sub:    '#7c3aed',
    },
    mono: {
      outer:  'transparent',
      ring:   'currentColor',
      iris:   'transparent',
      pupil:  'currentColor',
      ray:    'currentColor',
      glow:   'transparent',
      tick:   'currentColor',
      text:   'currentColor',
      sub:    'currentColor',
    },
  }[variant];

  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="LuckyRay"
        role="img"
      >
        {/* Outer subtle halo */}
        <circle cx="32" cy="32" r="30" fill={c.outer} />

        {/* Orbital ring — 12 tick marks like a clock face / zodiac wheel */}
        <circle cx="32" cy="32" r="28" stroke={c.ring} strokeWidth="0.75" strokeDasharray="2 12.6" strokeDashoffset="1" />

        {/* Secondary inner ring */}
        <circle cx="32" cy="32" r="22" stroke={c.ring} strokeWidth="0.5" opacity="0.5" />

        {/* Iris of the eye / celestial circle */}
        <circle cx="32" cy="32" r="16" fill={c.iris} stroke={c.ring} strokeWidth="1.5" />

        {/* Glow behind pupil */}
        <circle cx="32" cy="32" r="10" fill={c.glow} />

        {/* The Ray — 8-pointed star burst, subtle */}
        {[0, 45, 90, 135].map((angle, i) => {
          const r1 = 4, r2 = 9;
          const a = (angle * Math.PI) / 180;
          const x1 = 32 + r1 * Math.cos(a), y1 = 32 + r1 * Math.sin(a);
          const x2 = 32 + r2 * Math.cos(a), y2 = 32 + r2 * Math.sin(a);
          const x3 = 32 - r2 * Math.cos(a), y3 = 32 - r2 * Math.sin(a);
          const x4 = 32 - r1 * Math.cos(a), y4 = 32 - r1 * Math.sin(a);
          return (
            <g key={i}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={c.ray} strokeWidth="1" opacity={i < 2 ? '0.9' : '0.5'} />
              <line x1={x4} y1={y4} x2={x3} y2={y3} stroke={c.ray} strokeWidth="1" opacity={i < 2 ? '0.9' : '0.5'} />
            </g>
          );
        })}

        {/* Central pupil */}
        <circle cx="32" cy="32" r="4" fill={c.pupil} />
        <circle cx="32" cy="32" r="2" fill={c.ray} />
      </svg>

      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span
            className="font-semibold tracking-wide"
            style={{ fontSize: size * 0.35, color: c.text, letterSpacing: '0.05em' }}
          >
            LuckyRay
          </span>
          <span
            className="tracking-widest"
            style={{ fontSize: size * 0.18, color: c.sub, letterSpacing: '0.22em', marginTop: 2 }}
          >
            लकीरें
          </span>
        </div>
      )}
    </div>
  );
}

export function getLogoDataUrl(size = 128): string {
  const svg = `<svg width="${size}" height="${size}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="32" cy="32" r="30" fill="rgba(139,92,246,0.12)"/>
    <circle cx="32" cy="32" r="28" stroke="#4c1d95" stroke-width="0.75" stroke-dasharray="2 12.6" stroke-dashoffset="1"/>
    <circle cx="32" cy="32" r="22" stroke="#4c1d95" stroke-width="0.5" opacity="0.5"/>
    <circle cx="32" cy="32" r="16" fill="#1e0a3c" stroke="#4c1d95" stroke-width="1.5"/>
    <circle cx="32" cy="32" r="10" fill="rgba(167,139,250,0.25)"/>
    <line x1="32" y1="23" x2="32" y2="28" stroke="#a78bfa" stroke-width="1" opacity="0.9"/>
    <line x1="32" y1="36" x2="32" y2="41" stroke="#a78bfa" stroke-width="1" opacity="0.9"/>
    <line x1="23" y1="32" x2="28" y2="32" stroke="#a78bfa" stroke-width="1" opacity="0.9"/>
    <line x1="36" y1="32" x2="41" y2="32" stroke="#a78bfa" stroke-width="1" opacity="0.9"/>
    <line x1="35.36" y1="28.64" x2="38.54" y2="25.46" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <line x1="28.64" y1="35.36" x2="25.46" y2="38.54" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <line x1="28.64" y1="28.64" x2="25.46" y2="25.46" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <line x1="35.36" y1="35.36" x2="38.54" y2="38.54" stroke="#a78bfa" stroke-width="1" opacity="0.5"/>
    <circle cx="32" cy="32" r="4" fill="#7c3aed"/>
    <circle cx="32" cy="32" r="2" fill="#a78bfa"/>
  </svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}
