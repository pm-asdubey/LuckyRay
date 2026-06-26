# CODING_STANDARDS.md

# LuckyRay Coding Standards

## Purpose

This document defines the engineering standards for LuckyRay.

Every line of code should prioritize:

* Readability
* Maintainability
* Testability
* Simplicity
* Extensibility

Future contributors should be able to understand the codebase quickly.

---

# General Philosophy

Code is written once.

Read many times.

Optimize for future readability rather than cleverness.

Always prefer clarity over brevity.

---

# Technology Standards

Primary language:

TypeScript

Enable:

* strict mode
* no implicit any
* strong typing throughout

Avoid JavaScript where TypeScript is appropriate.

---

# File Organization

One responsibility per file.

Avoid files exceeding approximately 300–500 lines unless justified.

Group related functionality logically.

Separate:

* UI
* Business logic
* Calculations
* Utilities
* Storage
* AI

---

# Naming Conventions

Use descriptive names.

Good examples:

BirthDetailsForm

PlanetCard

calculateDrishti()

generateChart()

buildAIContext()

Avoid:

temp

helper

utils2

dataFinal

abc

Single-letter variables except simple loop indices.

---

# Functions

Functions should:

Do one thing.

Be easy to test.

Be deterministic where possible.

Prefer pure functions.

Avoid hidden side effects.

---

# Components

React components should:

Remain focused.

Avoid large monolithic components.

Move business logic into hooks or services.

UI components should primarily render data.

---

# State Management

Keep state as local as possible.

Avoid global state unless required.

Persist only necessary information.

Avoid duplicated state.

---

# Comments

Comment:

Why.

Not:

What.

Good comments explain reasoning.

Bad comments repeat the code.

Complex algorithms should include references to the underlying astrological rule or source.

---

# Error Handling

Handle errors explicitly.

Provide meaningful messages.

Avoid empty catch blocks.

Avoid swallowing exceptions.

Return structured errors where practical.

---

# Logging

Use structured logging.

Log:

Warnings

Recoverable errors

Unexpected failures

Never log:

API keys

Secrets

Personal user data unless necessary for debugging

---

# Type Safety

Prefer explicit interfaces.

Avoid `any`.

Use enums or string unions where appropriate.

Validate external data before use.

---

# Constants

Avoid magic values.

Store shared constants in dedicated modules.

Examples:

Planet names

House numbers

Aspect definitions

Nakshatra lists

Configuration values

---

# Reusability

If logic is duplicated:

Refactor.

Prefer composition over duplication.

---

# Dependency Management

Minimize dependencies.

Before adding a package:

Evaluate:

Maintenance

Community support

Bundle impact

License

Need

Prefer native solutions when practical.

---

# Performance

Avoid unnecessary renders.

Memoize only when justified.

Lazy-load large features.

Avoid premature optimization.

Profile before optimizing.

---

# Accessibility

Every interactive component should support:

Keyboard navigation

Visible focus

Semantic HTML

ARIA where appropriate

Accessible labels

---

# Styling

Prefer reusable design tokens.

Avoid inline styles unless justified.

Keep spacing, typography and colors consistent.

---

# Testing Expectations

Every critical module should be testable.

Write code that naturally supports unit testing.

Avoid tightly coupled implementations.

---

# Documentation

Every exported module should have clear documentation where the purpose is not obvious.

Complex calculations should reference the underlying Jyotish rule.

---

# Git Practices

Write meaningful commit messages.

Keep commits focused.

Avoid mixing unrelated changes.

Future contributors should understand project history.

---

# Security

Never hardcode secrets.

Never trust external input.

Validate all data entering the application.

Escape or sanitize where required.

Protect API keys through Netlify Functions.

---

# Refactoring

If better architecture becomes apparent during development:

Refactor.

Do not leave obvious architectural problems simply to preserve earlier decisions.

Update documentation when architecture changes.

---

# Code Review Checklist

Before considering work complete, verify:

* Builds successfully
* Lints cleanly
* Types pass
* Tests pass
* No duplicated logic
* No unused code
* No dead files
* No console debugging left behind
* Documentation updated

---

# Definition of Done

Code is complete only when it is:

Correct

Readable

Typed

Testable

Documented

Maintainable

Consistent with the rest of the project

Future-friendly

LuckyRay should feel like a professionally maintained open-source project rather than a prototype or hackathon submission.
