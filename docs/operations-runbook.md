# Operations Runbook

## Local Setup

Install dependencies:

```bash
npm install
```

Create local env:

```bash
cp .env.example .env.local
```

Run locally:

```bash
npm run dev
```

Open the URL printed by Next.js, usually `http://localhost:3000`.

## Environment Configuration

Minimum local demo:

```bash
NEXT_PUBLIC_PRODUCT_NAME=CompliancePilot
NEXT_PUBLIC_PRODUCT_SHORT_NAME=CompliancePilot
```

Recommended AI demo:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=none
NEXT_PUBLIC_PRODUCT_NAME=CompliancePilot
NEXT_PUBLIC_PRODUCT_SHORT_NAME=CompliancePilot
```

With persistence:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` in client-side code or public logs.

## Supabase Setup

The schema is defined in:

```bash
supabase/migrations/20260425_regpilot_psd3.sql
```

It creates:

- `analysis_runs`
- `analysis_documents`
- `evidence_matrix_items`
- `roadmap_tasks`

Apply the migration with the Supabase workflow used for the project. After the schema exists, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment.

Expected behavior:

- If env vars are missing, analysis still works and diagnostics report persistence as skipped.
- If inserts fail, analysis still works and diagnostics report persistence as failed.
- If inserts succeed, diagnostics report persistence as saved.

## Vercel Deployment Notes

This is a Next.js application with server routes. Configure the same environment variables in the Vercel project:

- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_REASONING_EFFORT`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_PRODUCT_NAME`
- `NEXT_PUBLIC_PRODUCT_SHORT_NAME`

`next.config.mjs` includes:

- `serverExternalPackages: ["pdf-parse"]`
- `allowedDevOrigins: ["127.0.0.1"]`
- `devIndicators: false`
- Turbopack root set to the repo directory.

## Smoke Test

After starting the app:

1. Open the app.
2. Enter a company name.
3. Select a company type and at least one service.
4. Upload PDF, `.txt`, or `.md` evidence.
5. Run the assessment.
6. Confirm the results dashboard appears.
7. Open a matrix row and confirm evidence or missing evidence is visible.
8. Open the report preview.
9. Download CSV.
10. Check diagnostics for engine and persistence status.

## Common Issues

### The app says OpenAI fallback was used

Cause:

- `OPENAI_API_KEY` is missing.
- The OpenAI API call failed.
- OpenAI returned JSON that did not match the app schema.
- The OpenAI call timed out.

Action:

- Check `OPENAI_API_KEY`, `OPENAI_MODEL`, and `OPENAI_REASONING_EFFORT`.
- Check server logs for OpenAI warnings.
- Confirm the app still returns a fallback result.

### Uploaded PDF fails extraction

Cause:

- File is larger than 12 MB.
- PDF has no readable embedded text.
- PDF text extraction produced fewer than 20 characters.

Action:

- Run OCR before upload.
- Try a smaller PDF.
- Use `.txt` or `.md` evidence for the demo.

### Analysis is blocked by missing required evidence

Cause:

- The selected company type or service flow requires evidence categories that were not found in uploaded documents.

Action:

- Upload documents that match the required evidence titles and keywords.
- Re-check that the selected services match the uploaded evidence.

### Supabase persistence is skipped

Cause:

- `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` is missing.

Action:

- Set both variables in the server environment.
- Restart the dev or deployment runtime after changing env vars.

### Supabase persistence fails

Cause:

- Schema migration was not applied.
- Service-role key is invalid.
- Supabase REST endpoint is not reachable.
- Row insert failed for a table.

Action:

- Confirm the four expected tables exist.
- Confirm `SUPABASE_SERVICE_ROLE_KEY` is a server-side service-role key.
- Check server logs for the failing table name.

### Results look too strict

Cause:

- The evidence gate requires operational artifacts for `Covered`.
- Policy statements and expected-evidence checklists are intentionally not enough for full coverage.

Action:

- Upload operational source material such as logs, screenshots, approval records, test results, audit events, dashboards, or retained review records.

## Pre-Demo Checklist

- `npm run lint` passes.
- `npm run typecheck` passes.
- `npm run test:evidence` passes.
- `npm run test:complex` passes for local behavior.
- The app can complete one end-to-end assessment.
- The report preview and CSV export are checked.
- The presenter can explain that this is not legal advice and not compliance certification.
