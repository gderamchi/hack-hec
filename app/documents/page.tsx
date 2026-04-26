"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import {
  ArrowRight,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
  UploadCloud,
  X
} from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { StepShell } from "@/components/complee/StepShell";
import { useAssessment } from "@/components/complee/assessment-context";
import type { CompleeDocument } from "@/lib/complee-frontend";

export default function DocumentsPage() {
  const router = useRouter();
  const {
    uploadedDocuments,
    samplePackSelected,
    loadSamplePack,
    clearSamplePack,
    addUploadedDocuments,
    removeUploadedDocument,
    analysisError,
    setAnalysisError
  } = useAssessment();
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const userDocuments = uploadedDocuments.filter((document) => !document.sample);
  const sampleDocuments = uploadedDocuments.filter((document) => document.sample);
  const canContinue = uploadedDocuments.length > 0;

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const accepted: CompleeDocument[] = [];
    const rejected: string[] = [];
    setUploading(true);
    setUploadNotice("");
    setAnalysisError("");

    try {
      for (const file of Array.from(files)) {
        try {
          accepted.push(await extractUploadedDocument(file));
        } catch (error) {
          rejected.push(
            `${file.name} (${
              error instanceof Error ? error.message : "document extraction failed"
            })`
          );
        }
      }
    } finally {
      setUploading(false);
    }

    if (accepted.length > 0) {
      addUploadedDocuments(accepted);
    }

    setUploadNotice(
      [
        accepted.length ? `Extracted ${accepted.length} document(s).` : "",
        rejected.length ? `Skipped: ${rejected.join(", ")}.` : ""
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  function handleContinue() {
    if (!canContinue) {
      setAnalysisError("Upload documents or use the FlowPay sample pack to continue.");
      return;
    }

    setAnalysisError("");
    router.push("/processing");
  }

  return (
    <Chrome>
      <StepShell
        eyebrow="Step 2 of 4 - Evidence documents"
        title="Upload your current compliance pack"
        description="Complee compares your existing setup against the target regulator's requirements using the existing document extraction endpoint."
        width="wide"
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 lg:gap-6">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-[15px] font-semibold text-navy">Upload PDFs or text files</h2>
            <p className="mb-4 text-[13px] leading-relaxed text-muted-foreground">
              Programmes of operations, AML policies, safeguarding methodology, ICT risk
              registers, complaints procedures and plain text evidence packs.
            </p>

            <div
              role="button"
              tabIndex={0}
              aria-label="Upload files: drop here or press Enter to browse"
              onDragOver={(event) => {
                event.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragOver(false);
                void handleFiles(event.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  inputRef.current?.click();
                }
              }}
              className={`flex min-h-[240px] flex-1 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 ${
                dragOver
                  ? "border-brand bg-brand-soft/50"
                  : "border-border bg-surface-muted hover:border-brand/40"
              }`}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
                {uploading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-brand" aria-hidden="true" />
                ) : (
                  <UploadCloud className="h-6 w-6 text-brand" aria-hidden="true" />
                )}
              </div>
              <p className="text-[14px] font-medium text-navy">
                {uploading ? "Extracting readable text..." : "Drop files here"}
              </p>
              <p className="mt-1 text-[12px] text-muted-foreground">
                PDF, TXT or MD - 12 MB per file
              </p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf,.txt,.md,text/*"
                multiple
                className="sr-only"
                aria-label="Upload evidence files"
                onChange={(event) => void handleFiles(event.target.files)}
              />
            </div>

            {uploadNotice ? (
              <p className="mt-3 text-[12px] leading-relaxed text-muted-foreground">
                {uploadNotice}
              </p>
            ) : null}
          </div>

          <div className="flex flex-col rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[15px] font-semibold text-navy">
                Try the FlowPay sample pack
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-2 py-0.5 text-[11px] font-medium text-brand">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Demo
              </span>
            </div>
            <p className="mb-4 text-[13px] text-muted-foreground">
              Fictional French e-money institution expanding to the UK. The sample has real
              text content so `/api/analyze` can run normally.
            </p>

            {samplePackSelected ? (
              <button
                type="button"
                onClick={clearSamplePack}
                className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-navy transition hover:bg-surface-muted"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Remove sample pack
              </button>
            ) : (
              <button
                type="button"
                onClick={loadSamplePack}
                className="mb-4 w-full rounded-lg bg-navy px-4 py-2.5 text-[13px] font-medium text-navy-foreground transition hover:bg-navy/90"
              >
                Use FlowPay sample pack
              </button>
            )}

            <ul className="flex-1 space-y-2">
              {(samplePackSelected ? sampleDocuments : SAMPLE_LABELS).map((document) => (
                <li
                  key={document.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    samplePackSelected
                      ? "border-success/30 bg-success-soft/50"
                      : "border-border bg-surface-muted opacity-75"
                  }`}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-card">
                    <FileText className="h-4 w-4 text-brand" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-navy">
                      {document.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      PDF - {document.pages ?? "--"} pages
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {userDocuments.length > 0 ? (
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h3 className="mb-3 text-[14px] font-semibold text-navy">Your uploads</h3>
            <ul className="space-y-2">
              {userDocuments.map((document) => (
                <li
                  key={document.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5"
                >
                  <FileText className="h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-navy">
                      {document.name}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {document.type || "document"} - {document.content.length.toLocaleString()} characters
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeUploadedDocument(document.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-card"
                    aria-label={`Remove ${document.name}`}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {analysisError ? (
          <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-[13px] font-medium text-danger">
            {analysisError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/profile"
            className="rounded px-1 py-1 text-[13px] text-muted-foreground transition hover:text-foreground"
          >
            Back
          </Link>
          <button
            type="button"
            disabled={!canContinue || uploading}
            onClick={handleContinue}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy px-5 py-3 text-[14px] font-medium text-navy-foreground shadow-sm transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run readiness assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </StepShell>
    </Chrome>
  );
}

const SAMPLE_LABELS = [
  { id: "label-1", name: "FlowPay EMI Authorisation Dossier.pdf", pages: 84 },
  { id: "label-2", name: "FlowPay AML Risk Assessment France.pdf", pages: 32 },
  { id: "label-3", name: "FlowPay Safeguarding Policy.pdf", pages: 18 },
  { id: "label-4", name: "FlowPay ICT Risk Register.pdf", pages: 24 },
  { id: "label-5", name: "FlowPay Complaints Handling Procedure.pdf", pages: 12 }
];

async function extractUploadedDocument(file: File): Promise<CompleeDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-document", {
    method: "POST",
    body: formData
  });
  const payload = (await response.json().catch(() => null)) as
    | { document?: { name: string; type: string; content: string }; error?: string }
    | null;

  if (!response.ok || !payload?.document) {
    throw new Error(payload?.error ?? "unsupported or unreadable file");
  }

  return {
    ...payload.document,
    id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    pages:
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")
        ? Math.max(1, Math.round(file.size / 30000))
        : undefined
  };
}
