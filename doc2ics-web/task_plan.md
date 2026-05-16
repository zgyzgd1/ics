# AI/OCR Enhancement Task Plan

## Goal
Add optional AI large-model extraction and optional remote OCR service support while keeping the current browser-local pipeline as the default.

## Phases
- [x] Research similar open-source projects and patterns.
- [x] Inspect the current parsing, OCR, and event extraction pipeline.
- [x] Add typed recognition settings and tests.
- [x] Add AI event extraction using OpenAI-compatible chat APIs and JSON validation.
- [x] Add optional HTTP OCR adapter for higher-accuracy OCR services.
- [x] Connect settings into the worker pipeline and UI.
- [x] Extend ICS export for course timetables, calendar events, email-sourced schedules, reminders, and recurrence.
- [x] Compress AI recognition context before model calls to reduce token use and keep schedule clues.
- [x] Redact student names and IDs before preview, recognition, AI extraction, and export.
- [x] Validate the real timetable PDF without exposing private content in logs or chat.
- [x] Verify tests, build, and browser behavior.

## Decisions
- Keep local parsing and Chrono extraction as the baseline.
- AI extraction is opt-in and receives extracted text, not raw files.
- API keys are not persisted to disk or IndexedDB.
- Remote OCR uses a simple multipart endpoint so users can connect PaddleOCR, EasyOCR, or a custom service.
- Course timetable events export weekly recurrence, course metadata, alarms, and calendar categories.
- Email/calendar events export organizer, attendees, source email metadata, alarms, and categories.
- AI context compression deduplicates repeated lines and prioritizes date/time, course, location, email, meeting, and reminder clues.
- Student privacy redaction runs after document/OCR parsing and before event extraction so previews, AI prompts, and ICS descriptions share the same sanitized text.

## Errors Encountered
| Error | Resolution |
|---|---|
| None yet | N/A |
