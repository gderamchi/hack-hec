"use client";

import {
  AlertTriangle,
  ArrowLeft,
  BrainCircuit,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  FileCheck2,
  Loader2,
  Lock,
  Network,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type {
  ConflictCheckResponse,
  ConflictFlag,
  PlanWithEvent,
  RemediationAction
} from "@/lib/agent-types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EFFORT_COLOR = { high: "text-red-500 bg-red-50", medium: "text-amber-500 bg-amber-50", low: "text-green-500 bg-green-50" } as const;
const URGENCY_BG = {
  critical: "bg-red-100 border-red-200 text-red-700",
  high: "bg-orange-100 border-orange-200 text-orange-700",
  medium: "bg-amber-100 border-amber-200 text-amber-700",
  low: "bg-slate-100 border-slate-200 text-slate-700"
} as const;
const ASSET_ACTION_COLOR = {
  update: "bg-amber-100 text-amber-800",
  review: "bg-blue-100 text-blue-800",
  create: "bg-green-100 text-green-800",
  retire: "bg-red-100 text-red-800"
} as const;

async function fetchPlan(planId: string): Promise<PlanWithEvent | null> {
  const res = await fetch(`/api/agent/plan/${planId}`).catch(() => null);
  if (!res?.ok) return null;
  const data = await res.json() as { plan: PlanWithEvent };
  return data.plan;
}

// ─── Plan Review Page ─────────────────────────────────────────────────────────

export default function PlanReviewPage() {
  const params = useParams();
  const router = useRouter();
  const planId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<PlanWithEvent | null>(null);
  const [actions, setActions] = useState<RemediationAction[]>([]);
  const [conflictResult, setConflictResult] = useState<ConflictCheckResponse | null>(null);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [acceptName, setAcceptName] = useState("");
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [savingActions, setSavingActions] = useState(false);
  const [expandedObligation, setExpandedObligation] = useState<string | null>(null);

  // ── Load plan ────────────────────────────────────────────────────────────

  const applyPlan = useCallback((nextPlan: PlanWithEvent) => {
    setPlan(nextPlan);
    setActions(nextPlan.actions as RemediationAction[]);
    if (nextPlan.status === "accepted") setAccepted(true);
    if (nextPlan.conflict_check_status !== "pending") {
      setConflictResult({
        safe: nextPlan.conflict_check_status === "safe",
        conflicts: nextPlan.conflict_flags as ConflictFlag[],
        summary: nextPlan.conflict_check_status === "safe" ? "No conflicts found." : `${(nextPlan.conflict_flags as ConflictFlag[]).length} conflict(s) detected.`
      });
    }
  }, []);

  const loadPlan = useCallback(async () => {
    const nextPlan = await fetchPlan(planId);
    if (nextPlan) applyPlan(nextPlan);
  }, [applyPlan, planId]);

  useEffect(() => {
    let isMounted = true;

    fetchPlan(planId)
      .then((nextPlan) => {
        if (!isMounted) return;
        if (nextPlan) applyPlan(nextPlan);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [applyPlan, planId]);

  // ── Run conflict check ───────────────────────────────────────────────────

  async function runConflictCheck() {
    if (!plan) return;
    setConflictLoading(true);
    const activeRegulations = ["DORA", "PSD3/PSR", "EU AI Act", "FCA Consumer Duty"];
    const res = await fetch("/api/agent/conflict-check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.id,
        regulationName: plan.event.regulation_name,
        actions,
        activeRegulations
      })
    }).catch(() => null);
    setConflictLoading(false);
    if (!res?.ok) return;
    const data = await res.json() as ConflictCheckResponse;
    setConflictResult(data);
    await loadPlan();
  }

  // ── Save action statuses ─────────────────────────────────────────────────

  async function saveActions(updatedActions: RemediationAction[]) {
    setSavingActions(true);
    await fetch(`/api/agent/plan/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actions: updatedActions })
    }).catch(() => null);
    setSavingActions(false);
  }

  function setActionStatus(id: string, status: "accepted" | "rejected") {
    const updated = actions.map(a => a.id === id ? { ...a, status } : a);
    setActions(updated);
    saveActions(updated);
  }

  // ── Accept plan ──────────────────────────────────────────────────────────

  async function acceptPlan() {
    if (!plan) return;
    setAcceptError("");
    setAccepting(true);
    const res = await fetch("/api/agent/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId: plan.id,
        acceptedBy: acceptName.trim() || "Compliance Lead",
        acknowledgedConflicts: acknowledged
      })
    }).catch(() => null);
    setAccepting(false);
    if (!res) { setAcceptError("Network error — please retry"); return; }
    const data = await res.json() as { success?: boolean; error?: string; message?: string };
    if (!res.ok || !data.success) {
      setAcceptError(data.error ?? "Failed to accept plan");
      return;
    }
    setAccepted(true);
  }

  // ── Derived validation state ──────────────────────────────────────────────

  const pendingCount = actions.filter(a => a.status === "pending").length;
  const acceptedCount = actions.filter(a => a.status === "accepted").length;
  const hasConflicts = conflictResult && !conflictResult.safe;
  const conflictChecked = conflictResult !== null;
  const canAccept =
    !accepted &&
    conflictChecked &&
    pendingCount === 0 &&
    acceptedCount > 0 &&
    (!hasConflicts || acknowledged);

  // ─────────────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
          <p className="text-sm font-semibold text-slate-500">Loading remediation plan...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb]">
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-amber-500 mb-3" />
          <p className="text-sm font-bold text-slate-800">Plan not found</p>
          <button onClick={() => router.back()} className="mt-4 text-violet-600 text-sm font-semibold hover:underline">Return to Dashboard</button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-800 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1000px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => router.back()} className="flex items-center justify-center h-8 w-8 rounded-lg border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition">
              <ArrowLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600 text-white shadow-sm">
              <BrainCircuit className="h-4 w-4" />
            </span>
            <div>
              <span className="block text-sm font-bold text-slate-900 leading-tight">Remediation Plan Review</span>
              <span className="block text-xs font-semibold text-slate-500">{plan.event.regulation_name} · {plan.event.jurisdiction}</span>
            </div>
          </div>
          {accepted && (
            <span className="flex items-center gap-1.5 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-bold text-green-700 shadow-sm">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              Accepted & Locked
            </span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-8 sm:px-6">

        {/* ── Change Summary ──────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-violet-600 mb-1.5 flex items-center gap-1.5">
                <FileCheck2 className="h-3.5 w-3.5" />
                Regulation Changed
              </p>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{plan.event.regulation_name}</h1>
              <p className="mt-2 text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">{plan.event.change_summary}</p>
            </div>
            
            <div className="flex items-center gap-4 text-center shrink-0">
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm w-24">
                <p className={`text-3xl font-black ${plan.event.relevance_score >= 70 ? "text-red-500" : plan.event.relevance_score >= 40 ? "text-amber-500" : "text-green-500"}`}>
                  {plan.event.relevance_score}%
                </p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Relevance</p>
              </div>
              <div className="bg-white rounded-xl border border-slate-100 p-4 shadow-sm w-24">
                <p className="text-3xl font-black text-slate-800">{actions.length}</p>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-1">Tasks</p>
              </div>
            </div>
          </div>
          
          <div className="mt-5 flex items-center gap-4 pt-5 border-t border-violet-100">
            <span className="text-xs font-bold text-slate-500">Progress:</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"/>
              <span className="text-slate-700">{acceptedCount} Accepted</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"/>
              <span className="text-slate-700">{pendingCount} Pending</span>
            </div>
          </div>
        </div>

        {/* ── Conflict Check ──────────────────────────────────────────────── */}
        <div className={`rounded-2xl border p-6 shadow-sm transition-all ${
          !conflictChecked ? "border-slate-200 bg-white" : 
          plan.conflict_check_status === "auto_healed" ? "border-violet-200 bg-violet-50/50" : // Unique color for auto healed
          conflictResult?.safe ? "border-green-200 bg-green-50/50" : 
          "border-red-200 bg-red-50/50"
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {conflictLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              ) : !conflictChecked ? (
                <ShieldAlert className="h-5 w-5 text-slate-400" />
              ) : plan.conflict_check_status === "auto_healed" ? (
                <Sparkles className="h-5 w-5 text-violet-600" />
              ) : conflictResult?.safe ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600" />
              )}
              <h2 className={`text-[14px] font-bold ${plan.conflict_check_status === "auto_healed" ? "text-violet-900" : "text-slate-800"}`}>
                {conflictLoading ? "Running Cross-Regulation AI Audit..." :
                  !conflictChecked ? "Cross-Regulation Conflict Audit Required" :
                  plan.conflict_check_status === "auto_healed" ? `✨ Agent Auto-Healed ${conflictResult?.conflicts?.length || 0} Conflict(s)` :
                    conflictResult?.safe ? "✓ No Compliance Conflicts Detected" :
                      `⚠ ${conflictResult?.conflicts.length} Regulatory Conflict(s) Detected`}
              </h2>
            </div>
            {!conflictChecked && !accepted && (
              <button
                type="button"
                onClick={runConflictCheck}
                disabled={conflictLoading}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-xs font-bold tracking-wide text-white shadow hover:bg-slate-800 disabled:opacity-50 transition flex items-center gap-2"
              >
                <BrainCircuit className="h-4 w-4" />
                Run AI Audit
              </button>
            )}
          </div>

          <p className="text-[13px] font-medium text-slate-500 max-w-3xl ml-7">
            {plan.conflict_check_status === "auto_healed" 
              ? "The intelligence layer preemptively detected cross-regulation conflicts during generation and autonomously rewrote the tasks to resolve them safely."
              : conflictResult?.summary || "Before accepting tasks, the agent must check if modifying these assets breaks your existing obligations for DORA, PSD3/PSR, etc."}
          </p>

          {conflictResult && conflictResult.conflicts.length > 0 && (
            <div className="mt-5 space-y-3">
              {conflictResult.conflicts.map((c, i) => (
                <ConflictCard key={i} conflict={c} autoHealed={plan.conflict_check_status === "auto_healed"} />
              ))}
            </div>
          )}

          {/* Acknowledgement checkbox (only show if has unresolved conflicts) */}
          {hasConflicts && plan.conflict_check_status !== "auto_healed" && !accepted && (
            <div className="mt-5 rounded-xl border border-red-200 bg-white p-4 shadow-sm">
              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative flex items-center justify-center mt-0.5">
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={e => setAcknowledged(e.target.checked)}
                    className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-slate-300 checked:border-red-600 checked:bg-red-600 transition-all"
                  />
                  <CheckCircle2 className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
                </div>
                <span className="text-sm font-semibold text-slate-700 leading-snug">
                  I acknowledge these cross-regulation conflicts. I accept responsibility for ensuring these actions do not create non-compliance in other operating areas.
                </span>
              </label>
            </div>
          )}
        </div>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users className="h-5 w-5 text-slate-400" />
              Tasks to Review
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 border border-slate-200">{actions.length}</span>
            </h2>
            {savingActions && <span className="flex items-center gap-1.5 text-xs font-bold text-violet-600"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving...</span>}
          </div>

          <div className="space-y-3">
            {actions.map(action => {
              const isOpen = expandedObligation === action.id;
              return (
                <div
                  key={action.id}
                  className={`rounded-2xl border transition shadow-sm ${
                    action.status === "accepted" ? "border-green-200 bg-green-50/40" :
                      action.status === "rejected" ? "border-red-200 bg-red-50/40 opacity-60" :
                        "border-slate-200 bg-white hover:border-violet-200 hover:shadow-md"
                  }`}
                >
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-5">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5 mb-3">
                          <span className="rounded-md border border-violet-200 bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-700 uppercase tracking-wide">
                            {action.team}
                          </span>
                          <span className={`px-2 py-0.5 text-[11px] font-bold rounded-md border ${EFFORT_COLOR[action.effort]}`}>
                            {action.effort.toUpperCase()} EFFORT
                          </span>
                          <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                            <Clock className="h-3 w-3" />
                            {action.deadline}
                          </span>
                          <span className={`rounded-md border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${URGENCY_BG[action.urgency]}`}>
                            {action.urgency} URGENCY
                          </span>
                        </div>
                        <p className="text-[15px] font-semibold text-slate-800 leading-normal">{action.task}</p>

                        {(action.assetName || action.vendorName) && (
                          <div className="flex flex-wrap gap-2.5 mt-3">
                            {action.assetName && (
                              <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                <FileCheck2 className="h-3.5 w-3.5 text-slate-400" />
                                {action.assetName}
                                {action.assetAction && (
                                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ml-1 uppercase ${ASSET_ACTION_COLOR[action.assetAction]}`}>
                                    {action.assetAction}
                                  </span>
                                )}
                              </span>
                            )}
                            {action.vendorName && (
                              <span className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                                <Network className="h-3.5 w-3.5 text-slate-400" />
                                {action.vendorName}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Accept / Reject buttons */}
                      {!accepted && (
                        <div className="flex shrink-0 flex-col gap-2 w-32">
                          <button
                            type="button"
                            onClick={() => setActionStatus(action.id, "accepted")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                              action.status === "accepted"
                                ? "bg-green-600 text-white shadow-inner"
                                : "border-2 border-slate-200 bg-white text-slate-600 hover:border-green-500 hover:text-green-600 hover:bg-green-50 shadow-sm"
                            }`}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            Accept
                          </button>
                          <button
                            type="button"
                            onClick={() => setActionStatus(action.id, "rejected")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition ${
                              action.status === "rejected"
                                ? "bg-red-600 text-white shadow-inner"
                                : "border-2 border-slate-200 bg-white text-slate-600 hover:border-red-500 hover:text-red-600 hover:bg-red-50 shadow-sm"
                            }`}
                          >
                            <X className="h-4 w-4" />
                            Reject
                          </button>
                        </div>
                      )}
                      {accepted && action.status === "accepted" && (
                        <div className="flex items-center gap-1.5 px-3 py-2 bg-green-100 rounded-lg text-green-700 font-bold text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Accepted
                        </div>
                      )}
                    </div>

                    {/* Expand obligation detail */}
                    <button
                      type="button"
                      onClick={() => setExpandedObligation(isOpen ? null : action.id)}
                      className="mt-4 flex items-center gap-1.5 text-[11px] font-bold tracking-wide text-slate-400 hover:text-slate-600 transition"
                    >
                      {isOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      SOURCE REFERENCE: {action.obligation_id}
                    </button>
                    {isOpen && (
                      <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-4">
                        <p className="text-[13px] font-medium text-slate-600 leading-relaxed">
                          This task was mapped from {plan.event.regulation_name} reference <strong className="text-slate-800">{action.obligation_id}</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Review Progress ──────────────────────────────────────────────── */}
        {!accepted && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-[14px] font-bold text-slate-800 mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-violet-500" />
              Safety & Completion Gates
            </h3>
            <ValidationRow
              done={conflictChecked}
              label={conflictChecked ? (conflictResult?.safe || plan.conflict_check_status === "auto_healed" ? "Cross-regulation audit passed safely" : "Conflicts flagged (reviewed above)") : "Run the cross-regulation AI audit"}
            />
            <ValidationRow
              done={pendingCount === 0}
              label={pendingCount === 0 ? "All tasks reviewed" : `${pendingCount} task(s) still require a decision`}
            />
            <ValidationRow
              done={acceptedCount > 0}
              label={acceptedCount > 0 ? `${acceptedCount} task(s) accepted into resolution plan` : "Accept at least one task"}
            />
            {hasConflicts && plan.conflict_check_status !== "auto_healed" && (
              <ValidationRow
                done={acknowledged}
                label={acknowledged ? "Conflicts explicitly acknowledged" : "Acknowledge the regulatory conflicts above explicitly"}
              />
            )}
          </div>
        )}

        {/* ── Accept & Lock ────────────────────────────────────────────────── */}
        {!accepted ? (
          <div className="rounded-2xl border-2 border-violet-200 bg-violet-50/50 p-6 shadow-md">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 shrink-0">
                <Lock className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-black text-slate-900">Lock Resolution Plan</h3>
                <p className="mt-1 text-sm font-medium text-slate-600 leading-relaxed max-w-2xl">
                  Accepting this plan permanently commits the approved actions to your compliance framework baseline. The relevant operational teams will be notified immediately.
                </p>
                <div className="mt-5 flex flex-wrap gap-4 items-end">
                  <div className="w-full sm:w-72">
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Sign-off Name / Role</label>
                    <input
                      value={acceptName}
                      onChange={e => setAcceptName(e.target.value)}
                      placeholder="e.g. Emma (Head of Compliance)"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 shadow-sm"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={acceptPlan}
                    disabled={!canAccept || accepting}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    {accepting ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                    Lock & Enforce Plan
                  </button>
                </div>
                {acceptError && (
                  <div className="mt-4 rounded-lg bg-red-50 p-3 flex items-start gap-2 border border-red-100">
                    <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-sm font-semibold text-red-700">{acceptError}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-green-200 bg-green-50 p-8 text-center shadow-md">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4 shadow-sm">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Plan Successfully Locked</h3>
            <p className="mt-2 text-[15px] font-medium text-slate-600">
              {acceptedCount} task(s) are now strictly enforced in your compliance baseline.
            </p>
            <p className="mt-1 text-sm font-bold text-slate-500">
              Authorized by: {plan.accepted_by ?? "Compliance Lead"}
            </p>
            <button
              type="button"
              onClick={() => router.push("/agent")}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-200 px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Live Dashboard
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

// ─── Supporting Components ────────────────────────────────────────────────────

function ValidationRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
      {done
        ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
        : <div className="h-5 w-5 rounded-full border-2 border-slate-300 bg-slate-50 shrink-0" />
      }
      <span className={`text-[14px] font-semibold ${done ? "text-slate-800" : "text-slate-500"}`}>{label}</span>
    </div>
  );
}

function ConflictCard({ conflict, autoHealed }: { conflict: ConflictFlag, autoHealed?: boolean }) {
  const severityStyles = autoHealed 
    ? "border-violet-200 bg-white text-violet-900"
    : {
        critical: "border-red-200 bg-red-50 text-red-900", 
        high: "border-orange-200 bg-orange-50 text-orange-900",
        medium: "border-amber-200 bg-amber-50 text-amber-900", 
        low: "border-slate-200 bg-white text-slate-800"
      }[conflict.severity] || "border-slate-200 bg-white";
  
  const badgeStyles = autoHealed
    ? "bg-violet-100 text-violet-700"
    : {
        critical: "bg-red-100 text-red-700", 
        high: "bg-orange-100 text-orange-700",
        medium: "bg-amber-100 text-amber-700", 
        low: "bg-slate-100 text-slate-700"
      }[conflict.severity] || "bg-slate-100 text-slate-700";

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${severityStyles}`}>
      <div className="flex flex-wrap items-center gap-3 mb-2">
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-widest ${badgeStyles}`}>
          {autoHealed ? "HEALED" : `${conflict.severity} RISK`}
        </span>
        <span className={`text-xs font-bold ${autoHealed ? "text-violet-600" : "text-slate-500"} flex items-center gap-1.5`}>
          {autoHealed ? <Sparkles className="h-3.5 w-3.5" /> : <FileCheck2 className="h-3.5 w-3.5" />}
          {conflict.regulation} · {conflict.article}
        </span>
      </div>
      <p className={`text-sm font-semibold opacity-90 leading-relaxed ${autoHealed && "line-through opacity-70"}`}>{conflict.description}</p>
      <div className={`mt-3 pt-3 border-t ${autoHealed ? "border-violet-100" : "border-black/5"}`}>
        <p className={`text-[13px] font-medium flex gap-2 ${autoHealed ? "text-violet-800" : "opacity-80 items-start"}`}>
          <span className={`font-bold mt-0.5 shrink-0 ${autoHealed ? "text-violet-600" : "uppercase text-[10px] tracking-widest"}`}>
             {autoHealed ? <CheckCircle2 className="h-4 w-4" /> : "RESOLUTION:"}
          </span> 
          <span>{conflict.resolution}</span>
        </p>
      </div>
    </div>
  );
}
