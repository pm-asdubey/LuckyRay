# API_CONTRACTS.md

# LuckyRay API Contracts

## Purpose

LuckyRay follows an API-first design philosophy.

Every interaction between major systems should be treated as a contract.

Even internal modules should communicate through stable, well-defined interfaces.

This minimizes coupling and makes future replacement of individual modules significantly easier.

---

# API Design Principles

Every API should be:

* Predictable
* Strongly typed
* Versioned
* Well documented
* Minimal
* Stable

Never expose raw third-party responses directly.

Always normalize external responses.

---

# External APIs

The MVP should minimize external dependencies.

Primary external services:

* NVIDIA AI API
* Optional geocoding / timezone lookup

The astronomy engine should rely on local libraries rather than commercial APIs wherever practical.

---

# Internal Flow

```text
UI
↓

Application Controller

↓

Jyotish Engine

↓

Context Builder

↓

Netlify Function

↓

NVIDIA API

↓

Application

↓

UI
```

The UI should never communicate directly with NVIDIA.

---

# Netlify Functions

Purpose:

* Hide API keys
* Normalize AI responses
* Handle retries
* Centralize AI configuration

Business logic should remain inside the application.

---

# AI Request

Input should include:

* Question
* Optimized chart context
* Conversation history
* Prompt version

The client should never send unnecessary chart data.

---

# AI Response

Response should contain:

* Generated answer
* Optional reasoning metadata
* Usage information (if available)
* Errors (structured)

Streaming should be supported where available.

---

# Chart Generation Interface

Input:

Birth Details

Output:

Canonical Chart Schema

Errors should include structured information rather than generic messages.

---

# Context Builder Interface

Input:

Canonical Chart

User Question

Conversation

Output:

Optimized AI Context

This layer should remain independent of the AI provider.

---

# Local Storage Interface

Supported operations:

Create Profile

Update Profile

Delete Profile

List Profiles

Load Profile

Save Chart

Load Chart

Save Conversation

Load Conversation

Delete Conversation

Import

Export

---

# Error Format

Every API should return a consistent structure.

Recommended fields:

Success

Data

Error Code

Message

Details

Timestamp

Errors should be understandable by both humans and machines.

---

# Error Categories

Validation

Calculation

Storage

Network

AI

Configuration

Unexpected

These categories should remain consistent throughout the application.

---

# Validation

Validate:

Input

Output

Schema

Required fields

Reject malformed requests early.

---

# Versioning

Every external contract should support versioning.

Future changes should avoid breaking compatibility.

---

# Streaming

AI responses should stream whenever supported.

The UI should progressively render content.

Avoid waiting for the full response before displaying output.

---

# Timeouts

Every external request should define:

Connection timeout

Read timeout

Retry policy

Maximum retries

Graceful fallback

Avoid infinite retries.

---

# Retry Strategy

Retry only transient failures.

Do not retry:

Validation errors

Malformed requests

Authentication failures

Retry:

Temporary network failures

Rate limits

Provider timeouts

using exponential backoff.

---

# Security

Never expose:

API keys

Secrets

Environment variables

Internal configuration

Validate all incoming data before processing.

---

# Logging

Log:

Request ID

Duration

Provider

Errors

Avoid logging personal birth data unless necessary for debugging.

Never log secrets.

---

# Future APIs

The architecture should naturally support future additions such as:

Voice interface

Offline AI

Desktop packaging

Compatibility analysis

Daily transit generation

Plugin system

without changing existing contracts.

---

# Documentation

Every API should include:

Purpose

Input

Output

Error conditions

Examples

Version history

Known limitations

---

# Definition of Success

Every boundary in LuckyRay should behave like a stable public API.

Individual systems should be replaceable with minimal impact because all communication follows clearly documented contracts rather than implicit assumptions.
