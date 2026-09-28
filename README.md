# Сорьц — Laboratory ERP demo

A Mongolian, frontend-only laboratory workspace for management presentations. Built with Next.js 16 App Router, TypeScript, Tailwind CSS, React Hook Form, Zod, Zustand, Recharts, and Lucide. No API, database, authentication, server actions, or cloud services.

## Run

Requires Node.js 20.9+ and npm.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:3100. On Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`. Port 3100 is used instead of the Next.js default 3000, since 3000 is commonly reserved by other local services (e.g. Grafana) on Windows; override with `npm run dev -- --port <n>` if 3100 is also unavailable.

```sh
npm run typecheck
npm run lint
npm run build
npm start
```

The production build exports static HTML/CSS/JS to `out/`. `npm start` serves those files; it does not run an application backend. The application has no runtime network dependency beyond its own static files.

## Demo screens

- `/`: clickable metrics, actual record-derived chart, specimen schedules, daily tasks, and alerts.
- `/samples/`: search, six filters, pagination, CSV export, validated registration, specimen/photo details, 3/7/28-day timeline, valid QR labels, and related results.
- `/tests/`: result filtering, inspection, approval, and printable measurement records.
- `/forms/`: six three-step forms: Матл-03, Матл-13, Матл-17, sand, aggregate, and cement. Validation, calculations, draft restoration, image previews, confirmed reset, and working saves.
- `/equipment/`: ten illustrated instruments, operating instructions, persistent checklists, calibration/inspection history, and guided steps with a timer and completion review.
- `/standards/`: searchable method summaries linking to the relevant instrument and form.
- `/reports/`: five A4 report types, date/material filters, and browser printing / Save as PDF.

The header includes global sample search (`Ctrl/Cmd + K`), persistent notification read state, and a demo profile. On tablet/mobile the sidebar becomes a drawer.

## Data and persistence

- `src/data/mock.ts`: typed seed samples, results, equipment, methods, and notifications.
- `src/lib/types.ts`: domain types.
- `src/lib/store.ts`: Zustand state with `localStorage` persistence under `sorits-lab-demo-v1`.
- `src/features/forms/config.ts`: all field definitions, Zod rules, calculation formulas, and illustrative thresholds.
- `src/features/`: feature components; `src/components/`: shared shell, dialogs, statuses, photo input, and other UI.

The demo clock is fixed at **22 September 2026** (`TODAY` in `src/lib/utils.ts`) so schedules and reminders remain consistent for presentations. Samples, form drafts, completed results, approvals, equipment checklist progress, photos, and notification read state persist across reloads. Equipment and method reference data are immutable local seeds. Images remain local data URLs, limited to three 1 MB images per record; storage quota errors display a visible warning.

Choose **Демо мэдээлэл сэргээх** at the bottom of the sidebar and confirm to restore seeded data. A cancelled confirmation changes nothing.

## Calculations and demo boundaries

Compression uses `R (MPa) = F (kN) × 1000 / (width × length in mm²)` and averages three specimens. Early-age results are flagged for review. Other forms calculate moisture, bulk density, sand fineness modulus, daily averages, and cement strength averages. Validation includes positive dimensions, realistic bounds, dates, sieve totals, wet/dry mass relationships, and cement setting times.

Status thresholds and method summaries are explicitly illustrative. They are not certified laboratory acceptance criteria or the full text of official standards. Numeric grades, instrument models, formulas, and units retain their conventional notation; user-facing instructions are Mongolian.

## Browser verification

```sh
npm run test:e2e
```

Playwright uses locally installed Google Chrome and starts/reuses the preview on port 3100. To use bundled Chromium, run `npx playwright install chromium`, set `PLAYWRIGHT_CHANNEL=chromium`, and run the same test command. `TEST_URL` can point to an already running preview.

The tests exercise navigation, search, registration and date calculations, localStorage reloads, all six forms, validation and calculations, approval, all ten equipment panels, checklist persistence, guided completion, standards, report filters, print invocation, reset confirmation, and 390/768 px layouts. `scripts/inspect.mjs` saves desktop/mobile screenshots under `artifacts/`; browser tests also produce an A4 report preview there.

## Sample registry and laboratory results (`/sample-registry/`)

Samples can store a planned date for going to Барилга архитектур компани. Select a source in the company registration form, or open it from the sample detail. A successful registration links the original sample and removes it from the samples queue atomically; tests, photos and the original record remain available. Entering an existing sample code also links it automatically. Linked samples stay out of the queue if the company registration is later deactivated. Migration `202609270001_sample_registry_transfer` adds the date and unique source link, and links existing records with matching codes. Apply it with `npm run db:migrate`, then regenerate the client with `npm run db:generate`.

Saving a planned company date immediately displays the sample in the company registry table as `Явахаар товлосон`, ordered by its departure date. Search, filters, pagination and Excel export include these scheduled samples. Changing or clearing the date updates that row live. `Бүртгэл баталгаажуулах` opens the prefilled registration form; a successful registration replaces the planned row and removes the original sample from the samples queue.

`Барилга архитектур компани → Дээжийн бүртгэл` is backed by MySQL (`SampleRecord`, `LaboratoryResult`, `LaboratoryResultItem`, `LaboratoryResultAttachment`). Apply the schema with `npm run db:migrate` (migration `202609260004_laboratory_results`) and `npm run db:generate`.

- **Realtime:** every mutation runs in one transaction that writes the data, an `AuditLog` row and a `RealtimeEvent` row. `/api/events/` streams those events (SSE), and every open browser refreshes the registry, status badges, KPI tiles, dashboard graphics and sidebar counter without a reload.
- **Status:** `Бүртгэсэн → Лабораторид илгээсэн → Хариу хэсэгчлэн авсан / Хариу авсан`. Results only open after dispatch. The status is derived on the server from the active results (none → `Лабораторид илгээсэн`, all complete → `Хариу авсан`, otherwise `Хариу хэсэгчлэн авсан`) and every transition is validated.
- **Permissions (server-enforced):** `ADMIN` creates, edits, completes, reopens and deactivates results. `USER` creates results and edits only their own incomplete ones; completed results need an administrator. Results are deactivated, never deleted.
- **Attachments:** PDF/JPG/JPEG/PNG, up to 10 MB each (max 5 per save, 10 per result). Extension, MIME type and file signature are checked; files are stored under `LAB_UPLOAD_DIR` (default `./storage/laboratory-results`) with generated names, and MySQL keeps only metadata and the relative path. Files are served only by the authenticated `/api/laboratory-attachments/<id>/` route. Removing an attachment is a soft, audited action.
- **Export/print:** the registry exports the filtered list to `.xlsx` (samples + measurements sheets); record detail and each individual laboratory result have a print view.
