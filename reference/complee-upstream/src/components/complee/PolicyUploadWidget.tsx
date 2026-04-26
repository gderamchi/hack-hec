// Complee — Policy Upload + AI Coverage Widget.
// Drop a PDF policy → we extract text in the browser, ship it to the
// analyze-policy edge function, then show per-substep coverage with status
// pills, evidence quotes, gap explanations, and ready-to-paste addendum
// suggestions.

import { useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCopy,
  FileUp,
  Loader2,
  Quote,
  Sparkles,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  analyzePolicyCoverage,
  extractPdfText,
  uploadPolicy,
  type CoverageResult,
  type PolicyAnalysis,
} from "@/lib/policyAnalysis";
import type { Substep } from "@/lib/playbook";
import type { AssessmentResultRow } from "@/data/requirements";

interface Props {
  row: AssessmentResultRow;
  substeps: Substep[];
  assessmentId: string | null;
  requirementId: string;
}

type Phase = "idle" | "extracting" | "uploading" | "analyzing" | "done" | "error";

const STATUS_META: Record<
  CoverageResult["status"],
  { label: string; cls: string; icon: typeof CheckCircle2 }
> = {
  covered: {
    label: "Covered",
    cls: "bg-success-soft text-success border-success/40",
    icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    cls: "bg-warn-soft text-warn-foreground border-warn/40",
    icon: AlertCircle,
  },
  missing: {
    label: "Missing",
    cls: "bg-rose-50 text-rose-700 border-rose-300",
    icon: X,
  },
};

export function PolicyUploadWidget({ row, substeps, assessmentId, requirementId }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PolicyAnalysis | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const reset = () => {
    setPhase("idle");
    setError(null);
    setFileName(null);
    setAnalysis(null);
    setExpanded(new Set());
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      toast.error("Only PDF policies are supported in this beta.");
      return;
    }
    setError(null);
    setAnalysis(null);
    setFileName(file.name);
    try {
      setPhase("extracting");
      const text = await extractPdfText(file);
      if (text.length < 50) {
        throw new Error(
          "Could not extract enough text. If this is a scanned PDF, please run OCR first.",
        );
      }

      setPhase("uploading");
      await uploadPolicy(file, { assessmentId, requirementId }).catch((e) => {
        // Upload failure is non-fatal for the analysis step — surface but continue.
        console.warn("Upload failed; continuing with analysis only:", e);
      });

      setPhase("analyzing");
      const result = await analyzePolicyCoverage({
        documentText: text,
        documentName: file.name,
        requirementTitle: row.requirement.title,
        authority: row.requirement.authority,
        country: row.requirement.country,
        regulationReference: row.requirement.regulation_reference,
        substeps: substeps.map((s) => ({ id: s.id, title: s.title, detail: s.detail })),
      });
      setAnalysis(result);
      setPhase("done");
      toast.success(`Coverage: ${result.coverageScore}/100`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setError(msg);
      setPhase("error");
      toast.error(msg);
    }
  };

  const toggleExpanded = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copyAddendum = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Suggested addition copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  // ---------- Render ----------

  const busy = phase === "extracting" || phase === "uploading" || phase === "analyzing";
  const phaseLabel: Record<Phase, string> = {
    idle: "",
    extracting: "Extracting text from PDF…",
    uploading: "Uploading to your library…",
    analyzing: "AI is comparing your policy against the regulator's substeps…",
    done: "",
    error: "",
  };

  return (
    <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand-soft/30 to-card p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            Already have a policy? Let AI check it
          </div>
          <p className="mt-1 text-[12.5px] text-navy leading-relaxed max-w-[640px]">
            Upload your existing policy PDF. Complee compares it against every substep
            the regulator expects, highlights gaps, and writes ready-to-paste addenda
            for anything missing.
          </p>
        </div>
        {analysis && (
          <button
            onClick={reset}
            className="text-[11px] text-muted-foreground hover:text-navy underline"
          >
            Analyse another file
          </button>
        )}
      </div>

      {/* Drop zone (hidden when analysis is shown) */}
      {!analysis && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
          className={`rounded-lg border-2 border-dashed p-5 text-center transition-colors ${
            dragOver
              ? "border-brand bg-brand-soft/40"
              : "border-border bg-card hover:border-brand/50"
          }`}
        >
          <FileUp className="h-6 w-6 text-brand mx-auto" />
          <div className="mt-2 text-[13px] font-semibold text-navy">
            Drop a PDF policy here
          </div>
          <div className="mt-1 text-[11.5px] text-muted-foreground">
            …or{" "}
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="text-brand hover:underline font-medium"
              disabled={busy}
            >
              browse from your computer
            </button>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
        </div>
      )}

      {/* Status row while working */}
      {busy && (
        <div className="rounded-lg border border-brand/30 bg-brand-soft/30 px-3 py-2 flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-brand animate-spin" />
          <span className="text-[12px] text-navy">{phaseLabel[phase]}</span>
          {fileName && (
            <span className="text-[11px] text-muted-foreground truncate ml-auto max-w-[200px]">
              {fileName}
            </span>
          )}
        </div>
      )}

      {/* Error */}
      {phase === "error" && error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-700 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-semibold">Analysis failed</div>
            <div className="text-[11.5px] mt-0.5">{error}</div>
          </div>
          <button onClick={reset} className="text-rose-700 hover:underline text-[11px]">
            Try again
          </button>
        </div>
      )}

      {/* Result */}
      {analysis && (
        <div className="space-y-3">
          {/* Score banner */}
          <ScoreBanner analysis={analysis} fileName={fileName ?? "your document"} />

          {/* Per-substep results */}
          <ul className="space-y-2">
            {analysis.results.map((r) => {
              const meta = STATUS_META[r.status];
              const Icon = meta.icon;
              const isOpen = expanded.has(r.substepId);
              const hasDetails =
                r.status !== "covered" || r.evidenceQuote.length > 0;
              return (
                <li key={r.substepId} className="rounded-lg border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => hasDetails && toggleExpanded(r.substepId)}
                    className="w-full flex items-start gap-3 p-3 text-left"
                  >
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide shrink-0 ${meta.cls}`}
                    >
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                    <span className="text-[12.5px] font-semibold text-navy flex-1 leading-snug">
                      {r.substepTitle}
                    </span>
                    {hasDetails &&
                      (isOpen ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                      ))}
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2.5 border-t border-border pt-2.5">
                      {r.evidenceQuote && (
                        <div className="flex items-start gap-2 rounded-md bg-muted/40 px-2.5 py-2 border border-border">
                          <Quote className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                          <div>
                            <div className="text-[10.5px] uppercase tracking-wide font-semibold text-muted-foreground">
                              Evidence in your document
                            </div>
                            <p className="text-[12px] italic text-navy mt-0.5 leading-relaxed">
                              "{r.evidenceQuote}"
                            </p>
                          </div>
                        </div>
                      )}
                      {r.gapExplanation && (
                        <div className="rounded-md border border-warn/30 bg-warn-soft/30 px-2.5 py-2">
                          <div className="text-[10.5px] uppercase tracking-wide font-semibold text-warn-foreground">
                            What's missing
                          </div>
                          <p className="text-[12px] text-navy mt-0.5 leading-relaxed">
                            {r.gapExplanation}
                          </p>
                        </div>
                      )}
                      {r.suggestedAddition && (
                        <div className="rounded-md border border-brand/30 bg-brand-soft/20 px-2.5 py-2 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <div className="text-[10.5px] uppercase tracking-wide font-semibold text-brand">
                              Suggested addition (paste-ready)
                            </div>
                            <button
                              type="button"
                              onClick={() => copyAddendum(r.suggestedAddition)}
                              className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand hover:underline"
                            >
                              <ClipboardCopy className="h-3 w-3" />
                              Copy
                            </button>
                          </div>
                          <p className="text-[12px] text-navy leading-relaxed whitespace-pre-line">
                            {r.suggestedAddition}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {analysis.truncated && (
            <p className="text-[11px] text-muted-foreground italic">
              Note: your document was very long, so only the first ~80,000 characters
              were analysed. Splitting it into focused policies usually improves results.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreBanner({ analysis, fileName }: { analysis: PolicyAnalysis; fileName: string }) {
  const counts = analysis.results.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { covered: 0, partial: 0, missing: 0 } as Record<CoverageResult["status"], number>,
  );
  const tone =
    analysis.coverageScore >= 80
      ? "border-success/40 bg-success-soft/30"
      : analysis.coverageScore >= 50
        ? "border-warn/40 bg-warn-soft/30"
        : "border-rose-300 bg-rose-50";
  const total = analysis.results.length;
  return (
    <div className={`rounded-lg border ${tone} p-3.5 space-y-2`}>
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-navy/80">
            Coverage score
          </div>
          <div className="text-[26px] font-bold text-navy leading-none mt-1">
            {analysis.coverageScore}
            <span className="text-[14px] font-normal text-muted-foreground">/100</span>
          </div>
        </div>
        <div className="text-[11.5px] text-navy text-right space-y-0.5">
          <div>
            <span className="font-semibold text-success">{counts.covered}</span> covered ·{" "}
            <span className="font-semibold text-warn-foreground">{counts.partial}</span> partial ·{" "}
            <span className="font-semibold text-rose-600">{counts.missing}</span> missing
          </div>
          <div className="text-muted-foreground">of {total} substeps</div>
        </div>
      </div>
      <p className="text-[12.5px] text-navy leading-relaxed">{analysis.overallSummary}</p>
      <div className="text-[11px] text-muted-foreground italic truncate">
        Source: {fileName}
      </div>
    </div>
  );
}
