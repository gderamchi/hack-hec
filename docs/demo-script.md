# Hackathon Demo Script

## Goal

Show that CompliancePilot can convert PSD3/PSR readiness from a vague compliance challenge into an evidence-backed product and operations workflow.

## Suggested Demo Setup

- Run the app locally with `npm run dev`, or use the deployed URL if available.
- Keep a small set of sample evidence documents ready in PDF, `.txt`, or `.md` format.
- For a reliable live demo, include at least one document that clearly mentions operational evidence such as logs, screenshots, approval records, test results, audit events, fraud monitoring, SCA, payee verification, consent lifecycle, or support workflows.
- If OpenAI is not configured, mention that the deterministic fallback keeps the demo working.

## Talk Track

### 1. Opening

"CompliancePilot is a PSD3/PSR readiness workspace for payment and fintech teams. Instead of giving generic legal advice, it maps uploaded source evidence to concrete regulatory requirements and turns gaps into a remediation backlog."

Important disclaimer:

"This is AI-assisted readiness support, not a legal opinion and not a compliance certification."

### 2. Landing Page

Show the first screen and explain:

- The product is focused on PSD3/PSR.
- The workflow is built for compliance, product, engineering, fraud, support, and operations teams.
- The output is a readiness matrix and backlog, not a generic chat answer.

### 3. Company Scope

Fill in:

- Company name.
- Company type, for example `Electronic Money Institution` or `Payment Institution`.
- Country, for example `France`.
- Relevant services, for example instant credit transfers, payment initiation, open banking account access, fraud monitoring, and strong customer authentication.

Explain:

"The selected company type and services determine which requirements and evidence packs are relevant. This avoids scoring unrelated obligations."

### 4. Evidence Upload

Upload PDF, `.txt`, or `.md` files.

Explain:

"The app extracts readable text from documents, then checks whether the selected scope has the minimum evidence categories needed before running analysis."

If a required document warning appears:

"This is intentional. The product blocks incomplete runs when the selected scope requires evidence that is missing."

### 5. Processing

During the processing screen, explain the pipeline:

- Extract payment and compliance evidence.
- Map evidence against PSD3/PSR source-backed controls.
- Detect missing controls.
- Generate a product and compliance roadmap.

Mention:

"OpenAI can help interpret the material, but every final result still goes through deterministic evidence gating."

### 6. Results Dashboard

Show the metrics:

- Analyzed requirements.
- Covered.
- Partially covered.
- Not evidenced.
- Needs review.

Explain:

"The dashboard separates policy intent from operational proof. A policy statement may create partial coverage, but full coverage needs stronger source evidence."

### 7. Evidence Matrix

Open a matrix row or evidence drawer.

Point out:

- Requirement title.
- Regulatory reference and source URL.
- Status.
- Source document.
- Evidence excerpt.
- Missing evidence.
- Recommended task.
- Confidence score.

Talk track:

"This is the core value. The user can see why a row was scored this way and what evidence is still missing."

### 8. Roadmap

Scroll to the generated roadmap.

Explain:

"The product turns compliance gaps into backlog work: owner, priority, deadline, evidence required, and acceptance criteria."

This is useful for product, engineering, fraud, support, and compliance teams because the next action is explicit.

### 9. Report Preview And CSV

Open the report preview and show:

- Company profile.
- Summary metrics.
- Source documents.
- Matrix.
- Roadmap.
- Regulatory sources.
- Disclaimer.

Then show the CSV download button.

Explain:

"The result can be shared with stakeholders and tracked outside the app."

### 10. Diagnostics

Show the diagnostics banner if visible.

Explain:

- Whether OpenAI or fallback analysis was used.
- Which model and reasoning effort were configured.
- Whether Supabase persistence succeeded, skipped, or failed.
- Any warnings, such as missing OpenAI configuration or out-of-scope services mentioned in documents.

## Questions To Expect

### Is this legal advice?

No. It is a workflow for collecting, mapping, and prioritizing evidence. Legal and compliance teams still review the result.

### What happens if OpenAI is unavailable?

The app uses a deterministic fallback analyzer. The result still goes through evidence gating and schema validation.

### Can it save results?

Yes, if Supabase server-side credentials are configured. Otherwise persistence is skipped and the app still returns results.

### Can it read scanned PDFs?

Not directly. The current PDF extraction expects readable embedded text. Scanned PDFs need OCR before upload.

### Why require documents before analysis?

Because the app is meant to assess evidence, not invent coverage. Required-document gating makes weak or incomplete inputs visible before the assessment runs.
