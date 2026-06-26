# REFERENCES.md

# LuckyRay References

## Purpose

This document defines the preferred technical, design and astrological references for LuckyRay.

Claude should use these references while researching, implementing and validating the application.

Where multiple references disagree, document the differences and choose the implementation that best aligns with the goals of LuckyRay.

Never blindly copy any single implementation.

Research.

Compare.

Document.

Implement.

---

# Order of Trust

When researching technical implementation:

1. Official Documentation
2. Academic Sources
3. Well-maintained Open Source Projects
4. RFCs / Standards
5. Highly regarded engineering blogs

Avoid relying on:

Random blog posts

Low-quality tutorials

Copy-pasted StackOverflow snippets

Unmaintained repositories

---

# UI / UX References

Study the quality and interaction patterns of:

Linear

Raycast

Notion

Arc Browser

Apple Human Interface Guidelines

Material Design 3 (for accessibility guidance, not visual identity)

Extract ideas.

Do not copy designs.

---

# Frontend

Primary references:

Next.js Documentation

React Documentation

TypeScript Documentation

Tailwind CSS Documentation

Follow current best practices.

---

# State Management

Research before choosing.

Prefer simplicity.

Evaluate:

React Context

Zustand

Jotai

Document why the selected option was chosen.

---

# Astronomy

Primary research targets:

Swiss Ephemeris

pyswisseph

Flatlib

VedAstro

Compare:

Accuracy

Maintenance

Documentation

Community

License

Ease of integration

Choose the strongest long-term solution.

---

# AI

Primary provider:

NVIDIA API

Research:

Streaming

Context windows

Model selection

Prompt optimization

Rate limits

Retry strategies

Token optimization

Future-proof the AI abstraction layer.

---

# Vedic Astrology

Research authoritative sources for:

Parashara

Vimshottari Dasha

Nakshatras

House ownership

Planetary aspects

Planetary dignity

Yogas

Doshas

Strength calculations

Where schools differ:

Document the chosen interpretation.

Never silently choose one.

---

# Open Source Projects

Research high-quality open-source projects for ideas.

Learn architecture.

Do not copy code blindly.

Use them to understand patterns.

Always verify licenses.

---

# Engineering

Follow modern engineering practices.

Research:

Clean Architecture

Domain Driven Design (where beneficial)

SOLID Principles

Composition over inheritance

Modular monolith architecture

Do not over-engineer.

---

# Accessibility

Reference:

WCAG 2.2

ARIA guidance

Semantic HTML

Keyboard navigation

Accessibility is a core product requirement.

---

# Performance

Research:

Code splitting

Lazy loading

Bundle optimization

Caching

Streaming

Rendering strategies

Prefer measurable improvements over premature optimization.

---

# Testing

Reference modern testing practices.

Focus on:

Deterministic calculation testing

Integration testing

End-to-end testing

Regression prevention

---

# Security

Research:

Environment variable management

Serverless security

Input validation

API proxy design

Data privacy

Never expose secrets.

---

# Documentation

Documentation should be written as if LuckyRay were a mature open-source project.

Every important architectural decision should be understandable without reading source code.

---

# Research Expectations

Claude should actively research before implementing complex systems.

Research should answer:

What are the available options?

What are the trade-offs?

Which solution best aligns with LuckyRay?

Why?

Document significant findings in the Decision Log.

---

# Continuous Improvement

If better libraries, architectures or implementation approaches are discovered during development:

Evaluate them.

Compare them.

Document them.

Adopt them if they materially improve the project.

Avoid changing architecture without justification.

---

# Final Principle

LuckyRay should not simply become another AI wrapper around astrology.

It should become a thoughtfully engineered, technically rigorous, beautifully designed application that combines deterministic Jyotish with modern AI in a transparent and trustworthy manner.

Every implementation decision should move the project closer to that goal.