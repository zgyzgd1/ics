# AI/OCR Enhancement Findings

## External References
- Docling supports broad document parsing, OCR, JSON/Markdown export, and VLM pipelines.
- LiteParse is the closest browser-oriented reference: PDF.js text extraction, built-in Tesseract.js, and optional HTTP OCR servers such as EasyOCR or PaddleOCR.
- Data Wizard and LLMAIx demonstrate schema-guided LLM extraction into validated JSON.
- Chrono remains suitable as the local deterministic date parser.

## Local Code
- `src/core/workers/parsePipeline.ts` is the best insertion point for OCR and AI enhancement.
- `src/core/ocr/tesseractOCR.ts` already renders scanned PDFs and runs Tesseract.js.
- `src/core/extractor/eventExtractor.ts` produces baseline events with confidence values.
- `src/store/appStore.ts` holds UI state and can keep non-persistent AI/OCR settings.
- `src/core/generator/icsGenerator.ts` is the export boundary for recurrence, alarms, categories, organizer, attendees, and custom metadata.
- `src/components/EventTable.tsx` is the lightest UI surface for correcting course/email/calendar metadata before ICS download.
