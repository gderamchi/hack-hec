# Testing And Evidence

## Purpose

The project has lightweight checks for code health and domain behavior. The important domain risk is false positive evidence: the app should not mark a requirement as covered just because a document mentions a keyword or lists expected evidence.

## Core Commands

```bash
npm run lint
npm run typecheck
npm run test:evidence
npm run test:complex
```

For production endpoint regression:

```bash
npm run test:complex:prod
```

## `npm run lint`

Runs:

```bash
eslint app data lib scripts --max-warnings=0
```

Use this to catch JavaScript, TypeScript, React, and import issues in the main app and scripts.

## `npm run typecheck`

Runs:

```bash
tsc --noEmit
```

Use this to validate TypeScript contracts without writing emitted files.

## `npm run test:evidence`

Runs:

```bash
node -r tsconfig-paths/register -r sucrase/register scripts/evidence-gate-regression.ts
```

This script generates synthetic documents and validates evidence-gate behavior:

- Complete operational evidence should produce `Covered`.
- Policy-only evidence should produce `Partially covered`.
- Policy followed by operational evidence should produce `Covered`.
- Empty material should produce `Not evidenced`.
- Expected-evidence checklists should produce `Not evidenced`.

Generated fixtures are written to:

```bash
evidence/evidence-gate-fixtures/atlas-payments
```

The command prints a JSON summary with status counts for each fixture class.

## `npm run test:complex`

Runs:

```bash
node -r tsconfig-paths/register -r sucrase/register scripts/complex-usecase-regression.ts
```

This script builds richer PSD3/PSR use cases and compares expected statuses with actual analysis results.

It writes outputs to:

```bash
~/Downloads/psd3-psr-complex-usecases-YYYY-MM-DD
```

Important generated files:

- `complex-usecase-report.md`
- `complex-usecase-summary.json`
- `requirement-comparison.csv`
- `inputs/<case-id>/...`

Use this when changing requirement rules, document requirements, fallback analysis, evidence gating, or API response behavior.

## `npm run test:complex:prod`

Runs the complex regression suite against the production analyze endpoint.

Default target:

```bash
https://compliancepilot-psd3.vercel.app/api/analyze
```

Override with:

```bash
COMPLIANCEPILOT_ANALYZE_URL=https://your-domain.example/api/analyze npm run test:complex:prod
```

Use this after deployment to compare live behavior with expected complex scenarios.

## Manual Acceptance Scenarios

### Happy Path

1. Start the app with `npm run dev`.
2. Enter a company name.
3. Select a company type and relevant services.
4. Upload valid PDF, `.txt`, or `.md` evidence.
5. Run the assessment.
6. Confirm the dashboard appears.
7. Confirm diagnostics show `openai` or `fallback`.
8. Open an evidence row.
9. Confirm evidence excerpts and missing evidence are understandable.
10. Open the report preview and download CSV.

### Missing Required Evidence

1. Select a broad regulated scope.
2. Upload too few documents or documents without matching evidence categories.
3. Run the assessment.
4. Confirm the app blocks the run and identifies missing required evidence.

### Fallback Mode

1. Run without `OPENAI_API_KEY`.
2. Complete an assessment.
3. Confirm diagnostics show fallback analysis.
4. Confirm the result still includes matrix, roadmap, disclaimer, and regulatory sources.

### Supabase Skipped Mode

1. Run without `SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY`.
2. Complete an assessment.
3. Confirm diagnostics show persistence as skipped.
4. Confirm the user still receives results.

### Supabase Saved Mode

1. Apply the Supabase migration.
2. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`.
3. Complete an assessment.
4. Confirm diagnostics show persistence as saved.
5. Confirm rows exist in `analysis_runs`, `analysis_documents`, `evidence_matrix_items`, and `roadmap_tasks`.

## Evidence Review Standard

When validating results, prefer evidence that proves actual operation:

- Logs.
- Screenshots.
- Approval records.
- Test results.
- Audit events.
- Dashboards.
- Incident records.
- Support workflow records.
- Retained control review material.

Treat the following as weaker evidence:

- Policy intent.
- Draft procedures.
- Design specifications.
- Expected-evidence checklists.
- Demo placeholders.
- Documents that say evidence is missing or not provided.

This matches the behavior of `lib/evidence-gate.ts`.
