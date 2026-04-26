import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Code2,
  ExternalLink,
  FileDown,
  PlayCircle,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { ReviewerInviteDialog } from "@/components/complee/ReviewerInviteDialog";
import { useWorkspaces } from "@/store/workspaces";
import { UserPlus } from "lucide-react";

import { useAssessment } from "@/store/assessment";
import { useStepProgress } from "@/store/stepProgress";
import { useAuth } from "@/hooks/useAuth";
import {
  getRegulatorByCountry,
  getRequirements,
  getRequirementsMeta,
  type AssessmentResult,
  type AssessmentResultRow,
  type RequirementStatus,
} from "@/data/requirements";
import { runGapAnalysis, teamForCategory } from "@/lib/gapAnalysis";
import { taskKey } from "@/lib/playbook";
import { generateMasterDocument } from "@/lib/documentGenerator";
import { formatCost, formatISODate } from "@/lib/format";
import { toast } from "sonner";

export const Route = createFileRoute("/results")({
  head: () => ({ meta: [{ title: "Readiness results — Complee" }] }),
  component: Results,
});

const PAGE_SIZE = 10;

function Results() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, assessmentResults, setAssessmentResults, resetAssessment, completedTasks } =
    useAssessment();

  // Run analysis on mount unless we already have a result for this same target.
  useEffect(() => {
    if (
      !assessmentResults ||
      assessmentResults.targetCountry !== profile.targetCountry ||
      assessmentResults.homeCountry !== profile.homeCountry
    ) {
      try {
        const result = runGapAnalysis(profile, getRequirements());
        setAssessmentResults(result);
      } catch {
        navigate({ to: "/error" });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result: AssessmentResult | null = assessmentResults;
  const target = getRegulatorByCountry(profile.targetCountry);
  const meta = getRequirementsMeta();

  const [selected, setSelected] = useState<AssessmentResultRow | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const activeWorkspaceId = useWorkspaces((s) => s.activeId);

  const [page, setPage] = useState(1);

  const rows = result?.rows ?? [];
  const paginated = rows.length > 15;
  const totalPages = paginated ? Math.ceil(rows.length / PAGE_SIZE) : 1;
  const visibleRows = paginated
    ? rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
    : rows;

  // Roadmap groups
  const roadmap = useMemo(() => {
    const groups: Record<string, AssessmentResultRow[]> = {
      Compliance: [],
      Operations: [],
      Engineering: [],
    };
    rows
      .filter((r) => r.status === "missing" || r.status === "partial")
      .forEach((r) => {
        const team = teamForCategory(r.requirement.category as string);
        if (team) groups[team].push(r);
      });
    return groups;
  }, [rows]);

  const { byKey, reset: resetProgress } = useStepProgress();

  const handleReset = () => {
    resetAssessment();
    resetProgress();
    navigate({ to: "/profile" });
  };

  const handleDownloadPack = async (format: "pdf" | "docx") => {
    if (rows.length === 0) return;
    try {
      const progress: Record<
        string,
        { status: "todo" | "in_progress" | "done"; completedSubsteps: string[]; formInputs: Record<string, string>; notes?: string }
      > = {};
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

  return (
    <Chrome>
      <div className="max-w-[1280px] mx-auto px-5 sm:px-6 py-8 sm:py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2">
              Step 5 — Results
            </p>
            <h1 className="text-[24px] sm:text-[30px] font-semibold tracking-tight text-navy">
              {profile.companyName} expansion readiness
            </h1>
            <p className="mt-2 text-[13px] sm:text-[14px] text-muted-foreground">
              Assessment against{" "}
              <span className="font-medium text-navy">
                {target?.authority ?? profile.targetCountry}
              </span>{" "}
              requirements for entering{" "}
              <span className="font-medium text-navy">
                {target?.flag} {target?.country ?? profile.targetCountry}
              </span>
              .
            </p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              Data version {meta.version} · Extracted {formatISODate(meta.generated_at)}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {activeWorkspaceId && (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-[12.5px] font-medium text-navy hover:bg-surface-muted"
                title="Invite an external lawyer or compliance expert to review this package"
              >
                <UserPlus className="h-3.5 w-3.5 text-brand" />
                Invite reviewer
              </button>
            )}
            {result && rows.length > 0 && (
              <ReadinessBadge score={result.readinessScore} />
            )}
          </div>
        </div>

        {activeWorkspaceId && (
          <ReviewerInviteDialog
            open={inviteOpen}
            onOpenChange={setInviteOpen}
            assessmentId={activeWorkspaceId}
            workspaceName={profile.companyName}
          />
        )}

        {/* Empty state */}
        {result && rows.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-soft">
              <ShieldCheck className="h-6 w-6 text-brand" />
            </div>
            <h2 className="text-[18px] font-semibold text-navy">
              We're still expanding our coverage
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground max-w-[520px] mx-auto">
              We are still expanding our coverage to{" "}
              {target?.country ?? profile.targetCountry}. Please contact us to request priority
              data ingestion.
            </p>
            <div className="mt-6 flex justify-center gap-3 flex-wrap">
              <button
                onClick={handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-navy/90"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Try a different target market
              </button>
            </div>
          </div>
        )}

        {/* Stats */}
        {result && rows.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-8 sm:mb-10">
            <StatCard
              label="Total requirements"
              value={result.totalRequirements}
              accent="bg-muted-foreground/40"
            />
            <StatCard label="Covered" value={result.covered} accent="bg-success" />
            <StatCard label="Partial" value={result.partial} accent="bg-warn" />
            <StatCard label="Missing" value={result.missing} accent="bg-danger" />
          </div>
        )}

        {/* Matrix */}
        {result && rows.length > 0 && (
          <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden mb-8 sm:mb-10">
            <div className="px-5 sm:px-6 py-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
              <h2 className="text-[15px] font-semibold text-navy">Readiness matrix</h2>
              <span className="text-[12px] text-muted-foreground">
                {paginated
                  ? `Showing ${(page - 1) * PAGE_SIZE + 1}–${Math.min(
                      page * PAGE_SIZE,
                      rows.length,
                    )} of ${rows.length} requirements`
                  : `${rows.length} requirements analysed`}
              </span>
            </div>

            {/* Desktop table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-surface-muted text-left text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
                    <th className="px-5 py-3 font-medium">Requirement</th>
                    <th className="px-4 py-3 font-medium">Regulation</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Priority</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Confidence</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((row, i) => (
                    <tr
                      key={`${row.requirement.title}-${i}`}
                      className="border-t border-border hover:bg-surface-muted/60 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-navy">{row.requirement.title}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {row.requirement.authority}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {row.requirement.regulation_reference}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground capitalize">
                        {String(row.requirement.category).replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3.5">
                        <PriorityPill priority={row.requirement.priority} />
                      </td>
                      <td className="px-4 py-3.5">
                        <StatusPill status={row.status} />
                      </td>
                      <td className="px-4 py-3.5 text-right tabular-nums text-foreground">
                        {Math.round(row.confidence)}%
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={() => setSelected(row)}
                          className="text-[12px] font-medium text-brand hover:text-brand/80 transition-colors whitespace-nowrap"
                        >
                          View details →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="sm:hidden divide-y divide-border">
              {visibleRows.map((row, i) => (
                <div key={`m-${row.requirement.title}-${i}`} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[14px] font-semibold text-navy">
                        {row.requirement.title}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {row.requirement.authority} · {row.requirement.regulation_reference}
                      </div>
                    </div>
                    <StatusPill status={row.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <PriorityPill priority={row.requirement.priority} />
                    <span className="text-[11px] text-muted-foreground capitalize">
                      {String(row.requirement.category).replace(/_/g, " ")}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">
                      {Math.round(row.confidence)}% confidence
                    </span>
                  </div>
                  <button
                    onClick={() => setSelected(row)}
                    className="mt-3 w-full rounded-lg border border-border bg-surface-muted px-3 py-2 text-[12px] font-medium text-brand hover:bg-card transition-colors"
                  >
                    View details
                  </button>
                </div>
              ))}
            </div>

            {paginated && (
              <div className="px-5 sm:px-6 py-3 border-t border-border flex items-center justify-between gap-3 flex-wrap">
                <span className="text-[12px] text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Prev
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-[12px] font-medium text-navy hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Roadmap */}
        {result && rows.length > 0 && (
          <div className="mb-10">
            <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
              <div>
                <h2 className="text-[18px] font-semibold tracking-tight text-navy">
                  Execution roadmap
                </h2>
                <p className="text-[12.5px] text-muted-foreground mt-1">
                  Click any step to open the guided walkthrough — Complee tells you exactly what
                  to do, then unlocks the next step.
                </p>
              </div>
              {(() => {
                const allTasks = Object.values(roadmap).flat();
                const doneCount = allTasks.filter((r) =>
                  completedTasks.includes(taskKey(r)),
                ).length;
                const next = allTasks.find((r) => !completedTasks.includes(taskKey(r)));
                if (allTasks.length === 0) return null;
                return (
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
                        Roadmap progress
                      </div>
                      <div className="text-[14px] font-semibold text-navy tabular-nums">
                        {doneCount} / {allTasks.length} steps done
                      </div>
                    </div>
                    {next && (
                      user ? (
                        <Link
                          to="/account"
                          className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          {doneCount === 0 ? "Start in your account" : "Continue in your account"}
                        </Link>
                      ) : (
                        <Link
                          to="/auth"
                          className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 shadow-sm"
                        >
                          <PlayCircle className="h-4 w-4" />
                          Sign up to start your roadmap
                        </Link>
                      )
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Final submission pack */}
            <div className="rounded-2xl border border-brand/30 bg-brand-soft/30 p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-9 w-9 rounded-lg bg-brand text-brand-foreground flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-navy">
                    Final submission pack
                  </div>
                  <p className="text-[12px] text-muted-foreground leading-relaxed">
                    One consolidated document with every requirement, your inputs, and the generated annexes — ready to submit to {target?.authority ?? profile.targetCountry}.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:shrink-0">
                <button
                  onClick={() => handleDownloadPack("pdf")}
                  className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-3.5 py-2 text-[12.5px] font-medium hover:bg-navy/90 shadow-sm"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  PDF
                </button>
                <button
                  onClick={() => handleDownloadPack("docx")}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2 text-[12.5px] font-medium text-navy hover:bg-surface-muted"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  DOCX
                </button>
              </div>
            </div>

            {Object.values(roadmap).every((g) => g.length === 0) ? (
              <div className="rounded-2xl border border-success/30 bg-success-soft/40 p-6 text-center">
                <p className="text-[14px] text-navy">
                  No remediation tasks — every requirement is already covered. 🎉
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(["Compliance", "Operations", "Engineering"] as const).map((team) => {
                  const items = roadmap[team];
                  if (items.length === 0) return null;
                  const Icon =
                    team === "Compliance"
                      ? ShieldCheck
                      : team === "Operations"
                        ? Building2
                        : team === "Engineering"
                          ? Code2
                          : Wrench;
                  const totalDays = items.reduce(
                    (a, b) => a + (b.requirement.typical_effort_days ?? 0),
                    0,
                  );
                  const teamDone = items.filter((r) =>
                    completedTasks.includes(taskKey(r)),
                  ).length;
                  const teamProgress = Math.round((teamDone / items.length) * 100);
                  return (
                    <div
                      key={team}
                      className="rounded-2xl border border-border bg-card p-5 shadow-sm flex flex-col"
                    >
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="h-9 w-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                          <Icon className="h-4.5 w-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[14px] font-semibold text-navy">{team}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {teamDone}/{items.length} done · ~{totalDays} days
                          </div>
                        </div>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-muted overflow-hidden mb-4">
                        <div
                          className="h-full bg-brand transition-all duration-500"
                          style={{ width: `${teamProgress}%` }}
                        />
                      </div>
                      <ul className="space-y-2.5">
                        {items.map((row, i) => {
                          const id = taskKey(row);
                          const done = completedTasks.includes(id);
                          const prevDone =
                            i === 0 || completedTasks.includes(taskKey(items[i - 1]));
                          const isNext = !done && prevDone;
                          return (
                            <li key={`${id}-${i}`}>
                              <div
                                className={`w-full text-left rounded-lg border px-3 py-2.5 ${
                                  done
                                    ? "border-success/40 bg-success-soft/30"
                                    : isNext
                                      ? "border-brand/40 bg-brand-soft/30 ring-1 ring-brand/20"
                                      : "border-border bg-surface-muted"
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex items-start gap-2">
                                    <div className="mt-0.5 shrink-0">
                                      {done ? (
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                      ) : isNext ? (
                                        <Sparkles className="h-4 w-4 text-brand" />
                                      ) : (
                                        <PlayCircle className="h-4 w-4 text-muted-foreground" />
                                      )}
                                    </div>
                                    <div className="min-w-0">
                                      <div
                                        className={`text-[13px] font-medium ${
                                          done
                                            ? "text-muted-foreground line-through"
                                            : "text-navy"
                                        }`}
                                      >
                                        {row.requirement.title}
                                      </div>
                                      <div className="text-[11px] text-muted-foreground mt-0.5">
                                        {row.requirement.regulation_reference}
                                      </div>
                                    </div>
                                  </div>
                                  <StatusPill status={row.status} />
                                </div>
                                <div className="mt-2 flex items-center justify-between gap-2 flex-wrap pl-6">
                                  <PriorityPill priority={row.requirement.priority} />
                                  <div className="text-right text-[11px] text-muted-foreground tabular-nums">
                                    {row.requirement.typical_effort_days}d ·{" "}
                                    <span className="text-navy font-medium">
                                      {formatCost(
                                        row.requirement.typical_cost_eur,
                                        profile.targetCountry,
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link
            to="/documents"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to documents
          </Link>
          {(() => {
            const queue = [...roadmap.Compliance, ...roadmap.Operations, ...roadmap.Engineering];
            if (queue.length === 0) return null;
            return user ? (
              <Link
                to="/account"
                className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 transition-colors shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Continue in your account
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 rounded-lg bg-brand text-brand-foreground px-4 py-2.5 text-[13px] font-medium hover:bg-brand/90 transition-colors shadow-sm"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                Sign up to start your roadmap
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            );
          })()}
        </div>
      </div>

      <DetailPanel row={selected} onClose={() => setSelected(null)} />
    </Chrome>
  );
}

function ReadinessBadge({ score }: { score: number }) {
  const tone =
    score >= 75
      ? "bg-success-soft text-success-foreground border-success/40"
      : score >= 50
        ? "bg-warn-soft text-warn-foreground border-warn/40"
        : "bg-danger-soft text-danger border-danger/40";
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] font-semibold ${tone}`}
    >
      <ShieldCheck className="h-4 w-4" />
      {Math.round(score)}% ready
    </span>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      <div className={`h-1 ${accent}`} />
      <div className="p-4 sm:p-5">
        <div className="text-[11px] sm:text-[12px] font-medium text-muted-foreground uppercase tracking-[0.06em]">
          {label}
        </div>
        <div className="mt-2 text-[26px] sm:text-[32px] font-semibold tracking-tight text-navy tabular-nums">
          {value}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: RequirementStatus }) {
  const map: Record<RequirementStatus, string> = {
    covered: "bg-success-soft text-success-foreground border-success/40",
    partial: "bg-warn-soft text-warn-foreground border-warn/40",
    missing: "bg-danger-soft text-danger border-danger/40",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium capitalize ${map[status]}`}
    >
      {status}
    </span>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const map: Record<string, string> = {
    critical: "bg-danger-soft text-danger border-danger/40",
    high: "bg-warn-soft text-warn-foreground border-warn/40",
    medium: "bg-brand-soft text-navy border-brand/30",
    low: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] font-semibold ${
        map[priority] ?? map.medium
      }`}
    >
      {priority}
    </span>
  );
}

function DetailPanel({
  row,
  onClose,
}: {
  row: AssessmentResultRow | null;
  onClose: () => void;
}) {
  const open = !!row;
  const { profile } = useAssessment();
  const target = getRegulatorByCountry(profile.targetCountry);

  const NA = "Not available";
  const safe = (v: string | undefined | null) => (v && String(v).trim() ? v : NA);

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-navy/30 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-[40%] sm:min-w-[480px] bg-card border-l border-border shadow-2xl z-50 transition-transform duration-300 ease-out flex flex-col ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        {row && (
          <>
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-border flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <StatusPill status={row.status} />
                  <PriorityPill priority={row.requirement.priority} />
                </div>
                <h3 className="text-[16px] sm:text-[18px] font-semibold tracking-tight text-navy leading-tight">
                  {row.requirement.title}
                </h3>
                <div className="mt-1 text-[12px] text-muted-foreground">
                  {safe(row.requirement.authority)} · {safe(row.requirement.country)}
                </div>
              </div>
              <button
                onClick={onClose}
                className="h-8 w-8 rounded-md hover:bg-surface-muted flex items-center justify-center text-muted-foreground"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 sm:px-6 py-5 space-y-6">
              <Section title="Description">
                <p className="text-[13px] leading-relaxed text-foreground">
                  {safe(row.requirement.description)}
                </p>
              </Section>

              <Section title="Evidence quote">
                <blockquote className="rounded-lg border-l-2 border-brand bg-brand-soft/40 px-4 py-3 text-[13px] leading-relaxed text-navy italic">
                  "{safe(row.evidenceExcerpt || row.requirement.evidence_quote)}"
                </blockquote>
              </Section>

              <Section title="Recommended remediation">
                <p className="text-[13px] leading-relaxed text-foreground">
                  {safe(row.recommendedAction)}
                </p>
              </Section>

              <div className="grid grid-cols-2 gap-3">
                <Meta label="Regulation reference" value={safe(row.requirement.regulation_reference)} />
                <Meta
                  label="Category"
                  value={
                    <span className="capitalize">
                      {safe(String(row.requirement.category).replace(/_/g, " "))}
                    </span>
                  }
                />
                <Meta label="Confidence" value={`${Math.round(row.confidence)}%`} />
                <Meta
                  label="Effort"
                  value={
                    row.requirement.typical_effort_days > 0
                      ? `${row.requirement.typical_effort_days} person-days`
                      : NA
                  }
                />
                <Meta
                  label="Typical cost"
                  value={
                    row.requirement.typical_cost_eur
                      ? formatCost(row.requirement.typical_cost_eur, profile.targetCountry)
                      : NA
                  }
                />
                <Meta
                  label="Source"
                  value={
                    row.requirement.source_url ? (
                      <a
                        href={row.requirement.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand hover:text-brand/80 truncate"
                      >
                        {target?.authority ?? "Open"} <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    ) : (
                      NA
                    )
                  }
                />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-[11px] uppercase tracking-[0.1em] font-semibold text-muted-foreground mb-2">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2.5">
      <div className="text-[10px] uppercase tracking-[0.08em] text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 text-[13px] font-medium text-navy break-words">{value}</div>
    </div>
  );
}
