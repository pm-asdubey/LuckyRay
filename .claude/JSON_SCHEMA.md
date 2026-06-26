# JSON_SCHEMA.md

# LuckyRay Canonical JSON Schema

## Purpose

LuckyRay must maintain a single canonical chart schema.

Every module in the application should consume and produce this schema.

Never expose raw responses from astronomy libraries directly to the UI or AI.

If the astronomy provider changes in the future, only the adapter layer should require modification.

The remainder of the application should remain unaffected.

---

# Schema Design Principles

The schema should be:

* Stable
* Strongly typed
* Extensible
* Human-readable
* Provider-independent
* Versioned

Never break compatibility unnecessarily.

---

# Top-Level Structure

The canonical chart object should contain:

```json
{
  "version": "1.0",
  "profile": {},
  "birthDetails": {},
  "astronomy": {},
  "planets": [],
  "houses": [],
  "aspects": [],
  "conjunctions": [],
  "yogas": [],
  "doshas": [],
  "dashas": {},
  "divisionalCharts": {},
  "strengths": {},
  "transits": {},
  "metadata": {}
}
```

---

# Profile

Contains user information.

Fields

* id
* name
* gender (optional)
* createdAt
* updatedAt

Do not store unnecessary personal information.

---

# Birth Details

Contains:

* Date of birth
* Time of birth
* Birth place
* Latitude
* Longitude
* Timezone
* DST applied
* Source of coordinates

Birth details should never be modified during calculations.

---

# Astronomy

Contains raw astronomical information.

Examples

Julian Day

Ayanamsa

House system

Ephemeris version

Calculation timestamp

Library used

This section is for traceability.

---

# Planets

Every planet object should include:

Planet name

Longitude

Latitude (if available)

Sign

House

Degree

Minute

Nakshatra

Pada

Retrograde

Combust

Exalted

Debilitated

Own sign

Moolatrikona

Natural benefic/malefic

Functional benefic/malefic

Strength values

Friendships

Metadata

Avoid storing duplicate information.

---

# Houses

Each house should contain:

House number

House lord

Sign

Occupants

Themes

Aspects received

Strength

Additional metadata

---

# Aspects

Each aspect object should include:

Source planet

Target house

Target planet(s)

Aspect type

Aspect strength

Rule used

Supporting notes

Never require AI to determine aspects.

---

# Conjunctions

Each conjunction should include:

Participating planets

Orb

House

Sign

Interpretation metadata

---

# Yogas

Each yoga object should include:

Identifier

Name

Detected

Supporting evidence

Confidence

Reference

Calculation notes

Never store only a boolean.

Store why the yoga was detected.

---

# Doshas

Each dosha should contain:

Name

Detected

Supporting evidence

Confidence

Reference

Applicable interpretation school

---

# Dashas

Support:

Mahadasha

Antardasha

Pratyantar (where implemented)

Each should contain:

Start

End

Current

Remaining duration

Planet

Metadata

---

# Divisional Charts

Architecture should support:

D9

D10

Future Vargas

Each divisional chart should reuse the same internal schema as the birth chart where practical.

---

# Strengths

Store calculated strengths.

Examples:

Shadbala

House strength

Planet strength

Positional strength

Directional strength

This section should remain extensible.

---

# Transits

Current planetary positions.

Current transit influences.

Relevant active aspects.

Designed to support future daily updates.

---

# Metadata

Contains:

Schema version

Engine version

Calculation timestamp

Calculation duration

Warnings

Known assumptions

Library versions

Never mix user data with metadata.

---

# Validation

Every schema object should support runtime validation.

Reject invalid objects early.

Never allow malformed chart data to reach the AI.

---

# Versioning

Every schema version must be documented.

Future changes should be backward compatible where practical.

If breaking changes occur, increment the schema version.

---

# Serialization

The schema should be:

Serializable

Exportable

Importable

Human-readable

Suitable for backups

Suitable for future synchronization

---

# AI Context

The canonical schema should **not** be sent directly to the AI.

Instead:

Canonical Schema

↓

Context Builder

↓

Optimized AI Context

This reduces token usage while preserving correctness.

---

# Testing

Maintain sample canonical charts.

Validate:

Serialization

Deserialization

Migration

Import

Export

Schema validation

Future providers should be verified against the canonical schema.

---

# Definition of Success

Every module inside LuckyRay should speak the same language.

Regardless of which astronomy library or AI provider is used, the canonical schema should remain the single source of truth for all chart data throughout the application.
