# Kundli Milan Framework — Implementation Plan

## Goal
Build a matchmaking module that computes a deterministic compatibility analysis from two charts, then lets the user optionally generate an AI narrative report. The engine must be testable, reproducible, and clearly separate from the AI interpretation layer.

---

## Core principle
**Code computes scores and flags. AI writes the narrative.**

The deterministic engine returns:
- A per-dimension score (0–100).
- A composite score and verdict.
- A list of strengths, risks, and hard filters with evidence.
- Raw chart snippets the AI can cite.

The AI report consumes this structure. It does not recompute or override the numbers.

---

## Deterministic dimensions

### 1. Emotional compatibility — Moon (25%)
- Ashtakoot Moon score (0–36) mapped to 0–100.
- Moon sign-lord friendship.
- Moon-Moon house relationship:
  - 1/5/9 signs apart → excellent
  - 3/11 → good
  - 6/8/12 → tense
  - same sign → neutral
- D9 Moon strength / dignity.

### 2. Romantic chemistry — Venus & Mars (15%)

#### Venus–Venus calculation
- Same sign → stable values, possible lack of polarity → **70/100**.
- Trine (1/5/9 signs apart) or same element → **85–95/100**.
- Sextile / 3/11 → **70–80/100**.
- Square (4/10) → **45–60/100**.
- Opposition (7) → **40–55/100** (attraction but friction).
- 6/8/12 (shad-ashtak) → **20–35/100**.
- Bonus:
  - Venus sign lords are natural friends → +10
  - Both Venus dignified (own/exalted/moolatrikona/friendly) → +10
- Penalty:
  - Saturn or Rahu aspect on either Venus → −10
  - Debilitated Venus → −15

#### Mars–Venus cross-dynamics
- One person’s Mars aspects/trines the other’s Venus → strong chemistry.
- Both Mars in harmony → passion without constant conflict.
- Mars–Mars square/opposition → power struggles.

### 3. Marriage structure — 7th house & lord (20%)
- Relationship between the two 7th lords:
  - Natural friendship of lords
  - Same element
  - Sign distance (trine/sextil/square/opposition)
- 7th house occupants cross-impact.
- Saturn influence on 7th house/lord → stability but possible delay.
- D9 ascendant/lord compatibility (Navamsa is the post-marriage chart).

### 4. Temperament & conflict — Mars, Gana, Mercury (10%)
- Gana match from Ashtakoot (Deva–Deva best, Rakshasa–Deva hardest).
- Mars dignity and house placement relative to partner’s Moon/Venus.
- Mercury–Mercury compatibility (communication styles).
- Hard aspects from malefics to partner’s Moon/Venus/7th lord.

### 5. Dasha timing alignment (10%)
- Compare current Mahadasha/Antardasha of both.
- High score when both are in stable/benefic periods.
- Flag when both are simultaneously in 6/8/12 dashas.
- Surface upcoming windows where both activate 5th/7th/11th houses.

### 6. Doshas & hard filters (10%)

#### Manglik
- Both have similar Manglik score → supports marriage (mutual resonance; cancellation by similarity).
- One Manglik, one not → risk, flag for remedy/counseling.
- Both non-Manglik → neutral/good.

#### Nadi
- Flag Nadi dosha when present.
- **Not a blocker.** Apply standard cancellations:
  - Same Moon sign but different nakshatra → cancelled.
  - Same nakshatra but different Moon sign → cancelled.
  - Different nadis → no dosha.

#### Varna
- Use standard Ashtakoot Varna scoring.
- Flag mismatch but treat as one factor among many, not a hard blocker.

#### Bhakoot
- Flag Bhakoot dosha (6/8 or 12/2 Moon signs).
- Downgrade score; note traditional exceptions if any.

### 7. Individual strength (10%)
- Per-person mini score from:
  - Moon strength
  - Venus strength
  - 7th lord dignity
  - Navamsa ascendant strength
  - Current dasha stability
- Used as a damping factor:
  ```
  Final = Compatibility × 0.70 + AvgIndividual × 0.30
  ```

---

## Composite score & verdict

```
Compatibility = Σ(dimensionScore × weight)   // 0–100
Final         = Compatibility × 0.70 + AvgIndividual × 0.30
```

Verdict:
- 9.0+ Exceptional
- 8.5+ Excellent
- 8.0+ Strong
- 7.5+ Good
- 7.0+ Conditional
- 6.0+ Weak
- <6.0 No-Go

Hard filters can force a lower verdict even if the raw score is high.

---

## UI flow

1. **Matchmaking page**
   - Select Boy’s Kundli (profile + latest chart).
   - Select Girl’s Kundli (profile + latest chart).
   - Button: **Analyze Match**.
   - Result shown as a tabbed screen:
     - Summary (score, verdict, top strengths/risks)
     - Ashtakoot (koota breakdown)
     - Chemistry (Venus/Mars)
     - Marriage Structure (7th house, D9)
     - Timing (dasha alignment)
     - AI Report (optional, streamed on request)

2. **AI Report button**
   - Only enabled after deterministic analysis.
   - Sends the pre-computed result + chart context to the AI.
   - Returns narrative sections: Love, Attraction, Compatibility, Conflict Resolution, Timing, Practical Life.

---

## Implementation outline

### Engine
- `packages/jyotish/src/milan/index.ts`
  - `computeCompatibility(chartA, chartB)`
- `packages/jyotish/src/milan/dimensions/`
  - `emotional.ts`, `romantic.ts`, `marriage.ts`, `conflict.ts`, `timing.ts`, `doshas.ts`, `individual.ts`
- `packages/jyotish/src/milan/rules.ts` — weights, verdict thresholds, cancellation rules.
- `packages/jyotish/src/milan/__tests__/compatibility.test.ts`

### Shared types
- `packages/shared/src/types/chart.ts`
  - `CompatibilityResult`
  - `CompatibilityDimension`
  - `CompatibilityVerdict`
  - `CoupleDashaWindow`

### Storage
- `packages/storage/src/matches.ts` — save/load match analyses.
- `packages/storage/src/db.ts` — `matches` object store keyed by `id`, indexes by `profileAId`, `profileBId`, `createdAt`.

### AI
- `packages/ai/src/compatibility-prompt.ts` — system prompt that consumes deterministic scores.
- `packages/ai/src/context-builder.ts` — `buildCompatibilityContext(result)`.

### UI
- `apps/web/src/app/milan/page.tsx` — profile selector.
- `apps/web/src/app/milan/[profileAId]/[profileBId]/page.tsx` — results tabs.
- Add `/milan` to navigation.
- Deprecate `/matchmaking` and `/guna-milan` (redirect later).

---

## Notes on deterministic judgment

- **Venus–Venus**: use sign distance + element + lord friendship + dignity/aspects. No AI needed.
- **Manglik**: similarity is compatibility; disparity is risk.
- **Nadi**: always flagged, never a hard blocker; cancellations are checked.
- **Varna**: standard Ashtakoot rule, not a special blocker.
