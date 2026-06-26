# TESTING_STRATEGY.md

# LuckyRay Testing Strategy

## Purpose

Testing in LuckyRay is intended to ensure:

* Correct astrological calculations
* Stable AI prompt generation
* Reliable data persistence
* Consistent UI behavior
* Safe future refactoring

Testing should be treated as a first-class part of the product rather than a final development step.

---

# Testing Philosophy

Prioritize testing deterministic logic.

The highest priority is ensuring that identical birth details always produce identical chart calculations.

The AI may produce different wording between runs, but deterministic calculations must remain stable.

---

# Testing Pyramid

Priority order:

1. Unit Tests
2. Integration Tests
3. End-to-End Tests

Prefer many fast unit tests over a few large end-to-end tests.

---

# Unit Testing

Every deterministic function should have unit tests.

Examples:

* House calculations
* House lord calculations
* Drishti calculations
* Yoga detection
* Nakshatra calculations
* Dasha calculations
* Sign determination
* Planet dignity
* Strength calculations
* Context Builder
* Local storage helpers
* JSON schema validation

Target high coverage for calculation modules.

---

# Integration Testing

Verify interaction between modules.

Examples:

Birth Details

↓

Astronomy

↓

Jyotish Engine

↓

Canonical Schema

↓

Context Builder

↓

AI Request

↓

Response Rendering

Ensure information is not lost or transformed incorrectly.

---

# End-to-End Testing

Simulate real user journeys.

Minimum scenarios:

* Create a profile
* Enter birth details
* Generate a chart
* Ask a career question
* Ask a follow-up question
* Save and reopen the conversation
* Export data
* Import data

Run on desktop and mobile viewport sizes.

---

# Reference Charts

Maintain a library of reference birth charts.

For each chart verify:

* Planetary positions
* House assignments
* Nakshatras
* Dashas
* Yogas
* Drishtis

Use trusted external references for comparison where possible.

Store expected outputs in version control.

---

# Regression Testing

Every bug should result in a new automated test.

Prevent previously fixed issues from returning.

---

# AI Prompt Testing

Maintain a suite of representative prompts.

Categories:

* Career
* Education
* Marriage
* Relationships
* Finance
* Business
* Health
* Personality
* Dashas
* Transits
* General learning

Verify:

* Prompt assembly
* Required context inclusion
* Token efficiency
* Stable structure

The wording of AI responses may vary; focus on prompt construction and required evidence.

---

# Schema Testing

Validate:

* Serialization
* Deserialization
* Backward compatibility
* Version migrations
* Required fields
* Invalid data rejection

Malformed chart objects should never reach the AI.

---

# Storage Testing

Verify:

* Create
* Read
* Update
* Delete
* Export
* Import
* Backup
* Migration

Test with large numbers of profiles and conversations.

---

# Performance Testing

Measure:

* Initial application load
* Chart generation time
* Local database performance
* AI response latency
* Memory usage

Identify bottlenecks before optimizing.

---

# UI Testing

Verify:

* Responsive layouts
* Keyboard navigation
* Focus states
* Dark mode
* Form validation
* Error messages
* Loading states
* Empty states

Critical interactions should remain functional across screen sizes.

---

# Accessibility Testing

Verify:

* Keyboard-only navigation
* Screen reader labels where practical
* Color contrast
* Focus visibility
* Semantic HTML

Accessibility regressions should be treated as bugs.

---

# Error Handling Testing

Simulate:

* Invalid birth data
* Missing birth time
* Invalid coordinates
* AI timeout
* Network failure
* Corrupted local database
* Missing environment variables

The application should fail gracefully with helpful recovery guidance.

---

# Cross-Browser Testing

Verify support for modern versions of:

* Chrome
* Edge
* Safari
* Firefox

Also verify mobile browser compatibility where practical.

---

# Manual Testing Checklist

Before release, verify:

* Installation
* First launch
* Profile creation
* Chart generation
* AI conversation
* Saving
* Restarting application
* Data persistence
* Export/import
* Settings
* Responsive layouts

---

# Continuous Testing

Run automated tests before merging changes.

Type checking, linting and unit tests should pass before considering work complete.

---

# Success Metrics

The testing strategy should provide confidence that:

* Calculations remain correct.
* Refactoring does not introduce regressions.
* Data is preserved.
* The application behaves consistently.
* The user experience remains polished across supported devices.

Testing should enable rapid iteration without sacrificing reliability.
