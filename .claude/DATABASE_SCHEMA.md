# DATABASE_SCHEMA.md

# LuckyRay Local Database Schema

## Purpose

LuckyRay is a local-first application.

For the MVP, there is no cloud database and no user authentication.

All user data should be stored locally using SQLite (preferred) or an equivalent local database supported by the chosen framework.

The database should be designed so that cloud synchronization can be added later without requiring major schema changes.

---

# Design Principles

The database should be:

* Normalized where practical
* Easy to migrate
* Easy to export
* Easy to back up
* Versioned
* Human understandable

Avoid storing duplicated data.

---

# Database Version

Maintain a schema version.

Every migration should be documented.

Future migrations should preserve user data whenever possible.

---

# Tables

The MVP should include the following logical tables.

---

# Profiles

Purpose

Stores one record for each birth profile.

Fields

* id
* name
* gender (optional)
* birthDate
* birthTime
* birthPlace
* latitude
* longitude
* timezone
* notes (optional)
* createdAt
* updatedAt

A user may create multiple profiles.

Examples:

* Self
* Spouse
* Child
* Friend

---

# Charts

Purpose

Stores generated canonical chart objects.

Fields

* id
* profileId
* schemaVersion
* chartJson
* generatedAt
* engineVersion

Store the canonical JSON schema rather than provider-specific data.

Each chart belongs to one profile.

---

# Conversations

Purpose

Stores AI conversations.

Fields

* id
* profileId
* title
* createdAt
* updatedAt

Conversation titles may be AI-generated or user-edited.

---

# Messages

Purpose

Stores individual chat messages.

Fields

* id
* conversationId
* role
* content
* createdAt

Supported roles:

* User
* Assistant
* System (internal)

Messages should remain ordered chronologically.

---

# Settings

Purpose

Stores local application preferences.

Fields

* key
* value

Examples:

Theme

Preferred chart style

AI model

Animation preference

Debug mode

Future language preference

---

# Prompt Versions

Purpose

Tracks prompt revisions used for AI conversations.

Fields

* version
* description
* createdAt

Allows future prompt experimentation while preserving reproducibility.

---

# Recent Activity

Purpose

Stores lightweight activity history.

Examples:

Recently opened profile

Recently viewed chart

Recent conversation

Used only for improving UX.

---

# Cache

Purpose

Temporary storage.

Examples:

Geocoding results

Timezone lookups

Reusable calculations

Cached AI metadata

The cache should be safe to clear.

---

# Relationships

Profiles

↓

Charts

Profiles

↓

Conversations

Conversations

↓

Messages

Settings remain independent.

---

# Indexing

Create indexes for:

Profile ID

Conversation ID

Created At

Updated At

Frequently queried fields

Avoid unnecessary indexes.

---

# Data Integrity

Every table should enforce:

Primary keys

Foreign keys

Referential integrity

Required fields

Validation

Reject invalid records early.

---

# Export

Support exporting:

Single profile

Single chart

Single conversation

Entire database

Preferred formats:

JSON

Future support:

Encrypted backups

---

# Import

Allow importing previously exported LuckyRay data.

Validate schema versions before importing.

Provide migration support where practical.

---

# Deletion

Support:

Delete profile

Delete chart

Delete conversation

Delete all data

Provide confirmation dialogs for destructive actions.

Never delete data silently.

---

# Storage Limits

The MVP should comfortably support:

Thousands of profiles

Thousands of conversations

Large chart histories

Without noticeable performance degradation.

---

# Privacy

Everything remains local.

No telemetry.

No analytics.

No remote database.

No hidden uploads.

The user owns their data.

---

# Future Compatibility

The schema should support future additions without major redesign.

Examples:

Cloud sync

Multiple devices

Offline AI

Voice conversations

Compatibility reports

Timeline predictions

Notifications

Attachments

Do not require schema rewrites.

---

# Testing

Test:

Create

Read

Update

Delete

Export

Import

Migration

Backup

Recovery

Large datasets

Database corruption recovery where practical.

---

# Definition of Success

The local database should feel invisible to the user.

It should reliably preserve every profile, chart, and conversation while remaining fast, portable, and future-proof.

A user should be able to move to another computer simply by exporting and importing their LuckyRay data.
