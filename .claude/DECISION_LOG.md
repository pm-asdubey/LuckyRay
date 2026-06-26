# DECISION_LOG.md

# LuckyRay Architecture Decision Log

## Purpose

This document records every significant architectural, product, UX and engineering decision made during the development of LuckyRay.

Its purpose is to explain **why** decisions were made, not simply **what** was built.

Whenever Claude makes a meaningful decision without user input, it should record it here.

This document should be updated continuously throughout development.

---

# Decision Record Format

Every decision should follow this structure:

---

## Decision ID

Unique identifier.

Example:

ADR-001

---

## Date

Decision date.

---

## Category

Examples:

Architecture

AI

UI

Performance

Storage

Security

Testing

Deployment

Astrology

Documentation

---

## Problem

Describe the problem being solved.

---

## Alternatives Considered

List every serious option.

Include advantages and disadvantages.

Avoid straw-man alternatives.

---

## Decision

Describe the chosen solution.

Explain why it was selected.

---

## Consequences

Positive effects.

Trade-offs.

Future implications.

---

## Future Reconsideration

Describe situations where this decision should be revisited.

---

# Initial Decisions

The following decisions are already accepted unless future evidence strongly suggests otherwise.

---

## ADR-001

### Title

Local-first architecture.

### Decision

Store all user data locally.

### Rationale

Privacy.

Simplicity.

No authentication.

Fast development.

---

## ADR-002

### Title

No traditional backend.

### Decision

Use Netlify Functions only.

### Rationale

Minimal infrastructure.

Secure API keys.

Lower operational complexity.

---

## ADR-003

### Title

Deterministic astrology engine.

### Decision

Separate astronomy from astrology calculations.

### Rationale

Improves correctness.

Allows independent testing.

Reduces AI hallucination.

---

## ADR-004

### Title

AI explains.

Engine calculates.

### Decision

AI never performs deterministic calculations.

### Rationale

Transparency.

Accuracy.

Repeatability.

---

## ADR-005

### Title

Canonical chart schema.

### Decision

Every module communicates using a normalized chart object.

### Rationale

Loose coupling.

Future-proofing.

Provider independence.

---

## ADR-006

### Title

English-first MVP.

### Decision

Primary language is English.

### Rationale

Target markets:

US

UK

India

Future internationalization remains possible.

---

## ADR-007

### Title

Premium-first UI.

### Decision

Optimize for quality over feature quantity.

### Rationale

A focused, polished experience builds more trust than a large number of unfinished features.

---

## ADR-008

### Title

Open-source astrology foundation.

### Decision

Prefer mature open-source astronomical libraries over commercial astrology APIs whenever practical.

### Rationale

Lower operating cost.

Transparency.

Long-term control.

---

## ADR-009

### Title

Local conversations.

### Decision

Store conversations on the user's machine.

### Rationale

Privacy.

Offline history.

No account requirement.

---

## ADR-010

### Title

Evidence-based AI.

### Decision

Require the AI to explain conclusions using supplied chart evidence.

### Rationale

Improves trust.

Reduces hallucinations.

Encourages education.

---

# Maintenance Rules

Every time Claude makes a meaningful decision it should ask:

Is this a long-term architectural decision?

If yes:

Create a new ADR.

Do not overwrite previous decisions.

Preserve project history.

---

# Documentation Standards

Decision entries should be:

Concise.

Objective.

Technically accurate.

Future engineers should understand why a decision was made years later.

---

# Things That Should Become ADRs

Examples:

Choosing an astronomy library.

Choosing a state management library.

Changing storage architecture.

Changing AI provider.

Introducing offline AI.

Supporting multiple astrology schools.

Adding authentication.

Changing the canonical schema.

Replacing Netlify.

Changing deployment architecture.

Supporting desktop packaging.

---

# Implemented ADRs

---

## ADR-011

### Title

astronomy-engine as the planetary calculation library

### Category

Astronomy / Architecture

### Date

2026-06-26

### Problem

We need accurate planetary position calculations (VSOP87 accuracy) that work in both browser and Node.js environments, without native addons.

### Alternatives Considered

| Library | Pros | Cons |
|---------|------|------|
| Swiss Ephemeris (pyswisseph) | Very accurate, widely used | Python only, requires native C bindings, not usable in Node/browser |
| flatlib | Python Jyotish library | Python only, requires subprocess bridge |
| VedAstro | .NET library | Requires WASM bridge or API, heavy dependency |
| astronomy-engine | MIT license, pure JS, VSOP87 accuracy, works in browser and Node | No explicit Jyotish mode (we implement ayanamsa ourselves) |

### Decision

Use `astronomy-engine` (MIT, by Don Cross). Implement Lahiri ayanamsa conversion and sidereal positioning ourselves.

### Rationale

- Pure JavaScript/TypeScript — works in Next.js API routes and browser without native addons
- MIT license — compatible with open-source mission
- VSOP87 theory gives <1 arc-second accuracy for modern dates
- Active maintenance with clear documentation
- Avoids subprocess or WASM bridge overhead

### Consequences

- We own the ayanamsa calculation — more control, testable in isolation
- No native binaries in the build chain — simpler Netlify deployment
- Future: adding other ayanamsas (Krishnamurti, Raman) is purely additive

---

## ADR-012

### Title

Lahiri (Chitrapaksha) Ayanamsa as the default sidereal correction

### Category

Astrology

### Date

2026-06-26

### Problem

Vedic astrology requires converting tropical planetary positions to sidereal (nakshatra-based) positions. Multiple ayanamsa systems exist (Lahiri, Raman, Krishnamurti, Yukteshwar) with values differing by up to 2°.

### Decision

Default to Lahiri (Chitrapaksha) ayanamsa.

### Rationale

- Lahiri is the official ayanamsa adopted by the Government of India's Calendar Reform Committee (1955)
- Most widely used ayanamsa among Indian Jyotishis
- Well-documented baseline: 22.46047° at J1900.0, precessing at ~50.29"/year
- Provides the most reproducible and widely-verifiable results for our target market

### Future Reconsideration

If users in the KP astrology community (which prefers Krishnamurti ayanamsa) become a significant segment, a settings toggle should be added.

---

## ADR-013

### Title

Whole Sign House System as the default

### Category

Astrology

### Date

2026-06-26

### Problem

Multiple house systems exist in Jyotish (Whole Sign, Equal House, Placidus-derivative). The house system affects how planets are assigned to life areas.

### Decision

Use the Whole Sign house system (Parashari tradition). House 1 = the sign containing the ascendant; each subsequent house is the next sign.

### Rationale

- Standard in classical Parashari Jyotish — the most widely documented tradition
- Simple and deterministic: no interpolation, no edge cases near polar latitudes
- Makes house 1 = ascendant sign unambiguous regardless of birth time precision
- Matches most classical texts and modern Jyotish software (Jagannatha Hora, Parashara's Light)

---

## ADR-014

### Title

Vimshottari Dasha system

### Category

Astrology

### Date

2026-06-26

### Problem

Jyotish uses multiple predictive timing systems (Dashas). Which system to implement for MVP?

### Decision

Implement Vimshottari Dasha (120-year cycle based on Moon's nakshatra at birth).

### Rationale

- Most widely used dasha system in contemporary Jyotish
- Fully deterministic from Moon's sidereal longitude at birth
- Well-documented 9-planet cycle with fixed year allocations
- First period at birth is a partial balance (proportional to remaining nakshatra degrees)

### Implementation Detail

The first Mahadasha period stores only the remaining balance at birth (not the full duration). Subsequent periods have full durations per `VIMSHOTTARI_YEARS`. Total lifetime coverage is therefore < 120 years.

---

## ADR-015

### Title

IndexedDB via `idb` for local persistence

### Category

Storage

### Date

2026-06-26

### Problem

The application must persist profiles, charts, conversations, and settings locally without requiring a backend or user account.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| localStorage | Simple, synchronous | 5–10MB limit, no structured queries, blocking |
| IndexedDB (raw) | Unlimited size, async, structured | Complex cursor-based API |
| `idb` (wrapper) | Promise-based IndexedDB, typed | Thin abstraction only |
| SQLite via WASM | Full SQL, relational | Heavy bundle, slower startup |
| Dexie.js | Higher-level ORM over IDB | Extra bundle size, another abstraction |

### Decision

Use `idb` (Jake Archibald's promise-based IndexedDB wrapper). Implement our own schema with typed stores.

### Rationale

- IndexedDB has no practical storage limit (unlike localStorage)
- `idb` gives Promise + async/await interface without heavy abstraction overhead
- Typed schema using `idb`'s `DBSchema` interface catches errors at compile time
- Minimal bundle addition (~5kb)

---

## ADR-016

### Title

Zustand for global state management

### Category

Architecture

### Date

2026-06-26

### Problem

The application needs shared state (active profile, active chart, toast queue, settings) accessible across unrelated components without prop drilling.

### Alternatives Considered

| Option | Pros | Cons |
|--------|------|------|
| React Context | Zero deps | Re-render storms on large state |
| Redux Toolkit | Mature, DevTools | Boilerplate-heavy for small app |
| Jotai | Atomic model, lightweight | Different mental model |
| Zustand | Minimal, React-free core, DevTools | Less opinionated |

### Decision

Use Zustand. Single store defined in `apps/web/src/store/app-store.ts`.

### Rationale

- Minimal boilerplate
- Works outside React components (can be read in API utilities)
- Excellent TypeScript inference
- Small bundle (~1kb)

---

## ADR-017

### Title

NVIDIA NIM API as the AI provider

### Category

AI

### Date

2026-06-26

### Problem

The application needs conversational AI to interpret chart data. Which provider?

### Decision

NVIDIA NIM API using `meta/llama-3.1-70b-instruct`. API key via `NVIDIA_API_KEY` environment variable.

### Rationale

- Mandated by CLAUDE.md: "The only external AI dependency should be NVIDIA APIs"
- NVIDIA NIM provides OpenAI-compatible API format — easy to switch models
- Server-side only (Next.js Edge API route) — API key never exposed to browser

### Security

The API key is read exclusively from `process.env.NVIDIA_API_KEY` in the server-side Edge route. It is never bundled into the client build.

---

## ADR-018

### Title

Next.js Edge Runtime for AI streaming route

### Category

Architecture

### Date

2026-06-26

### Problem

Streaming SSE responses from NVIDIA NIM require long-lived HTTP connections. Node.js runtime in Next.js has a default 30s timeout on Vercel/Netlify. Edge runtime has different constraints.

### Decision

Use `export const runtime = 'edge'` on the `/api/ai/chat` route.

### Rationale

- Edge runtime supports streaming `ReadableStream` natively
- No 30s timeout limitation for streaming routes
- Compatible with Netlify's edge function infrastructure
- The route uses only standard Web APIs (fetch, ReadableStream, TextEncoder) — no Node-specific APIs

### Consequences

- Static generation for that route is disabled (warning shown in build output — expected)
- Cannot use Node.js built-ins in this route (acceptable — we don't need them)

# Definition of Success

By the end of development, this file should explain every major architectural decision in LuckyRay.

A new senior engineer should be able to understand not only how the application works, but why it was designed that way.
