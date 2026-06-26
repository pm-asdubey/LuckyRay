# LuckyRay

A premium AI-powered Jyotish (Vedic Astrology) application.

LuckyRay combines deterministic birth chart calculations with conversational AI to produce thoughtful, evidence-based astrological guidance. It is designed for professionals, founders, and curious learners seeking a modern, sophisticated approach to Jyotish.

---

## Architecture

```
BirthDetails
    ↓
@luckyray/astronomy    – Planetary positions (astronomy-engine, VSOP87 accuracy)
    ↓
@luckyray/jyotish     – Jyotish rules engine (houses, yogas, dashas, doshas)
    ↓
@luckyray/ai          – Context builder + system prompts
    ↓
apps/web/api/ai/chat  – NVIDIA NIM streaming API proxy
    ↓
Presentation Layer    – Next.js 14 App Router, Tailwind CSS, IndexedDB
```

The AI **never** calculates astrology. The astrology engine **never** generates explanations. They are strictly separate.

---

## Quick Start

### Prerequisites

- Node.js 20+
- npm 10+
- A [NVIDIA NIM API key](https://build.nvidia.com/) for AI chat

### Installation

```bash
git clone https://github.com/your-org/luckyray
cd luckyray
npm install
```

### Environment setup

```bash
cp apps/web/.env.example apps/web/.env.local
# Edit .env.local and set NVIDIA_API_KEY
```

### Development

```bash
npm run dev
```

Opens at `http://localhost:3000`.

### Build

```bash
npm run build
```

### Tests

```bash
npm test                     # All packages
# or per-package:
cd packages/jyotish && npm test
cd packages/astronomy && npm test
```

---

## Technology Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Astronomy library | `astronomy-engine` (MIT) | Pure JS, VSOP87 accuracy, works in browser and Node.js — no native addons required |
| Ayanamsa | Lahiri (Chitrapaksha) | Most widely used in India, adopted by Government of India Calendar Reform Committee (1955) |
| House system | Whole Sign | Parashari default — house 1 = ascendant sign, each subsequent sign = next house |
| Dasha system | Vimshottari | Standard 120-year cycle, based on Moon's birth nakshatra |
| Storage | IndexedDB via `idb` | Local-first; all data stays in the browser, no cloud required |
| State management | Zustand | Minimal boilerplate, excellent TypeScript support, selective subscriptions |
| AI provider | NVIDIA NIM | OpenAI-compatible API, llama-3.1-70b-instruct, no API key exposed to browser |
| Framework | Next.js 14 App Router | Server-side API routes for secure AI key handling |
| Geocoding | Nominatim (OpenStreetMap) | Free, no API key, privacy-respecting |

Full decision rationale: see `.claude/DECISION_LOG.md`

---

## Monorepo Structure

```
LuckyRay/
├── apps/
│   └── web/               # Next.js 14 App Router
│       ├── src/app/       # Pages and API routes
│       ├── src/components/# UI components
│       ├── src/hooks/     # React hooks
│       ├── src/store/     # Zustand state
│       └── src/lib/       # Utilities
├── packages/
│   ├── shared/            # Types, constants shared across all packages
│   ├── astronomy/         # Astronomical calculations (astronomy-engine wrapper)
│   ├── jyotish/           # Jyotish rules engine (yogas, dashas, houses, doshas)
│   ├── ai/                # System prompts + chart context builder
│   └── storage/           # IndexedDB persistence layer (idb)
├── .claude/               # Project specifications (authoritative)
└── netlify.toml           # Deployment configuration
```

---

## Features (MVP)

- **Birth chart generation** — Deterministic sidereal planetary positions with Lahiri ayanamsa
- **North Indian chart grid** — Interactive SVG chart with house hover tooltips
- **Planet analysis** — Dignity, combustion, retrograde, nakshatra, pada
- **Yoga detection** — 10+ classical yogas (Gajakesari, Budha-Aditya, Pancha Mahapurusha, Raja Yoga, etc.)
- **Dosha detection** — Manglik, Kala Sarpa, Pitru, Shakata
- **Vimshottari Dasha** — 120-year timeline with antardasha breakdown
- **Divisional charts** — D9 (Navamsa), D10 (Dashamsa)
- **AI chat** — Context-aware Jyotish advisor powered by NVIDIA NIM (Llama 3.1 70B)
- **Local-first** — All data stored in IndexedDB; no account required
- **Export** — Download chart as JSON; full data backup/restore
- **Responsive** — Works on desktop, tablet, and mobile

---

## Privacy

LuckyRay is fully local-first. The only external network requests are:

1. **Nominatim (geocoding)** — to look up birth place coordinates
2. **NVIDIA NIM** — to send AI chat messages (includes chart context, not stored)

No analytics. No tracking. No cloud storage.

---

## Deployment (Netlify)

```bash
# Set environment variables in Netlify dashboard:
# NVIDIA_API_KEY = your-key

# Deploy:
git push origin main
```

The `netlify.toml` configures the Next.js plugin, security headers, and cache policies automatically.

---

## Jyotish Calculation Reference

All calculations follow the **Parashari tradition**:

- **Ayanamsa**: Lahiri — base 22°27'38" at J1900.0, precessing at ~50.29"/year
- **House system**: Whole Sign (each sign = one house, ascendant sign = H1)
- **Planets**: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rahu (mean node), Ketu (mean node)
- **Special aspects**: Mars (4th, 8th); Jupiter (5th, 9th); Saturn (3rd, 10th); Rahu/Ketu (5th, 9th)
- **Vimshottari cycle**: Ketu 7y, Venus 20y, Sun 6y, Moon 10y, Mars 7y, Rahu 18y, Jupiter 16y, Saturn 19y, Mercury 17y

---

## License

MIT

---

*LuckyRay provides Jyotish interpretations for reflection and self-understanding. It is not a substitute for professional astrological consultation, medical advice, or financial guidance.*
