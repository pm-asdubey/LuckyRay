# JYOTISH_ENGINE.md

# LuckyRay Jyotish Engine Specification

## Purpose

The Jyotish Engine is the heart of LuckyRay.

It is responsible for every deterministic astrological calculation performed by the application.

The AI must **never** perform calculations that can be computed deterministically.

The Jyotish Engine produces a complete, normalized chart object that becomes the single source of truth for every downstream system.

---

# Philosophy

Separate astrology into three independent layers:

## Layer 1 — Astronomy

Determines where celestial bodies are.

Examples:

* Planetary longitudes
* Ascendant
* House cusps
* Sidereal calculations

This layer should use an established astronomical library.

Preferred order of evaluation:

1. Swiss Ephemeris
2. pyswisseph
3. Flatlib
4. VedAstro (evaluate where beneficial)

Do not attempt to write astronomical calculations from scratch.

---

## Layer 2 — Jyotish Calculation Engine

Consumes astronomical data.

Calculates every deterministic rule.

Outputs normalized structured data.

This is the core intellectual property of LuckyRay.

---

## Layer 3 — AI

Consumes the normalized chart.

Provides explanations.

Never performs calculations.

Never contradicts supplied chart data.

---

# Responsibilities

The Jyotish Engine owns every deterministic astrology calculation.

Nothing outside this engine should calculate astrology.

---

# Input

Required:

* Date of birth
* Time of birth
* Latitude
* Longitude
* Timezone

Optional:

* Birth place name
* User-selected ayanamsa (future)

---

# Astronomy Output

The astronomy layer should provide:

* Planetary longitude
* Planet speed
* Retrograde status (if available)
* Ascendant
* House cusps
* Sidereal positions
* Ayanamsa
* Julian Day
* Sunrise/Sunset where required

---

# Required Calculations

The engine should calculate at minimum:

## Signs

* Rashi
* Sign lord
* Element
* Modality

---

## Houses

* House number
* House lord
* Occupants
* Empty houses

---

## Planets

For each planet calculate:

* Sign
* House
* Degree
* Minute
* Nakshatra
* Pada
* Longitude
* Retrograde
* Combustion
* Exaltation
* Debilitation
* Moolatrikona
* Own sign
* Friendly sign
* Enemy sign
* Neutral sign

---

# Planet Relationships

Determine:

Natural friendships

Temporary friendships

Compound friendships

Planetary dignity

Functional benefics

Functional malefics

Marakas

Yoga karakas

---

# Aspects (Drishtis)

This module should **not** rely on AI.

Implement deterministic calculations.

At minimum support:

General 7th aspect.

Special aspects including:

Mars

Jupiter

Saturn

Rahu/Ketu according to the chosen interpretation.

Document the chosen interpretation and make it configurable in future.

For every aspect calculate:

* Source planet
* Target house
* Target planets
* Aspect strength (where applicable)

---

# Conjunctions

Detect conjunctions.

Store:

* Participating planets
* Orb
* House
* Significance

---

# Dashas

Implement:

Vimshottari Dasha.

Calculate:

* Mahadasha
* Antardasha
* Pratyantar Dasha (where practical)

Provide:

Current period

Next period

Start dates

End dates

Remaining duration

---

# Nakshatras

Calculate:

* Nakshatra
* Pada
* Nakshatra lord

---

# Divisional Charts

Research and implement where practical:

D9 (Navamsa)

D10 (Dashamsa)

Design architecture so additional Vargas can be added later.

---

# Yogas

Detect common yogas programmatically.

Examples include:

* Gajakesari Yoga
* Raja Yoga
* Neechabhanga Raja Yoga
* Vipareeta Raja Yoga
* Dharma-Karma Adhipati Yoga
* Chandra-Mangal Yoga
* Budha-Aditya Yoga
* Parivartana Yoga
* Vasumati Yoga
* Adhi Yoga

Research and document:

* Exact rule
* Source reference
* Confidence

Do not hardcode assumptions without documentation.

---

# Doshas

Where deterministic rules exist, detect:

* Manglik
* Kala Sarpa
* Pitru Dosha (if supported)
* Other commonly accepted doshas

Document differing schools of interpretation.

---

# Planet Strength

Research and calculate where practical:

* Shadbala (if feasible)
* Positional strength
* Directional strength
* House strength

Design for extensibility even if not all calculations are implemented in MVP.

---

# Normalized Chart

The engine should output a single normalized chart object.

Every downstream system consumes this object.

Never expose raw library responses directly.

The normalized schema should remain stable even if the underlying astronomy library changes.

---

# Accuracy

Correctness is more important than speed.

Validate calculations using:

* Open-source references
* Well-known astrology software
* Published examples

Where multiple schools disagree:

Document the chosen implementation.

---

# Extensibility

Every calculation should be modular.

Adding:

* New yogas
* New dashas
* New astrology schools

should not require rewriting existing modules.

---

# Testing

Every deterministic calculation should have unit tests.

Examples:

* House lord calculation
* Drishti calculation
* Yoga detection
* Dasha generation
* Nakshatra calculation
* Retrograde detection

Include reference charts for validation.

---

# Documentation

Every calculation module should include:

* Description
* Formula or rule
* Source reference
* Assumptions
* Known limitations

This documentation should make the engine understandable without reading the implementation.

---

# Research Requirements

Before implementing any calculation:

Research authoritative sources.

Compare multiple interpretations where they differ.

Document the selected implementation.

Avoid undocumented shortcuts.

---

# Definition of Success

The Jyotish Engine should become an independent, reusable library that can power not only LuckyRay but any future Vedic astrology application.

Its outputs should be deterministic, testable, documented, and independent of any AI model.
