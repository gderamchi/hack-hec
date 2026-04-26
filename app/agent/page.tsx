"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Users,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type {
  AgentActivity,
  ComplianceProfile,
  PlanWithEvent,
  RegChangeStatus
} from "@/lib/agent-types";

// ─── Constants ────────────────────────────────────────────────────────────────

const ACTIVE_REGULATIONS = ["DORA", "PSD3/PSR", "EU AI Act", "FCA Consumer Duty"];
const POLL_INTERVAL_MS = 30_000;

const SIMULATION_OPTIONS = [
  { label: "DORA Amendment", value: "DORA", color: "text-blue-700 bg-blue-50 border-blue-200" },
  { label: "PSD3/PSR Update", value: "PSD3/PSR", color: "text-violet-700 bg-violet-50 border-violet-200" },
  { label: "EU AI Act Revision", value: "EU AI Act", color: "text-amber-700 bg-amber-50 border-amber-200" },
  { label: "FCA Consumer Duty", value: "FCA Consumer Duty", color: "text-green-700 bg-green-50 border-green-200" }
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function regulationStatus(reg: string, plans: PlanWithEvent[]): RegChangeStatus | "monitoring" {
  const regPlans = plans.filter(p => p.event?.regulation_name === reg);
  if (regPlans.some(p => p.status === "draft" || p.status === "conflict_flagged")) return "pending_review";
  if (regPlans.some(p => p.status === "accepted")) return "accepted";
  return "monitoring";
}

function statusConfig(status: RegChangeStatus | "monitoring") {
  switch (status) {
    case "pending_review": return { label: "Pending Review", dot: "bg-amber-400", text: "text-amber-700", bg: "bg-amber-50 border-amber-200" };
    case "accepted": return { label: "In Baseline", dot: "bg-green-400", text: "text-green-700", bg: "bg-green-50 border-green-200" };
    case "rejected": return { label: "Rejected", dot: "bg-red-400", text: "text-red-700", bg: "bg-red-50 border-red-200" };
    case "irrelevant": return { label: "Not Applicable", dot: "bg-slate-400", text: "text-slate-500", bg: "bg-slate-50 border-slate-200" };
    default: return { label: "Monitoring", dot: "bg-blue-400", text: "text-blue-700", bg: "bg-blue-50 border-blue-200" };
  }
}

function activityIcon(type: string) {
  if (type === "plan_accepted") return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
  if (type === "plan_generated") return <Sparkles className="h-4 w-4 text-violet-500 shrink-0" />;
  if (type === "change_detected") return <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />;
  if (type === "irrelevant_filtered") return <ShieldCheck className="h-4 w-4 text-slate-400 shrink-0" />;
  if (type === "error") return <ShieldAlert className="h-4 w-4 text-red-500 shrink-0" />;
  return <Activity className="h-4 w-4 text-slate-400 shrink-0" />;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const [profile, setProfile] = useState<ComplianceProfile | null>(null);
  const [plans, setPlans] = useState<PlanWithEvent[]>([]);
  const [activities, setActivities] = useState<AgentActivity[]>([]);
  const [agentStatus, setAgentStatus] = useState<"idle" | "scanning" | "simulating">("idle");
  const [lastScanned, setLastScanned] = useState<Date | null>(null);
  const [scanMessage, setScanMessage] = useState("Initialising agent...");
  const [simulating, setSimulating] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  // ── Load profile + plans ─────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    const res = await fetch("/api/agent/profile").catch(() => null);
    if (!res?.ok) return null;
    const data = await res.json() as { profile: ComplianceProfile | null };
    setProfile(data.profile);
    return data.profile;
  }, []);

  const loadPlans = useCallback(async (profileId: string) => {
    const res = await fetch(`/api/agent/plans?profileId=${profileId}`).catch(() => null);
    if (!res?.ok) return;
    const data = await res.json() as { plans: PlanWithEvent[]; activities: AgentActivity[] };
    setPlans(data.plans ?? []);
    setActivities(data.activities ?? []);
  }, []);

  // ── Regular scan (heartbeat — no AI, just check) ──────────────────────────

  const runScan = useCallback(async (profileId: string) => {
    setAgentStatus("scanning");
    setScanMessage("Scanning active regulations...");
    const res = await fetch("/api/agent/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId })
    }).catch(() => null);
    setAgentStatus("idle");
    setLastScanned(new Date());
    if (res?.ok) {
      const data = await res.json() as { message: string };
      setScanMessage(data.message ?? "Scan complete");
      await loadPlans(profileId);
    } else {
      setScanMessage("Scan failed — will retry");
    }
  }, [loadPlans]);

  // ── Simulate a regulation change ─────────────────────────────────────────

  async function simulate(regulationName: string) {
    if (!profile) return;
    setSimulating(regulationName);
    setAgentStatus("simulating");
    setScanMessage(`Injecting ${regulationName} amendment through AI pipeline...`);
    const res = await fetch("/api/agent/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: profile.id, simulate: { regulationName } })
    }).catch(() => null);
    setAgentStatus("idle");
    setSimulating(null);
    setLastScanned(new Date());
    if (res?.ok) {
      const data = await res.json() as { message: string; eventsCreated: number };
      setScanMessage(data.message);
      await loadPlans(profile.id);
    } else {
      setScanMessage("Simulation failed — check server logs");
    }
  }

  // ── Bootstrap + polling ───────────────────────────────────────────────────

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    (async () => {
      const p = await loadProfile();
      if (!p) { setScanMessage("Setup required to initialize agent"); return; }
      await loadPlans(p.id);
      await runScan(p.id);
      interval = setInterval(() => runScan(p.id), POLL_INTERVAL_MS);
    })();
    return () => clearInterval(interval);
  }, [loadProfile, loadPlans, runScan]);

  // ── Auto-scroll activity log ──────────────────────────────────────────────

  useEffect(() => {
    setTimeout(() => {
      if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
    }, 50);
  }, [activities, scanMessage]);

  // ── Derived state ─────────────────────────────────────────────────────────

  const pendingPlans = plans.filter(p => p.status === "draft" || p.status === "conflict_flagged");
  const acceptedCount = plans.filter(p => p.status === "accepted").length;
  const totalDetected = plans.length;

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-slate-800 font-sans pb-20">
      {/* App Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-600 text-white">
              <span className="text-[10px]">CP</span>
            </div>
            CompliancePilot
            <span className="mx-2 text-slate-300">/</span>
            <span className="text-violet-600 flex items-center gap-1.5"><Zap className="h-4 w-4"/> AI Agent</span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="/monitor"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              Manual Analysis (RegPropagator)
            </a>
            <div className="flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${agentStatus !== "idle" ? "animate-ping bg-amber-400" : "animate-ping bg-green-400"}`} />
                <span className={`relative inline-flex h-2 w-2 rounded-full ${agentStatus !== "idle" ? "bg-amber-400" : "bg-green-400"}`} />
              </span>
              <span className="text-[10px] font-bold tracking-wider text-green-700 uppercase">
                {agentStatus === "idle" ? "LIVE" : agentStatus === "scanning" ? "SCANNING" : "PROCESSING"}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8">
        {/* Unification explanation for the demo */}
        <div className="mb-8 max-w-2xl">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Live Compliance Agent</h1>
          <p className="mt-2 text-sm text-slate-600 leading-relaxed">
            While RegPropagator lets you manually investigate rules, the Live Agent passively monitors every regulation you subscribe to in the background. It uses your company profile to immediately detect changes, flag relevance, and queue tasks for your review.
          </p>
        </div>

        {/* No profile setup block */}
        {!profile ? (
          <div className="mx-auto mt-10 max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Configure Live Agent</h2>
                <p className="text-sm text-slate-500">The agent needs context to score relevance.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-semibold text-slate-700">Company Name</label>
                <input 
                  id="agent-setup-name"
                  type="text" 
                  placeholder="e.g. Payflow Ltd"
                  className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500" 
                />
              </div>
              <button
                type="button"
                onClick={async () => {
                  const name = (document.getElementById("agent-setup-name") as HTMLInputElement)?.value || "Demo Fintech";
                  const res = await fetch("/api/agent/profile", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      operatingModel: {
                        companyName: name,
                        companyType: "Payment Institution",
                        country: "United Kingdom",
                        services: ["Card payments", "Open Banking"],
                        techStack: ["AWS", "Node.js"],
                        teams: ["Engineering", "Compliance"],
                        internalAssets: [{ id: "ast-1", name: "Incident Runbook", type: "runbook" }],
                        vendors: ["AWS"]
                      }
                    })
                  });
                  if (res.ok) {
                    const { profile } = await res.json();
                    setProfile(profile);
                    await runScan(profile.id);
                  }
                }}
                className="w-full rounded-lg bg-violet-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-violet-700"
              >
                Initialize Agent
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid gap-4 sm:grid-cols-4 mb-6">
              {[
                { label: "Regulations Monitored", value: ACTIVE_REGULATIONS.length, icon: <ShieldCheck className="h-4 w-4 text-blue-500" />, shadow: "shadow-sm border-slate-200/60" },
                { label: "Pending Review", value: pendingPlans.length, icon: <AlertTriangle className="h-4 w-4 text-amber-500" />, shadow: pendingPlans.length > 0 ? "border-amber-200 bg-amber-50 shadow-sm" : "shadow-sm border-slate-200/60" },
                { label: "In Baseline", value: acceptedCount, icon: <CheckCircle2 className="h-4 w-4 text-green-500" />, shadow: "shadow-sm border-slate-200/60" },
                { label: "Changes Detected", value: totalDetected, icon: <Activity className="h-4 w-4 text-violet-500" />, shadow: "shadow-sm border-slate-200/60" },
              ].map(kpi => (
                <div key={kpi.label} className={`rounded-xl bg-white border p-4 ${kpi.shadow}`}>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">{kpi.label}</span>
                    {kpi.icon}
                  </div>
                  <p className="mt-2 text-3xl font-black text-slate-800 tracking-tight">{kpi.value}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_1fr_320px]">
              {/* ── Col 1: Compliance Baseline ─────────────────────────────────── */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 mb-4">
                  <ShieldCheck className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Compliance Baseline</h2>
                </div>

                {profile && (
                  <div className="rounded-xl border border-slate-200 bg-white p-4 mb-5 shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Active Profile</p>
                    <p className="text-sm font-black text-slate-800 break-words leading-tight">{profile.company_name}</p>
                    <p className="text-xs text-slate-500 mt-1">{profile.operating_model?.companyType} · {profile.operating_model?.country}</p>
                  </div>
                )}

                {ACTIVE_REGULATIONS.map(reg => {
                  const status = regulationStatus(reg, plans);
                  const cfg = statusConfig(status);
                  const regPendingPlan = pendingPlans.find(p => p.event?.regulation_name === reg);
                  return (
                    <div key={reg} className={`rounded-lg border ${cfg.bg} p-3 transition shadow-sm`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                          <span className={`text-sm font-bold truncate ${cfg.text}`}>{reg}</span>
                        </div>
                        {regPendingPlan && (
                          <Link href={`/agent/plan/${regPendingPlan.id}`}>
                            <ChevronRight className="h-4 w-4 text-amber-500 hover:scale-110" />
                          </Link>
                        )}
                      </div>
                      <p className={`mt-1 text-xs font-semibold ${cfg.text} opacity-75`}>{cfg.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* ── Col 2: Pending Changes ──────────────────────────────────────── */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-slate-400" />
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">
                      Pending Changes {pendingPlans.length > 0 && <span className="ml-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-white">{pendingPlans.length}</span>}
                    </h2>
                  </div>
                  {profile && (
                    <button
                      type="button"
                      onClick={() => runScan(profile.id)}
                      disabled={agentStatus !== "idle"}
                      className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 disabled:opacity-50"
                    >
                      <RefreshCcw className={`h-3 w-3 ${agentStatus === "scanning" ? "animate-spin" : ""}`} />
                      Check Manually
                    </button>
                  )}
                </div>

                {pendingPlans.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 mb-3">
                      <CheckCircle2 className="h-6 w-6 text-green-500" />
                    </div>
                    <p className="text-base font-bold text-slate-800">No pending regulations to review</p>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">The agent is monitoring your feeds. Any changes affecting your company profile will trigger a new remediation plan here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingPlans.map(plan => {
                      const actions = (plan.actions ?? []) as Array<{ status: string }>;
                      const reviewed = actions.filter(a => a.status !== "pending").length;
                      return (
                        <div key={plan.id} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition">
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800">
                                  {plan.status === "conflict_flagged" ? "⚠ Conflicts Flagged" : "Action Required"}
                                </span>
                                <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {fmtTime(plan.event.detected_at)}
                                </span>
                              </div>
                              <h3 className="text-lg font-black text-slate-900">{plan.event.regulation_name}</h3>
                              <p className="mt-1 text-sm text-slate-500 leading-relaxed">{plan.event.change_summary}</p>
                            </div>
                            <div className="shrink-0 text-right bg-slate-50 rounded-lg p-3 border border-slate-100">
                              <p className={`text-3xl font-black ${plan.event.relevance_score >= 70 ? "text-red-500" : plan.event.relevance_score >= 40 ? "text-amber-500" : "text-green-500"}`}>
                                {plan.event.relevance_score}%
                              </p>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Relevance</p>
                            </div>
                          </div>

                          <div className="mt-5 pt-5 border-t border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                              <span className="flex items-center gap-1.5">
                                <Users className="h-4 w-4 text-slate-400" />
                                {actions.length} tasks
                              </span>
                              <span className="flex items-center gap-1.5">
                                <CheckCircle2 className="h-4 w-4 text-slate-400" />
                                {reviewed}/{actions.length} reviewed
                              </span>
                            </div>
                            <Link
                              href={`/agent/plan/${plan.id}`}
                              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow hover:bg-violet-700 transition"
                            >
                              Review Plan
                              <ArrowRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Simulate Panel */}
                {profile && (
                  <div className="mt-8 rounded-2xl border border-violet-100 bg-violet-50 p-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="h-5 w-5 text-violet-600" />
                      <h3 className="text-base font-bold text-violet-900">Simulate a Change</h3>
                    </div>
                    <p className="text-sm font-medium text-violet-700/80 mb-5 leading-relaxed">
                      Testing the agent? Inject a mock amendment text through the full AI pipeline. The agent will read it, extract obligations, score relevance to {profile.company_name}, and build a plan.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {SIMULATION_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => simulate(opt.value)}
                          disabled={agentStatus !== "idle" || !profile}
                          className={`flex items-center justify-between rounded-xl border bg-white px-4 py-3 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 ${
                            simulating === opt.value ? "border-violet-400 ring-2 ring-violet-400 ring-offset-2" : "border-slate-200"
                          }`}
                        >
                          {simulating === opt.value ? (
                            <span className="flex items-center gap-2 text-violet-600">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Running AI...
                            </span>
                          ) : (
                            <>
                              <span className="text-slate-700">{opt.label}</span>
                              <Sparkles className="h-4 w-4 text-violet-400" />
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Col 3: Activity Log ──────────────────────────────────────────── */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <h2 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Agent Log</h2>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-slate-50 border-b border-slate-100 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`relative flex h-2 w-2`}>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-500">System Activity</span>
                    </div>
                    {lastScanned && <span className="text-[10px] font-medium text-slate-400">Last: {fmtTime(lastScanned.toISOString())}</span>}
                  </div>
                  
                  <div
                    ref={logRef}
                    className="h-[500px] overflow-y-auto p-4 space-y-3 scroll-smooth text-sm font-medium"
                  >
                    {activities.length === 0 ? (
                      <div className="flex h-full items-center justify-center">
                        <p className="text-xs text-slate-400 font-normal">Waiting for agent activity...</p>
                      </div>
                    ) : (
                      activities.map(a => (
                        <div key={a.id} className="flex items-start gap-3">
                          <div className="mt-0.5">{activityIcon(a.event_type)}</div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-slate-700 leading-snug">{a.message}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">{fmtTime(a.created_at)}</p>
                          </div>
                        </div>
                      ))
                    )}
                    {agentStatus !== "idle" && (
                      <div className="flex items-start gap-3 opacity-70">
                        <div className="mt-0.5"><Loader2 className="h-4 w-4 animate-spin text-violet-500" /></div>
                        <p className="text-xs text-violet-600 animate-pulse font-semibold">{scanMessage}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
