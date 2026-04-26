// Complee — Guided step-by-step walkthrough.
// Detailed playbook: substeps, structured form inputs, per-step document
// generation (PDF/DOCX), and persistence via the stepProgress store
// (which auto-syncs to Lovable Cloud when the user is authenticated).

import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  ExternalLink,
  FileDown,
  FileSignature,
  HelpCircle,
  Info,
  Lightbulb,
  Lock,
  Sparkles,
  Target,
  Timer,
  X,
} from "lucide-react";
import type { AssessmentResultRow } from "@/data/requirements";
import { getPlaybook, taskKey, type FormField } from "@/lib/playbook";
import { buildStepDocumentBlob, generateStepDocument } from "@/lib/documentGenerator";
import { registerDocument, uploadDocumentBlob, type SignedDocumentRow } from "@/lib/documentLibrary";
import { DocumentViewer } from "./DocumentViewer";
import { useAssessment } from "@/store/assessment";
import { useStepProgress } from "@/store/stepProgress";
import { useActiveStep } from "@/store/activeStep";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  CapitalCalculator,
  CapitalStructureTable,
  CapitalThresholdLookup,
  MultiSelectChips,
  RadioExplained,
} from "./StepWidgets";
import { PolicyUploadWidget } from "./PolicyUploadWidget";
import { useWorkspaces } from "@/store/workspaces";

interface Props {
  row: AssessmentResultRow | null;
  queue: AssessmentResultRow[];
  onClose: () => void;
  onAdvance: (next: AssessmentResultRow | null) => void;
}

export function RoadmapGuide({ row, queue, onClose, onAdvance }: Props) {
  const open = !!row;
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { profile, completeTask, completedTasks } = useAssessment();
  const {
    byKey,
    setStatus,
    toggleSubstep,
    setInput,
    setNotes,
  } = useStepProgress();
  const setActiveStep = useActiveStep((s) => s.set);
  const activeAssessmentId = useWorkspaces((s) => s.activeId);
  const [signDoc, setSignDoc] = useState<SignedDocumentRow | null>(null);
  const [savingDocId, setSavingDocId] = useState<string | null>(null);

  const playbook = useMemo(() => (row ? getPlaybook(row) : null), [row]);

  // Publish active step to the floating AI assistant.
  useEffect(() => {
    if (open && row && playbook) {
      setActiveStep({
        requirementTitle: row.requirement.title,
        authority: row.requirement.authority,
        regulationReference: row.requirement.regulation_reference,
        country: row.requirement.country,
        summary: playbook.summary,
        substeps: playbook.substeps.map((s) => ({ title: s.title, detail: s.detail })),
      });
    } else {
      setActiveStep(null);
    }
    return () => setActiveStep(null);
  }, [open, row, playbook, setActiveStep]);

  if (!row || !playbook) {
    return <Shell open={false} onClose={onClose} children={<div />} />;
  }

  // Auth gate: require login before working on a step.
  if (!loading && !user) {
    return (
      <Shell open={open} onClose={onClose}>
        <AuthGate
          onSignIn={() => navigate({ to: "/auth" })}
          onClose={onClose}
        />
      </Shell>
    );
  }

  const id = taskKey(row);
  const progress = byKey[id];
  const substepDone = (sid: string) => !!progress?.completedSubsteps.includes(sid);
  const completedCount = playbook.substeps.filter((s) => substepDone(s.id)).length;
  const totalSubsteps = playbook.substeps.length;
  const allSubstepsDone = completedCount === totalSubsteps;
  const stepStatus = progress?.status ?? "todo";
  const isDone = stepStatus === "done" || completedTasks.includes(id);

  const requiredFilled = playbook.formFields
    .filter((f) => f.required)
    .every((f) => (progress?.formInputs?.[f.id] ?? "").trim().length > 0);

  const canComplete = allSubstepsDone && requiredFilled && !isDone;
  const subPct = Math.round((completedCount / totalSubsteps) * 100);

  const currentIndex = queue.findIndex((r) => taskKey(r) === id);
  const nextTask =
    currentIndex >= 0 && currentIndex < queue.length - 1 ? queue[currentIndex + 1] : null;

  const handleToggleSubstep = (sid: string) => {
    toggleSubstep(id, sid);
    if (stepStatus === "todo") setStatus(id, "in_progress");
  };

  const handleComplete = () => {
    setStatus(id, "done");
    completeTask(id); // legacy store still drives bar UI
    toast.success(`Step completed: ${row.requirement.title}`, {
      description: nextTask
        ? `Next up: ${nextTask.requirement.title}`
        : "You finished this team's roadmap.",
    });
    if (nextTask) onAdvance(nextTask);
    else onClose();
  };

  const handleGenerate = async (templateId: string, format: "pdf" | "docx") => {
    const tpl = playbook.documents.find((d) => d.id === templateId);
    if (!tpl) return;
    try {
      await generateStepDocument(
        { row, template: tpl, inputs: progress?.formInputs ?? {}, profile },
        format,
      );
      toast.success(`${tpl.title} downloaded`);
    } catch (e) {
      toast.error("Generation failed", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  const handleSignDocument = async (templateId: string) => {
    const tpl = playbook.documents.find((d) => d.id === templateId);
    if (!tpl) return;
    setSavingDocId(templateId);
    try {
      const { blob, filename } = await buildStepDocumentBlob(
        { row, template: tpl, inputs: progress?.formInputs ?? {}, profile },
        "pdf",
      );
      const path = await uploadDocumentBlob({ blob, filename, folder: "step" });
      const activeAssessmentId = useWorkspaces.getState().activeId;
      const docRow = await registerDocument({
        name: filename,
        storage_path: path,
        doc_type: "step",
        requirement_id: row.requirement.id,
        assessment_id: activeAssessmentId,
      });
      setSignDoc(docRow);
    } catch (e) {
      toast.error("Could not prepare document for signing", {
        description: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setSavingDocId(null);
    }
  };

  return (
    <>
    <Shell open={open} onClose={onClose}>
      {/* Header */}
      <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.1em] text-brand font-semibold mb-2">
              <Sparkles className="h-3.5 w-3.5" />
              Guided step
              <span className="text-muted-foreground font-normal normal-case tracking-normal">
                · {currentIndex + 1} of {queue.length}
              </span>
            </div>
            <h3 className="text-[16px] sm:text-[18px] font-semibold tracking-tight text-navy leading-tight">
              {row.requirement.title}
            </h3>
            <div className="mt-1 text-[12px] text-muted-foreground">
              {row.requirement.authority} · {row.requirement.regulation_reference}
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground shrink-0"
            aria-label="Close guide"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
            <span>
              {completedCount} of {totalSubsteps} substeps · {playbook.formFields.length} input
              {playbook.formFields.length === 1 ? "" : "s"} ·{" "}
              {playbook.documents.length} document
              {playbook.documents.length === 1 ? "" : "s"}
            </span>
            <span className="tabular-nums">{subPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden">
            <div
              className="h-full bg-brand transition-all duration-300"
              style={{ width: `${subPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-7">
        {/* Summary */}
        <div className="rounded-xl border border-brand/20 bg-brand-soft/40 p-4">
          <div className="flex items-start gap-2.5">
            <Target className="h-4 w-4 text-brand mt-0.5 shrink-0" />
            <div>
              <div className="text-[11px] uppercase tracking-[0.08em] font-semibold text-brand mb-1">
                What you're doing
              </div>
              <p className="text-[13px] leading-relaxed text-navy">{playbook.summary}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <InfoTile
            icon={<CheckCircle2 className="h-3.5 w-3.5" />}
            label="Outcome"
            value={playbook.outcome}
          />
          <InfoTile
            icon={<Timer className="h-3.5 w-3.5" />}
            label="Estimated time"
            value={playbook.estimatedTime}
          />
        </div>

        {/* Substeps with contextual inputs */}
        <Section title="Do this, in order">
          <ol className="space-y-2.5">
            {playbook.substeps.map((s, i) => {
              const done = substepDone(s.id);
              const fieldsForStep = playbook.formFields.filter((f) => f.substepId === s.id);
              return (
                <li
                  key={s.id}
                  className={`rounded-xl border p-3.5 transition-colors ${
                    done
                      ? "border-success/40 bg-success-soft/30"
                      : "border-border bg-card hover:border-brand/30"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleToggleSubstep(s.id)}
                    className="flex w-full items-start gap-3 text-left"
                  >
                    <div className="mt-0.5 shrink-0">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-muted-foreground">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span
                          className={`text-[13px] font-semibold leading-snug ${
                            done ? "text-muted-foreground line-through" : "text-navy"
                          }`}
                        >
                          {s.title}
                        </span>
                      </div>
                      <p
                        className={`mt-1.5 text-[12.5px] leading-relaxed ${
                          done ? "text-muted-foreground/80" : "text-foreground"
                        }`}
                      >
                        {s.detail}
                      </p>
                      {s.why && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-brand-soft/40 border border-brand/20 px-2.5 py-1.5">
                          <Info className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
                          <p className="text-[11.5px] leading-relaxed text-navy">
                            <span className="font-semibold">Why this matters: </span>
                            {s.why}
                          </p>
                        </div>
                      )}
                      {s.hint && !done && (
                        <div className="mt-2 flex items-start gap-1.5 rounded-md bg-warn-soft/50 border border-warn/20 px-2.5 py-1.5">
                          <Lightbulb className="h-3.5 w-3.5 text-warn-foreground mt-0.5 shrink-0" />
                          <p className="text-[11.5px] leading-relaxed text-warn-foreground">
                            {s.hint}
                          </p>
                        </div>
                      )}
                    </div>
                  </button>

                  {/* Contextual inputs for this substep */}
                  {fieldsForStep.length > 0 && (
                    <div
                      className={`mt-3 ml-8 pl-3.5 border-l-2 ${
                        done ? "border-success/40" : "border-brand/30"
                      } space-y-3`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="text-[10.5px] uppercase tracking-[0.08em] font-semibold text-brand">
                        Inputs needed for this step
                      </div>
                      {fieldsForStep.map((f) => (
                        <FormFieldInput
                          key={f.id}
                          field={f}
                          value={progress?.formInputs?.[f.id] ?? ""}
                          onChange={(v) => setInput(id, f.id, v)}
                          row={row}
                        />
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        </Section>

        {/* Catch-all: any inputs not bound to a specific substep + notes */}
        {(playbook.formFields.some((f) => !f.substepId) || true) && (
          <Section
            title="Additional details"
            subtitle="Optional context that flows into the generated documents and the final submission pack."
          >
            <div className="space-y-3">
              {playbook.formFields
                .filter((f) => !f.substepId)
                .map((f) => (
                  <FormFieldInput
                    key={f.id}
                    field={f}
                    value={progress?.formInputs?.[f.id] ?? ""}
                    onChange={(v) => setInput(id, f.id, v)}
                    row={row}
                  />
                ))}
              <div>
                <label className="block text-[12px] font-medium text-navy mb-1">
                  Notes (optional)
                </label>
                <textarea
                  rows={2}
                  value={progress?.notes ?? ""}
                  onChange={(e) => setNotes(id, e.target.value)}
                  placeholder="Anything the regulator should know about how you implemented this control."
                  className="w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                />
              </div>
            </div>
          </Section>
        )}

        {/* Existing-policy upload + AI coverage check */}
        <Section
          title="Have an existing policy?"
          subtitle="Upload it and let Complee compare it against the regulator's substeps. We highlight gaps and write paste-ready additions for anything missing."
        >
          <PolicyUploadWidget
            row={row}
            substeps={playbook.substeps}
            assessmentId={activeAssessmentId}
            requirementId={row.requirement.id ?? row.requirement.title}
          />
        </Section>

        {/* Documents */}
        {playbook.documents.length > 0 && (
          <Section
            title="Generated documents"
            subtitle="Complee builds these from your inputs above. Download as PDF or DOCX."
          >
            <ul className="space-y-2.5">
              {playbook.documents.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-border bg-card p-3.5"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-navy">{d.title}</div>
                      <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                        {d.description}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => handleGenerate(d.id, "pdf")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[11.5px] font-medium text-navy hover:bg-card"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        PDF
                      </button>
                      <button
                        onClick={() => handleGenerate(d.id, "docx")}
                        className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface-muted px-2.5 py-1.5 text-[11.5px] font-medium text-navy hover:bg-card"
                      >
                        <FileDown className="h-3.5 w-3.5" />
                        DOCX
                      </button>
                      <button
                        onClick={() => handleSignDocument(d.id)}
                        disabled={savingDocId === d.id}
                        className="inline-flex items-center gap-1.5 rounded-md border border-brand/30 bg-brand-soft px-2.5 py-1.5 text-[11.5px] font-medium text-brand hover:bg-brand-soft/80 disabled:opacity-60"
                      >
                        <FileSignature className="h-3.5 w-3.5" />
                        {savingDocId === d.id ? "Preparing…" : "View & sign"}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Resources */}
        {playbook.resources.length > 0 && (
          <Section title="Reference material">
            <ul className="space-y-1.5">
              {playbook.resources.map((r) => (
                <li key={r.href}>
                  <a
                    href={r.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-brand hover:text-brand/80"
                  >
                    {r.label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border px-5 sm:px-6 py-4 bg-surface-muted/40">
        {isDone ? (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-[13px] text-success-foreground font-medium">
              <CheckCircle2 className="h-4 w-4 text-success" />
              Step completed · saved to your account
            </div>
            {nextTask ? (
              <button
                onClick={() => onAdvance(nextTask)}
                className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-navy/90"
              >
                Go to next step
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-navy hover:bg-surface-muted"
              >
                Close
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <p className="text-[12px] text-muted-foreground">
              {!allSubstepsDone
                ? `Complete all ${totalSubsteps} substeps to finish this step.`
                : !requiredFilled
                  ? "Fill in the required inputs to finish this step."
                  : "Ready to mark this step as complete."}
            </p>
            <button
              onClick={handleComplete}
              disabled={!canComplete}
              className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Complete step
              {nextTask && <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          </div>
        )}
      </div>
    </Shell>
    <DocumentViewer
      document={signDoc}
      open={!!signDoc}
      onOpenChange={(v) => !v && setSignDoc(null)}
      onSigned={() => {
        toast.success("Signed document saved", {
          description: "Available in your document library.",
        });
        setSignDoc(null);
      }}
      defaultSignerName={profile.companyName}
    />
    </>
  );
}

function FormFieldInput({
  field,
  value,
  onChange,
  row,
}: {
  field: FormField;
  value: string;
  onChange: (v: string) => void;
  /** The active requirement row — gives widgets access to country / institution. */
  row?: AssessmentResultRow;
}) {
  const [showWhy, setShowWhy] = useState(false);
  const labelEl = (
    <div className="flex items-center gap-1.5 mb-1">
      <span className="text-[12px] font-medium text-navy">
        {field.label}
        {field.required && <span className="text-danger ml-0.5">*</span>}
      </span>
      {field.why && (
        <button
          type="button"
          onClick={() => setShowWhy((s) => !s)}
          className="text-muted-foreground hover:text-brand"
          aria-label="Why is this needed?"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
  const whyPanel = showWhy && field.why && (
    <div className="mb-2 rounded-md border border-brand/20 bg-brand-soft/40 px-2.5 py-1.5 text-[11.5px] text-navy leading-relaxed">
      <span className="font-semibold">Why: </span>
      {field.why}
    </div>
  );
  const helper = field.helper ? (
    <span className="block text-[11px] text-muted-foreground mt-1">{field.helper}</span>
  ) : null;
  const example = field.example ? (
    <span className="block text-[11px] text-muted-foreground mt-1 italic">
      Example: {field.example}
    </span>
  ) : null;
  const baseCls =
    "w-full rounded-lg border border-border bg-card px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

  // Specialised widgets
  if (field.type === "capital_threshold_lookup") {
    // Pick institution from the requirement's applies_to list (first match
    // is good enough — capital requirements rarely span multiple types).
    const institution = row?.requirement.applies_to?.[0] ?? "EMI";
    const country = row?.requirement.country ?? "EU";
    return (
      <div>
        {labelEl}
        {whyPanel}
        <CapitalThresholdLookup
          value={value}
          onChange={onChange}
          institution={institution}
          country={country}
        />
      </div>
    );
  }
  if (field.type === "capital_calculator") {
    const institution = row?.requirement.applies_to?.[0] ?? "EMI";
    const country = row?.requirement.country ?? "EU";
    return (
      <div>
        {labelEl}
        {whyPanel}
        <CapitalCalculator
          value={value}
          onChange={onChange}
          institution={institution}
          country={country}
        />
      </div>
    );
  }
  if (field.type === "capital_structure_table") {
    return (
      <div>
        {labelEl}
        {whyPanel}
        <CapitalStructureTable value={value} onChange={onChange} />
      </div>
    );
  }
  if (field.type === "multi_select" && field.options) {
    return (
      <div>
        {labelEl}
        {whyPanel}
        <MultiSelectChips value={value} options={field.options} onChange={onChange} />
        {helper}
      </div>
    );
  }
  if (field.type === "radio_explained" && field.radioOptions) {
    return (
      <div>
        {labelEl}
        {whyPanel}
        <RadioExplained value={value} options={field.radioOptions} onChange={onChange} />
        {helper}
      </div>
    );
  }

  if (field.type === "textarea") {
    return (
      <label className="block">
        {labelEl}
        {whyPanel}
        <textarea
          rows={3}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseCls}
        />
        {helper}
        {example}
      </label>
    );
  }
  if (field.type === "select" && field.options) {
    return (
      <label className="block">
        {labelEl}
        {whyPanel}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={baseCls}>
          <option value="">Select…</option>
          {field.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {helper}
      </label>
    );
  }
  return (
    <label className="block">
      {labelEl}
      {whyPanel}
      <input
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        className={baseCls}
      />
      {helper}
      {example}
    </label>
  );
}

function AuthGate({ onSignIn, onClose }: { onSignIn: () => void; onClose: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <div className="max-w-[360px] text-center">
        <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center">
          <Lock className="h-5 w-5" />
        </div>
        <h3 className="text-[18px] font-semibold text-navy">Sign in to start the roadmap</h3>
        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">
          Your progress, inputs, and generated documents are saved to your account so you can
          pause anytime and continue from any device.
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            onClick={onSignIn}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 shadow-sm"
          >
            Sign in or create account
          </button>
          <button
            onClick={onClose}
            className="text-[12px] text-muted-foreground hover:text-foreground"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-1">
        {title}
      </h4>
      {subtitle && <p className="text-[12px] text-muted-foreground mb-3">{subtitle}</p>}
      {!subtitle && <div className="mb-2" />}
      {children}
    </div>
  );
}

function Shell({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-navy/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[48%] sm:min-w-[560px] bg-card border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {children}
      </aside>
    </>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-[12.5px] text-navy leading-snug">{value}</div>
    </div>
  );
}
