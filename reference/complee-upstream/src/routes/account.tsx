import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  FileDown,
  LogOut,
  PlayCircle,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { RoadmapGuide } from "@/components/complee/RoadmapGuide";
import { useAuth } from "@/hooks/useAuth";
import { useAssessment } from "@/store/assessment";
import { useStepProgress } from "@/store/stepProgress";
import { getRegulatorByCountry, getRequirements } from "@/data/requirements";
import { runGapAnalysis } from "@/lib/gapAnalysis";
import { taskKey } from "@/lib/playbook";
import { generateMasterDocument } from "@/lib/documentGenerator";
import type { AssessmentResultRow } from "@/data/requirements";
import { toast } from "sonner";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Your account — Complee" }] }),
  component: Account,
});

function Account() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const { profile, assessmentResults, setAssessmentResults } = useAssessment();
  const { byKey } = useStepProgress();
  const [guideRow, setGuideRow] = useState<AssessmentResultRow | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  // Make sure we have results for this profile.
  useEffect(() => {
    if (!assessmentResults && profile.targetCountry) {
      try {
        setAssessmentResults(runGapAnalysis(profile, getRequirements()));
      } catch {
        /* noop */
      }
    }
  }, [assessmentResults, profile, setAssessmentResults]);

  const target = getRegulatorByCountry(profile.targetCountry);
  const rows = assessmentResults?.rows ?? [];
  const remediation = useMemo(
    () => rows.filter((r) => r.status !== "covered"),
    [rows],
  );

  const completed = remediation.filter((r) => byKey[taskKey(r)]?.status === "done").length;
  const inProgress = remediation.filter((r) => {
    const p = byKey[taskKey(r)];
    return p && (p.status === "in_progress" || (p.status !== "done" && p.completedSubsteps.length > 0));
  }).length;
  const total = remediation.length;
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  const next = remediation.find((r) => byKey[taskKey(r)]?.status !== "done");

  const handleDownload = async (format: "pdf" | "docx") => {
    if (rows.length === 0) {
      toast.error("Run an assessment first");
      return;
    }
    try {
      const progress: Record<string, { status: "todo" | "in_progress" | "done"; completedSubsteps: string[]; formInputs: Record<string, string>; notes?: string }> = {};
      for (const k of Object.keys(byKey)) {
        const v = byKey[k];
        progress[k] = {
          status: v.status,
          completedSubsteps: v.completedSubsteps,
          formInputs: v.formInputs,
          notes: v.notes,
        };
      }
      await generateMasterDocument({ profile, rows, progress, format });
      toast.success(`Submission pack downloaded (${format.toUpperCase()})`);
    } catch (e) {
      toast.error("Failed to generate document", {
        description: e instanceof Error ? e.message : String(e),
      });
    }
  };

  if (loading || !user) {
    return (
      <Chrome>
        <div className="max-w-[1100px] mx-auto px-5 py-16 text-center text-muted-foreground text-[13px]">
          Loading account…
        </div>
      </Chrome>
    );
  }

  const displayName =
    (user.user_metadata?.display_name as string | undefined) ??
    user.email?.split("@")[0] ??
    "there";

  return (
    <Chrome>
      <div className="max-w-[1100px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2">
              Your workspace
            </p>
            <h1 className="text-[26px] sm:text-[30px] font-semibold tracking-tight text-navy">
              Welcome back, {displayName}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {profile.companyName} · {profile.institutionType} expanding into{" "}
              <span className="font-medium text-navy">
                {target?.flag} {target?.country ?? profile.targetCountry}
              </span>
            </p>
          </div>
          <button
            onClick={async () => {
              await signOut();
              navigate({ to: "/" });
            }}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-navy hover:bg-surface-muted self-start"
          >
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </button>
        </div>

        {/* Stats + progress */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <ProgressCard pct={pct} completed={completed} total={total} />
          <Stat
            icon={<Clock className="h-4 w-4" />}
            label="In progress"
            value={inProgress}
            tone="warn"
          />
          <Stat
            icon={<CheckCircle2 className="h-4 w-4" />}
            label="Completed"
            value={completed}
            tone="success"
          />
        </div>

        {/* CTAs */}
        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-[16px] font-semibold text-navy">Continue your roadmap</h2>
              <p className="mt-1 text-[12.5px] text-muted-foreground">
                {next
                  ? `Next up: ${next.requirement.title}`
                  : total === 0
                    ? "Run an assessment to generate your roadmap."
                    : "All steps complete — generate your final submission pack."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {total > 0 && next && (
                <button
                  onClick={() => setGuideRow(next)}
                  className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 shadow-sm"
                >
                  <PlayCircle className="h-4 w-4" />
                  {completed > 0 ? "Continue roadmap" : "Start roadmap"}
                </button>
              )}
              {total === 0 && (
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 shadow-sm"
                >
                  Start assessment
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Final pack */}
        {total > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 rounded-lg bg-brand-soft text-brand flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-[16px] font-semibold text-navy">Authorisation submission pack</h2>
                <p className="mt-1 text-[12.5px] text-muted-foreground leading-relaxed">
                  Consolidates every requirement, your inputs, and the generated annexes into
                  a single document you can submit to{" "}
                  <span className="font-medium text-navy">{target?.authority ?? profile.targetCountry}</span>.
                  {pct < 100 && " Available now (incomplete steps will show as TODO)."}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handleDownload("pdf")}
                className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-navy/90 shadow-sm"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </button>
              <button
                onClick={() => handleDownload("docx")}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-navy hover:bg-surface-muted"
              >
                <FileDown className="h-4 w-4" />
                Download DOCX
              </button>
            </div>
          </div>
        )}

        {/* Requirement list */}
        {total > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h2 className="text-[15px] font-semibold text-navy">Requirements & status</h2>
            </div>
            <ul className="divide-y divide-border">
              {remediation.map((row) => {
                const k = taskKey(row);
                const p = byKey[k];
                const status = p?.status ?? "todo";
                const sub = p?.completedSubsteps.length ?? 0;
                return (
                  <li
                    key={k}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-surface-muted/40"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {status === "done" ? (
                          <CheckCircle2 className="h-4.5 w-4.5 text-success" />
                        ) : status === "in_progress" || sub > 0 ? (
                          <Clock className="h-4.5 w-4.5 text-warn-foreground" />
                        ) : (
                          <Circle className="h-4.5 w-4.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div
                          className={`text-[13px] font-medium truncate ${
                            status === "done" ? "text-muted-foreground line-through" : "text-navy"
                          }`}
                        >
                          {row.requirement.title}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {row.requirement.regulation_reference}
                          {sub > 0 && status !== "done" && ` · ${sub} substep${sub === 1 ? "" : "s"} done`}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setGuideRow(row)}
                      className="text-[12px] font-medium text-brand hover:text-brand/80 whitespace-nowrap"
                    >
                      {status === "done" ? "Review →" : "Open →"}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <RoadmapGuide
        row={guideRow}
        queue={remediation}
        onClose={() => setGuideRow(null)}
        onAdvance={(next) => setGuideRow(next)}
      />
    </Chrome>
  );
}

function ProgressCard({
  pct,
  completed,
  total,
}: {
  pct: number;
  completed: number;
  total: number;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] text-brand font-semibold mb-3">
        <UserIcon className="h-3.5 w-3.5" />
        Overall readiness
      </div>
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-[34px] font-semibold text-navy tabular-nums">{pct}%</span>
        <span className="text-[12px] text-muted-foreground">
          {completed} of {total} steps
        </span>
      </div>
      <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
        <div
          className="h-full bg-brand transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  tone: "warn" | "success";
}) {
  const colors =
    tone === "success"
      ? "bg-success-soft text-success-foreground"
      : "bg-warn-soft text-warn-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm p-5">
      <div className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium ${colors}`}>
        {icon}
        {label}
      </div>
      <div className="mt-3 text-[34px] font-semibold text-navy tabular-nums">{value}</div>
    </div>
  );
}
