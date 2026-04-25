# CompliancePilot

CompliancePilot is a PSD3/PSR readiness workspace for payment and fintech teams. It turns a company profile and source evidence documents into a readiness matrix, evidence-backed gaps, a remediation roadmap, and an exportable board-style report.

The project is built as a Next.js app with local deterministic analysis, optional OpenAI analysis, strict evidence gating, and optional Supabase persistence.

> CompliancePilot is an AI-assisted assessment workspace. It is not legal advice, does not certify compliance, and should be reviewed by qualified compliance and legal teams before operational use.

## What It Does

- Captures company scope: company type, country, and payment service flows.
- Requires evidence documents based on that scope.
- Extracts readable text from PDF, `.txt`, and `.md` uploads.
- Maps uploaded evidence against PSD3/PSR requirement data.
- Uses OpenAI when configured, then applies deterministic evidence gating.
- Falls back to deterministic keyword analysis when OpenAI is not configured or returns an unusable result.
- Generates a matrix, diagnostics banner, remediation roadmap, report preview, and CSV download.
- Optionally saves analysis runs, uploaded document text, matrix rows, and roadmap tasks to Supabase.

## Quick Start

Requirements:

- Node.js `>=20.9.0`
- npm

Install dependencies:

```bash
npm install
```

Create a local environment file:

```bash
cp .env.example .env.local
```

Configure the values you need:

```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5.4-mini
OPENAI_REASONING_EFFORT=none

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_PRODUCT_NAME=CompliancePilot
NEXT_PUBLIC_PRODUCT_SHORT_NAME=CompliancePilot
```

OpenAI and Supabase are optional for local demos. Without `OPENAI_API_KEY`, the app uses deterministic fallback analysis. Without Supabase credentials, the app runs normally and reports persistence as skipped.

Run the development server:

```bash
npm run dev
```

Then open the local URL printed by Next.js, usually `http://localhost:3000`.

## Useful Commands

```bash
npm run build
npm run lint
npm run typecheck
npm run test:evidence
npm run test:complex
npm run test:complex:prod
```

- `npm run build`: production Next.js build.
- `npm run lint`: ESLint over `app`, `data`, `lib`, and `scripts`.
- `npm run typecheck`: TypeScript check without emitting files.
- `npm run test:evidence`: local regression for evidence gating behavior.
- `npm run test:complex`: local complex use-case regression suite.
- `npm run test:complex:prod`: runs the complex suite against the production analyze endpoint.

## Repository Map

- `app/`: Next.js App Router UI and API routes.
- `app/api/extract-document/route.ts`: file upload text extraction endpoint.
- `app/api/analyze/route.ts`: analysis endpoint and orchestration.
- `data/`: PSD3/PSR requirements and required-document rules.
- `lib/`: analysis engines, evidence gate, schemas, types, persistence, and app config.
- `scripts/`: regression checks for evidence behavior and complex scenarios.
- `supabase/migrations/`: optional persistence schema.
- `evidence/`: captured screenshots and generated evidence artifacts.
- `docs/`: product, technical, operations, API, and testing documentation.

## Documentation

Non-technical handoff:

- [Product brief](docs/product-brief.md)
- [Hackathon demo script](docs/demo-script.md)

Technical handoff:

- [Technical architecture](docs/technical-architecture.md)
- [API and data contracts](docs/api-and-data-contracts.md)
- [Operations runbook](docs/operations-runbook.md)
- [Testing and evidence](docs/testing-and-evidence.md)

## Current Limits

- Supported uploads are PDF, `.txt`, and `.md`.
- PDF extraction requires readable embedded text. Scanned PDFs need OCR before upload.
- The upload extraction limit is 12 MB per file.
- The regulatory base is maintained in code under `data/psd3-psr-requirements.ts`.
- Evidence status is limited to the uploaded documents and selected scope.
- Persistence uses a Supabase service-role key from the server environment; do not expose it in client code.
