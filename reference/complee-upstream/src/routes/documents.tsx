import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { ArrowRight, FileText, Sparkles, Trash2, UploadCloud, X } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { useAssessment, type UploadedDocument } from "@/store/assessment";

export const Route = createFileRoute("/documents")({
  head: () => ({ meta: [{ title: "Upload documents — Complee" }] }),
  component: Documents,
});

const SAMPLE_DOCS: UploadedDocument[] = [
  { id: "fp-1", name: "FlowPay EMI Authorisation Dossier.pdf", pages: 84, sample: true },
  { id: "fp-2", name: "FlowPay AML Risk Assessment France.pdf", pages: 32, sample: true },
  { id: "fp-3", name: "FlowPay Safeguarding Policy.pdf", pages: 18, sample: true },
  { id: "fp-4", name: "FlowPay ICT Risk Register.pdf", pages: 24, sample: true },
  { id: "fp-5", name: "FlowPay Complaints Handling Procedure.pdf", pages: 12, sample: true },
];

function Documents() {
  const navigate = useNavigate();
  const {
    uploadedDocuments,
    samplePackSelected,
    setSamplePackSelected,
    setUploadedDocuments,
    addUploadedDocument,
    removeUploadedDocument,
  } = useAssessment();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const canContinue = uploadedDocuments.length > 0 || samplePackSelected;

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    Array.from(files)
      .filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"))
      .forEach((f) => {
        addUploadedDocument({
          id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: f.name,
          pages: Math.max(2, Math.round(f.size / 30000)),
        });
      });
  };

  const loadSamplePack = () => {
    setSamplePackSelected(true);
    setUploadedDocuments(SAMPLE_DOCS);
  };

  const clearSamplePack = () => {
    setSamplePackSelected(false);
    setUploadedDocuments(uploadedDocuments.filter((d) => !d.sample));
  };

  return (
    <Chrome>
      <div className="max-w-[1180px] mx-auto px-5 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2">
            Step 3 — Documents
          </p>
          <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-navy">
            Upload your current compliance pack
          </h1>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-foreground max-w-[680px]">
            Complee compares your existing setup against the target regulator's requirements.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
          {/* Upload card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col">
            <h2 className="text-[15px] font-semibold text-navy mb-1">Upload PDFs</h2>
            <p className="text-[13px] text-muted-foreground mb-4">
              Programmes of operations, AML policies, safeguarding methodology, ICT risk
              registers, complaints procedures.
            </p>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => inputRef.current?.click()}
              className={`flex-1 min-h-[200px] sm:min-h-[240px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-center px-6 py-8 cursor-pointer transition-colors ${
                dragOver
                  ? "border-brand bg-brand-soft/40"
                  : "border-border bg-surface-muted hover:border-brand/40"
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-brand-soft flex items-center justify-center mb-4">
                <UploadCloud className="h-6 w-6 text-brand" />
              </div>
              <p className="text-[14px] font-medium text-navy">Drop PDF files here</p>
              <p className="text-[12px] text-muted-foreground mt-1">or click to browse</p>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf,.pdf"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
          </div>

          {/* Sample card */}
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-[15px] font-semibold text-navy">Try the FlowPay sample pack</h2>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-brand bg-brand-soft px-2 py-0.5 rounded-full">
                <Sparkles className="h-3 w-3" />
                Demo
              </span>
            </div>
            <p className="text-[13px] text-muted-foreground mb-4">
              Fictional French e-money institution expanding to the UK.
            </p>

            {samplePackSelected ? (
              <button
                onClick={clearSamplePack}
                className="w-full rounded-lg border border-border bg-card text-navy px-4 py-2.5 text-[13px] font-medium hover:bg-surface-muted transition-colors mb-4 inline-flex items-center justify-center gap-2"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove sample pack
              </button>
            ) : (
              <button
                onClick={loadSamplePack}
                className="w-full rounded-lg bg-navy text-navy-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-navy/90 transition-colors mb-4"
              >
                Use FlowPay sample pack
              </button>
            )}

            <ul className="space-y-2 flex-1">
              {SAMPLE_DOCS.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                    samplePackSelected
                      ? "border-success/30 bg-success-soft/40"
                      : "border-border bg-surface-muted opacity-70"
                  }`}
                >
                  <div className="h-8 w-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4 text-brand" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-navy truncate">{d.name}</div>
                    <div className="text-[11px] text-muted-foreground">PDF · {d.pages} pages</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Uploaded list (non-sample) */}
        {uploadedDocuments.filter((d) => !d.sample).length > 0 && (
          <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-sm">
            <h3 className="text-[14px] font-semibold text-navy mb-3">Your uploads</h3>
            <ul className="space-y-2">
              {uploadedDocuments
                .filter((d) => !d.sample)
                .map((d) => (
                  <li
                    key={d.id}
                    className="flex items-center gap-3 rounded-lg border border-border bg-surface-muted px-3 py-2.5"
                  >
                    <FileText className="h-4 w-4 text-brand shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-navy truncate">{d.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        PDF · {d.pages ?? "—"} pages
                      </div>
                    </div>
                    <button
                      onClick={() => removeUploadedDocument(d.id)}
                      className="h-7 w-7 rounded-md hover:bg-card flex items-center justify-center text-muted-foreground"
                      aria-label="Remove"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        )}

        <div className="mt-8 sm:mt-10 flex items-center justify-between gap-3 flex-wrap">
          <Link
            to="/profile"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <div
            title={
              !canContinue
                ? "Upload documents or use the FlowPay sample pack to continue."
                : undefined
            }
          >
            <button
              disabled={!canContinue}
              onClick={() => navigate({ to: "/processing" })}
              className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-5 py-3 text-[14px] font-medium hover:bg-navy/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Run readiness assessment
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </Chrome>
  );
}
