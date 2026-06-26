# COMPONENT_LIBRARY.md

# LuckyRay Component Library

## Purpose

This document defines every reusable UI component within LuckyRay.

The objective is consistency.

Every screen should be built from reusable components.

Avoid one-off UI implementations.

If a UI pattern is repeated more than once, it should become a reusable component.

---

# Design Philosophy

Components should be:

* Elegant
* Minimal
* Accessible
* Responsive
* Reusable
* Consistent
* Fast

Every component should work on:

* Desktop
* Tablet
* Mobile Browser

---

# Global Layout

## App Shell

Contains:

* Top Navigation
* Main Content
* Optional Side Panel
* Toast Notifications
* Global Dialog Manager

Should support collapsing gracefully on mobile.

---

# Navigation

Desktop

* Logo
* Current Profile
* Navigation Links
* Settings

Mobile

* Bottom Navigation
* Hamburger Drawer (if required)
* Floating Profile Switcher

Navigation Items

* Home
* Profiles
* Charts
* Chat
* Settings

---

# Buttons

Types

Primary

Secondary

Ghost

Destructive

Icon Button

Loading Button

Every button supports:

Loading

Disabled

Hover

Focus

Keyboard

Touch

---

# Cards

Reusable card component.

Used for:

Charts

Planet Summary

House Summary

Yoga Summary

Predictions

Recent Chats

Recent Profiles

Cards should support:

Header

Body

Footer

Actions

Expandable state

---

# Dialogs

Reusable modal component.

Used for:

Create Profile

Edit Profile

Delete Confirmation

Settings

Exports

Dialogs should trap keyboard focus.

---

# Birth Details Form

One of the most important components.

Fields

Name

Optional.

Gender

Optional.

Date of Birth

Required.

Time of Birth

Required.

Birth Place

Searchable autocomplete.

Latitude

Automatically populated.

Longitude

Automatically populated.

Timezone

Automatically populated.

Editable if necessary.

Validation

Missing fields.

Invalid date.

Invalid coordinates.

Unknown location.

Future dates.

Actions

Generate Chart

Cancel

Save Profile

Future

Unknown Birth Time toggle (disabled for MVP but architecture should support it).

---

# Profile Card

Displays

Name

Birth Date

Birth Time

Location

Last Opened

Avatar (initials)

Actions

Open

Edit

Duplicate

Delete

---

# Chart Viewer

Displays

North Indian / South Indian chart (architecture should support multiple layouts).

Planet positions.

House numbers.

Interactive hover.

Clickable houses.

Clickable planets.

Zoom on mobile if required.

---

# Planet Card

Displays

Planet

Sign

House

Degree

Nakshatra

Pada

Retrograde

Combust

Exalted

Debilitated

Clicking opens full details.

---

# House Card

Displays

House Number

House Lord

Occupants

Key Themes

Clickable for detailed explanation.

---

# Yoga Card

Displays

Yoga Name

Detected / Not Detected

Explanation

Evidence

Importance

Expandable.

---

# Dasha Timeline

Visual timeline.

Displays

Current Mahadasha

Antardasha

Remaining duration

Upcoming transitions

Scrollable on mobile.

---

# AI Chat Interface

Primary interaction surface.

Supports

Streaming responses

Markdown

Lists

Tables

Expandable reasoning sections

Copy response

Regenerate response

Conversation history

Suggested follow-up questions

Future support

Voice

---

# Suggested Questions

After chart generation, provide contextual suggestions.

Examples

"Tell me about my career."

"What are my strengths?"

"Explain my Moon."

"What does my current dasha indicate?"

Suggestions should change based on the chart.

---

# Search Component

Reusable search.

Used for

Birth places

Profiles

Previous chats

Future chart search

Supports keyboard navigation.

---

# Loading Components

Skeleton cards.

Skeleton chat.

Skeleton chart.

Skeleton profile list.

Never show blank screens during loading.

---

# Empty States

Profiles

"No profiles yet."

Charts

"Generate your first chart."

Chat

"Ask your first question."

Each state should include a clear primary action.

---

# Error Components

Friendly error cards.

Retry buttons.

Recovery suggestions.

Never expose stack traces.

---

# Toast Notifications

Used sparingly.

Examples

Profile saved.

Chart generated.

Export complete.

Settings updated.

Errors.

Auto-dismiss unless important.

---

# Settings Screen

Supports

Theme

AI preferences (future)

Export

Import

Data management

About LuckyRay

Version

---

# About Screen

Contains

Application version

Credits

Open-source libraries

Privacy statement

License

---

# Responsive Behaviour

Desktop

Multi-column layouts.

Tablet

Adaptive layouts.

Mobile

Single-column layouts.

Cards stack vertically.

Dialogs become full-screen sheets where appropriate.

Chat remains fully usable.

No horizontal scrolling.

---

# Accessibility Requirements

Every component should support

Keyboard navigation

Visible focus state

Screen reader labels

Touch-friendly controls

Appropriate contrast

Semantic HTML

---

# Animation Guidelines

Fast

Subtle

Purposeful

Use motion to communicate:

Loading

Expansion

Navigation

Completion

Avoid decorative animations.

---

# Component Naming

Use consistent naming.

Examples

Button

Card

ProfileCard

PlanetCard

HouseCard

YogaCard

BirthDetailsForm

ChatMessage

ChartViewer

SettingsDialog

Avoid vague names.

---

# Future Components

Design architecture so future additions fit naturally.

Examples

Compatibility Viewer

Transit Dashboard

Voice Chat

Desktop Notifications

Offline AI Indicator

Daily Summary Widget

Custom Astrology School Selector

Do not require redesigning existing screens.

---

# Definition of Success

Every screen in LuckyRay should be composed almost entirely of reusable components.

The UI should feel cohesive regardless of how large the application grows.

A new engineer joining the project should immediately understand which components to reuse rather than creating new ones.
