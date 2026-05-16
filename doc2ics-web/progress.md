# AI/OCR Enhancement Progress

## 2026-05-15
- Researched similar open-source projects and patterns.
- Inspected local parser, OCR, worker, store, and UI structure.
- Created this lightweight plan for the implementation pass.
- Added failing tests for AI JSON normalization, remote OCR payload parsing, and AI event merging.
- Verified the new tests fail because the implementation is missing or not yet connected.
- Implemented recognition settings, AI event extraction, remote OCR response handling, worker message passing, and the Home page enhancement panel.
- Verified `npm test` passes with 7 test files and 13 tests.
- Verified `npm run build` completes successfully.
- Verified the browser shows the enhancement panel, reveals AI/OCR fields on interaction, and logs no console errors.
- Verified `npm run lint` completes successfully.
- Added tests for course timetable ICS export with weekly recurrence, reminders, categories, and course metadata.
- Added tests for email/calendar-sourced ICS export with organizer, attendees, source email, and multiple reminders.
- Extended AI JSON parsing so model output can preserve event type, recurrence, reminders, course metadata, organizer, attendees, and source email.
- Added event editor fields for event type, reminders, course repetition/teacher/weeks, organizer, attendees, and source email.
- Verified targeted ICS/AI tests, production build, and lint after the ICS adaptation changes.

## 2026-05-16
- Added AI context compression before model requests to deduplicate repeated text and keep high-value schedule clues.
- Added a focused test for long noisy context containing course, meeting, location, and email signals.
- Updated the enhancement panel copy to tell users AI recognition compresses long document context before extraction.
