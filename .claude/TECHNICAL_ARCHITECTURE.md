# TECHNICAL_ARCHITECTURE.md

# LuckyRay Technical Architecture

## Purpose

This document defines the technical architecture of LuckyRay.

The architecture should prioritize:

* Maintainability
* Extensibility
* Deterministic calculations
* Separation of concerns
* Clean abstractions
* High performance
* Local-first data storage

The architecture should support years of future development without requiring significant rewrites.

---

# Architectural Philosophy

LuckyRay should be built as several independent systems that communicate through clearly defined interfaces.

Never mix responsibilities.

Never allow AI to become business logic.

Never place calculation logic inside UI components.

Every module should have a single responsibility.

---

# High-Level Architecture

```
Frontend (Next.js)

↓

Application Layer

↓

Astronomy Engine

↓

Jyotish Engine

↓

AI Context Builder

↓

AI Engine

↓

Presentation Layer
```

Each layer should communicate only with adjacent layers.

---

# Core Architecture Principles

## 1. UI Knows Nothing About Astrology

UI components should display data.

They should never calculate:

* aspects
* yogas
* house ownership
* strengths
* dashas

All calculations belong in dedicated modules.

---

## 2. AI Knows Nothing About Astronomy

The AI never calculates.

It never derives planetary positions.

It never guesses aspects.

It only interprets supplied chart data.

---

## 3. Jyotish Engine Owns All Astrology

Every deterministic rule belongs inside the Jyotish Engine.

No other module should duplicate astrological calculations.

---

# Suggested Folder Structure

```
apps/
    web/

packages/

    astronomy/

    jyotish/

    ai/

    shared/

    ui/

    storage/

    utils/

docs/

tests/

scripts/
```

Each package should remain independently testable.

---

# Frontend

Technology:

* Next.js
* TypeScript
* Tailwind CSS

Requirements:

* Responsive
* Accessible
* Dark mode
* Keyboard friendly
* Fast rendering

Prefer:

Server Components where appropriate.

Client Components only when interaction is required.

---

# State Management

Prefer simple state.

Use:

* React Context
* Zustand (if complexity grows)

Avoid Redux unless clearly justified.

Persist only necessary state.

---

# Local Storage

Store locally:

Profiles

Charts

Conversations

Settings

Recent prompts

Application preferences

Never require authentication.

---

# Networking

Only external services:

NVIDIA AI

Optional timezone/geocoding services if required.

Avoid unnecessary external APIs.

---

# Netlify Functions

Purpose:

Protect API keys.

Responsibilities:

* Proxy NVIDIA requests
* Validate requests
* Handle retries
* Normalize responses

Netlify functions should never contain astrology logic.

---

# Astronomy Engine

Responsible only for:

* Julian Day
* Planetary positions
* House cusps
* Ascendant
* Sidereal calculations
* Ephemeris integration

Outputs:

Raw astronomical data.

Nothing more.

---

# Jyotish Engine

Consumes astronomy output.

Calculates:

* Houses
* Lords
* Yogas
* Drishtis
* Dashas
* Conjunctions
* Functional benefics
* Strengths

Produces:

Normalized chart object.

---

# AI Context Builder

Consumes:

Normalized chart.

Produces:

Optimized AI context.

Responsibilities:

* Remove redundant information
* Organize facts
* Reduce token usage
* Preserve accuracy

This layer exists solely to prepare high-quality prompts.

---

# AI Engine

Receives:

System Prompt

Chart Context

Conversation History

User Question

Produces:

Natural language response.

Never modifies chart data.

---

# Error Handling

Every module returns structured results.

Avoid exceptions for expected failures.

Prefer:

```
Success

or

Failure
```

with detailed error information.

---

# Logging

Separate:

Debug logs

Warnings

Errors

Avoid excessive console output.

Never log secrets.

---

# Configuration

Environment variables only.

Never hardcode:

API keys

URLs

Secrets

Environment-specific settings

Provide `.env.example`.

---

# Performance Goals

Initial load under 2 seconds.

Chart generation under 5 seconds.

AI response streaming.

Lazy-load large components.

Code split where beneficial.

Avoid unnecessary dependencies.

---

# Accessibility

Keyboard navigation.

Semantic HTML.

Visible focus states.

Proper labels.

Screen reader compatibility where practical.

WCAG AA color contrast.

---

# Security

Validate all external responses.

Sanitize user input.

Protect API keys.

Avoid client-side secrets.

Do not trust third-party responses blindly.

---

# Testing

Every major package should include tests.

Focus on:

Calculation correctness

Normalization

Prompt generation

Storage

Utilities

Critical UI components

---

# Documentation

Every package should include:

README

Public API documentation

Architecture notes where needed

Complex algorithms should include explanatory comments and references.

---

# Future Scalability

The architecture should allow future addition of:

Voice interface

Offline AI

Desktop packaging

Mobile app

Additional astrology systems

Plugin architecture

Cloud synchronization

These additions should require minimal modification to existing code.

---

# Definition of a Good Architectural Decision

A good decision is one that:

* simplifies future development
* improves correctness
* reduces duplication
* increases maintainability
* keeps modules independent
* minimizes technical debt
* supports long-term product evolution

Architecture should always optimize for clarity over cleverness.
