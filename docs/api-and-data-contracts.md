# API And Data Contracts

## POST `/api/extract-document`

Extracts readable text from one uploaded file.

### Request

Content type: `multipart/form-data`

Field:

- `file`: a `File` object.

Supported inputs:

- PDF files.
- `.txt` files.
- `.md` files.
- Other `text/*` files.

Limits:

- Maximum file size: 12 MB.
- Extracted PDF text must contain at least 20 readable characters.
- Scanned PDFs need OCR before upload.

### Success Response

```ts
{
  document: {
    name: string;
    type: string;
    content: string;
  }
}
```

### Error Responses

- `400`: no file was provided.
- `413`: file is larger than 12 MB.
- `415`: unsupported file type.
- `422`: extraction failed, text file is empty, or PDF text is not readable enough.

## POST `/api/analyze`

Runs the PSD3/PSR readiness assessment for a company profile and uploaded source documents.

### Request

Content type: `application/json`

```ts
{
  companyProfile: {
    companyName: string;
    companyType: CompanyType;
    country: Country;
    services: ServiceFlow[];
  };
  documents: Array<{
    name: string;
    type: string;
    content: string;
  }>;
}
```

Validation rules:

- `companyName` must be non-empty.
- `companyType` must be one of the values in `COMPANY_TYPES`.
- `country` must be one of the values in `COUNTRIES`.
- `services` must contain at least one value from `SERVICES`.
- `documents` must contain at least one uploaded document with non-empty `name`, `type`, and `content`.

### Missing Required Documents Response

If the selected profile requires evidence categories that were not uploaded, the API returns `400`:

```ts
{
  error: "Missing required documents for selected services";
  missingRequiredDocuments: Array<{
    id: string;
    title: string;
    description: string;
    requirementIds: string[];
  }>;
}
```

### Success Response

The response is an `AnalysisResult`:

```ts
{
  runId: string;
  summary: {
    totalRequirements: number;
    covered: number;
    partiallyCovered: number;
    notEvidenced: number;
    needsHumanReview: number;
  };
  matrix: EvidenceMatrixItem[];
  roadmap: RoadmapTask[];
  disclaimer: string;
  diagnostics?: AnalysisDiagnostics;
}
```

## Evidence Matrix Item

```ts
{
  requirementId: string;
  domain: string;
  requirementTitle: string;
  regulatoryReference?: string;
  sourceUrl?: string;
  status: "Covered" | "Partially covered" | "Not evidenced" | "Needs human review";
  evidenceFound: string;
  sourceDocument?: string;
  evidenceExcerpt?: string;
  missingEvidence: string[];
  priority: "Low" | "Medium" | "High" | "Critical";
  confidence: number;
  recommendedTask: string;
}
```

Status meaning:

- `Covered`: operational source evidence was found for the expected evidence.
- `Partially covered`: weaker evidence was found, such as policy intent, procedure, or design material.
- `Not evidenced`: no usable evidence was found in the uploaded documents.
- `Needs human review`: automation should not make the final assessment alone.

## Roadmap Task

```ts
{
  title: string;
  owner: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  deadline: "30 days" | "60 days" | "90 days" | "180 days";
  evidenceRequired: string[];
  acceptanceCriteria: string;
  linkedRequirementIds: string[];
}
```

Roadmap tasks are generated for requirements that still need work after evidence gating.

## Diagnostics

```ts
{
  engine: "openai" | "fallback";
  model?: string;
  reasoningEffort?: string;
  generatedAt: string;
  warnings: string[];
  persistence: {
    status: "saved" | "skipped" | "failed";
    detail: string;
  };
  regulatorySources: Array<{
    label: string;
    url: string;
  }>;
}
```

Diagnostics are meant to make demo and production behavior explainable:

- Which engine produced the result.
- Which model was configured when OpenAI was used.
- Whether fallback was used.
- Whether Supabase persistence saved, skipped, or failed.
- Whether scope or evidence warnings were detected.
- Which regulatory source list was included.

## Environment Variables

OpenAI:

- `OPENAI_API_KEY`: enables OpenAI analysis.
- `OPENAI_MODEL`: model sent to the OpenAI Responses API. Defaults to `gpt-5.4-mini`.
- `OPENAI_REASONING_EFFORT`: reasoning effort sent to OpenAI. Defaults to `none`.

Supabase:

- `SUPABASE_URL`: Supabase project URL used for server-side inserts.
- `NEXT_PUBLIC_SUPABASE_URL`: fallback URL used by persistence if `SUPABASE_URL` is missing.
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key used by server-side persistence.

Public product labels:

- `NEXT_PUBLIC_PRODUCT_NAME`: product name in UI and report output.
- `NEXT_PUBLIC_PRODUCT_SHORT_NAME`: shorter product label.

## Persistence Tables

The Supabase migration creates:

- `analysis_runs`: run ID, company profile, service list, summary, engine, model, warnings, regulatory sources, timestamp.
- `analysis_documents`: uploaded source document text per run.
- `evidence_matrix_items`: matrix rows per run.
- `roadmap_tasks`: remediation tasks per run.

The API inserts rows directly through Supabase REST with a service-role key. This key must stay server-side only.
