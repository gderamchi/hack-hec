# Product Brief

## One-Line Pitch

CompliancePilot helps payment and fintech teams turn PSD3/PSR regulatory readiness work into a source-backed evidence matrix and remediation backlog.

## Problem

PSD3 and PSR introduce or reinforce obligations across fraud prevention, payee verification, strong customer authentication, open banking, customer support, refunds, transparency, cash access, and licensing. Teams often have evidence spread across policy documents, product specifications, logs, test records, incident processes, and operational playbooks.

The hard part is not only knowing what the regulation says. The hard part is proving what is already evidenced, what is only a policy intention, and what still needs operational proof.

## Target Users

- Compliance leaders preparing PSD3/PSR gap assessments.
- Product and engineering teams turning regulatory gaps into backlog items.
- Fraud, support, and operations teams gathering evidence for controls.
- Executives or hackathon jury members evaluating whether the workflow is credible and useful.

## Value Proposition

CompliancePilot gives teams a structured readiness workspace:

- A guided scope step so the assessment matches the company type and selected service flows.
- Required evidence checks before analysis runs.
- Source-backed requirement mapping, not a generic chatbot answer.
- Clear status labels for each requirement.
- Evidence excerpts and missing-evidence lists.
- A practical roadmap with owners, priorities, deadlines, and acceptance criteria.
- A board-style report preview and CSV export for follow-up.

## Product Flow

1. Enter company scope.
2. Select payment services and regulated flows.
3. Upload relevant PDF, text, or Markdown evidence documents.
4. The app checks required evidence categories for the selected scope.
5. The analysis engine maps evidence to PSD3/PSR requirements.
6. The evidence gate normalizes results so unsupported claims are not treated as full coverage.
7. The user reviews the results dashboard, evidence drawer, generated roadmap, report preview, and CSV export.

## Outputs

The main output is an `AnalysisResult` with:

- `summary`: count of covered, partially covered, not evidenced, and human-review requirements.
- `matrix`: row-by-row requirement assessment with source reference, evidence, missing evidence, confidence, and recommended task.
- `roadmap`: prioritized remediation tasks for uncovered or partially covered items.
- `diagnostics`: analysis engine, model, warnings, persistence status, and regulatory source list when available.
- `disclaimer`: the product disclaimer.

## What Statuses Mean

- `Covered`: uploaded evidence contains operational artifacts for the expected evidence.
- `Partially covered`: uploaded evidence contains a policy, procedure, design, or weaker source but not enough operational proof.
- `Not evidenced`: no usable evidence was found in the uploaded documents.
- `Needs human review`: reserved for cases where automated assessment should not decide alone.

## Why It Is Different From a Generic AI Assistant

CompliancePilot does not ask the model to improvise a compliance answer from scratch. The app has a requirement base in code, validates request and response shapes, completes missing source-backed rows from a deterministic baseline, and runs a separate evidence gate before returning the final matrix.

If OpenAI is unavailable or the response fails validation, the app still produces a deterministic fallback result. This makes the demo resilient and makes analysis behavior easier to test.

## Limitations

- The app does not certify compliance.
- It does not replace legal or regulatory advice.
- It only assesses evidence uploaded for the current run.
- Scanned PDFs need OCR before upload.
- The regulatory requirement base must be maintained as PSD3/PSR text and supervisory expectations evolve.
- A `Covered` status means source-backed evidence was found by this workflow; it is not a legal conclusion.

## Hackathon Jury Framing

The strongest demo angle is operational credibility: the app turns a broad regulatory change into a workflow a payment team can actually use. It asks for scope, checks evidence requirements, avoids unsupported positive claims, and converts gaps into accountable remediation tasks.
