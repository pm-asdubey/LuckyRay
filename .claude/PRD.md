# Product Requirements Document (PRD)

# LuckyRay

Version: 1.0

Status: MVP

---

# 1. Overview

LuckyRay is an AI-powered Vedic astrology (Jyotish) application that combines deterministic astrological calculations with conversational AI.

Unlike traditional astrology applications, LuckyRay separates:

* Astronomical calculations
* Jyotish calculations
* AI interpretation

This separation improves accuracy, explainability, maintainability and user trust.

The product should feel premium, calm and intellectually honest.

---

# 2. Product Goal

Allow a user to:

1. Create one or more birth profiles.
2. Generate highly accurate birth charts.
3. Understand their chart through conversational AI.
4. Explore different aspects of life through guided conversations.
5. Save charts and conversations locally.

---

# 3. Success Metrics

The MVP is considered successful if a user can:

* Create a profile in under 2 minutes.
* Generate a birth chart in under 5 seconds.
* Begin chatting immediately.
* Continue conversations naturally.
* Return later and continue where they left off.

The application should launch quickly and feel responsive throughout.

---

# 4. Target Users

Primary users:

* Professionals
* Entrepreneurs
* Executives
* Engineers
* Students
* Curious learners
* Astrology enthusiasts

Geographic focus:

* United States
* United Kingdom
* India

Language:

English only for MVP.

---

# 5. User Stories

## Profile Management

As a user,

I want to create multiple birth profiles,

so I can analyze myself and my family.

---

## Birth Chart

As a user,

I want to generate my complete chart,

so I can understand my planetary placements.

---

## AI Chat

As a user,

I want to ask natural language questions,

so I don't have to understand astrology terminology.

---

## Learning

As a beginner,

I want explanations in plain English,

so I can gradually learn Jyotish.

---

## Power User

As an advanced user,

I want detailed reasoning,

so I can verify the AI's conclusions.

---

# 6. MVP Features

## Included

Multiple local profiles

Birth details entry

Birth chart generation

Planet positions

House positions

Nakshatras

Dashas

AI Chat

Saved conversations

Saved charts

Responsive UI

Dark mode

Conversation history

Export chart (JSON)

Settings

---

## Explicitly Excluded

Accounts

Cloud sync

Payments

Subscriptions

Advertisements

Social features

Notifications

Marketplace

Astrologer booking

Live chat

Blog

SEO pages

Referral systems

---

# 7. Functional Requirements

The application shall:

* Accept complete birth details.
* Validate user input.
* Generate accurate charts.
* Calculate deterministic astrology.
* Present AI explanations.
* Save data locally.
* Resume previous conversations.
* Handle API failures gracefully.

---

# 8. Non-Functional Requirements

The application should be:

Fast

Responsive

Reliable

Accessible

Maintainable

Offline-capable where practical (except AI)

Strongly typed

Well documented

---

# 9. Core Screens

Landing

Profile Selection

Create Profile

Chart Dashboard

AI Chat

Chart Explorer

Settings

About

---

# 10. AI Capabilities

The AI should answer questions regarding:

Career

Education

Marriage

Relationships

Children

Finance

Business

Health

Strengths

Weaknesses

Dashas

Transits

General guidance

The AI should explain reasoning instead of only giving conclusions.

---

# 11. Error Handling

Invalid birth details

Missing birth time

API unavailable

Calculation failure

AI timeout

Local storage corruption

Each should present a clear recovery path to the user.

---

# 12. Privacy

No user accounts.

No cloud storage.

Profiles remain local.

Only the minimum data required for AI inference is transmitted.

---

# 13. Future Scope (Not MVP)

Voice conversations

Image-based chart sharing

Multi-language support

Compatibility analysis

Daily transit summaries

Push notifications

Desktop packaging

Offline AI models

Custom astrology schools

Plugin architecture

---

# 14. Definition of Success

A first-time user should be able to install LuckyRay, create a profile, generate a chart, ask meaningful questions, understand the answers, and return later to continue the conversation without needing any documentation.

The experience should feel polished, trustworthy, and premium from the first interaction.
