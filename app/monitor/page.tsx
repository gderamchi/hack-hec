"use client";

import {
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Cpu,
  FileCheck2,
  FileText,
  Globe,
  Layers,
  Loader2,
  Network,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Users,
  X,
  Zap
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import type {
  AssetAction,
  AssetImpact,
  GapSeverity,
  InternalAsset,
  InternalAssetType,
  MonitorResponse,
  ObligationPropagation,
  OperatingModel,
  PropagationResult,
  RegulatoryChangeEvent,
  TeamAction,
  TeamName,
  VendorImpact
} from "@/lib/monitor-types";
import {
  ALL_TEAMS,
  ASSET_TYPE_LABELS,
  DEFAULT_OPERATING_MODEL,
  MONITOR_COMPANY_TYPES,
  MONITOR_COUNTRIES,
  MONITOR_SERVICES
} from "@/lib/monitor-types";

// ─── Constants ────────────────────────────────────────────────────────────────

type MonitorScreen = "setup" | "intake" | "propagating" | "impact";

const PROPAGATION_STEPS = [
  "Extracting regulatory structure...",
  "Loading company operating model...",
  "Mapping obligations to your services...",
  "Checking tech stack implications...",
  "Scanning vendor relationships...",
  "Evaluating internal asset impacts...",
  "Generating team action plans...",
  "Compiling impact dashboard..."
];

const REGULATION_PRESETS = [
  {
    id: "dora",
    label: "DORA",
    subtitle: "Digital Operational Resilience Act",
    jurisdiction: "EU",
    color: "border-blue-200 bg-blue-50 text-blue-700",
    text: `Financial entities must implement robust ICT risk management frameworks to ensure the security and resilience of network and information systems used in the provision of financial services. Entities must continuously monitor ICT systems and promptly detect anomalous activities, including cyber threats and system failures. Firms are required to establish incident response procedures and report major ICT-related incidents to the relevant competent authorities within prescribed timeframes. Additionally, financial entities must ensure that third-party ICT service providers comply with equivalent security and resilience standards, including contractual obligations for risk management and audit rights. Failure to meet these requirements may result in supervisory measures, including fines, public warnings, or restrictions on business activities.`
  },
  {
    id: "psd3",
    label: "PSD3 / PSR",
    subtitle: "Payment Services Directive",
    jurisdiction: "EU",
    color: "border-violet-200 bg-violet-50 text-violet-700",
    text: `Payment service providers must implement strong customer authentication for all electronic payment transactions where the payer initiates a payment, unless specific exemptions apply. SCA must include at least two independent elements from the categories of knowledge, possession, and inherence, ensuring the breach of one does not compromise the others. Providers must verify the payee name before credit transfer execution and notify payers of any discrepancies. Receiving PSPs must detect and freeze suspicious incoming transactions. PSPs must offer customers spending limits and payment blocking controls. PSPs must provide access to human customer support and participate in alternative dispute resolution procedures when chosen by consumers. Failure to comply may result in fines or restrictions on operations.`
  },
  {
    id: "euaiact",
    label: "EU AI Act",
    subtitle: "Artificial Intelligence Act",
    jurisdiction: "EU",
    color: "border-amber-200 bg-amber-50 text-amber-700",
    text: `Providers and deployers of high-risk AI systems in financial services must implement risk management systems throughout the AI system lifecycle. High-risk AI systems used in credit scoring, fraud detection, and anti-money laundering screening must meet transparency, accuracy, robustness, and cybersecurity requirements. Providers must maintain comprehensive technical documentation and register high-risk AI systems in the EU database before deployment. Post-market monitoring of AI systems is required, with obligations to report serious malfunctions or incidents to market surveillance authorities. Deployers must conduct fundamental rights impact assessments before deploying high-risk AI systems. Non-compliance may result in fines of up to 30 million euros or 6 percent of global annual turnover.`
  },
  {
    id: "fca-duty",
    label: "Consumer Duty",
    subtitle: "FCA Consumer Duty",
    jurisdiction: "UK",
    color: "border-green-200 bg-green-50 text-green-700",
    text: `Firms must act to deliver good outcomes for retail customers across four areas: products and services, price and value, consumer understanding, and consumer support. Firms must assess, test, monitor, and evidence that products and services meet the needs of their target market. Customer communications must be clear, fair, and not misleading, enabling informed decision-making. Firms must ensure customers can access the support they need throughout the customer journey without unreasonable barriers. Firms must maintain adequate governance arrangements and submit an annual board report evidencing consumer outcomes. Failure to comply may result in enforcement action, fines, and reputational consequences.`
  }
] as const;

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MonitorPage() {
  const [screen, setScreen] = useState<MonitorScreen>("setup");
  const [model, setModel] = useState<OperatingModel>(DEFAULT_OPERATING_MODEL);
  const [regulationText, setRegulationText] = useState("");
  const [extraction, setExtraction] = useState<RegulatoryChangeEvent | null>(null);
  const [propagation, setPropagation] = useState<PropagationResult | null>(null);
  const [error, setError] = useState("");
  const [stepIndex, setStepIndex] = useState(0);

  async function runEngine() {
    if (!regulationText.trim()) {
      setError("Add regulation text before running.");
      return;
    }
    setError("");
    setScreen("propagating");
    setStepIndex(0);
    setExtraction(null);
    setPropagation(null);

    const timer = window.setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROPAGATION_STEPS.length - 1));
    }, 900);

    try {
      const res = await fetch("/api/monitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ regulationText, operatingModel: model })
      });

      const data = (await res.json()) as MonitorResponse;

      if (data.mode === "error") {
        setError(data.error);
        setScreen("intake");
        return;
      }

      if (data.mode === "propagation") {
        setExtraction(data.extraction);
        setPropagation(data.propagation);
      } else if (data.mode === "extraction") {
        setExtraction(data.data);
      }

      setScreen("impact");
    } catch {
      setError("Request failed. Check the terminal for server errors.");
      setScreen("intake");
    } finally {
      clearInterval(timer);
    }
  }

  function reset() {
    setScreen("setup");
    setModel(DEFAULT_OPERATING_MODEL);
    setRegulationText("");
    setExtraction(null);
    setPropagation(null);
    setError("");
    setStepIndex(0);
  }

  return (
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slateLine bg-white/92 backdrop-blur">
        <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-600 text-white">
              <BrainCircuit className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-sm font-semibold leading-5">RegPropagator</span>
              <span className="block text-xs text-slate-500">Company-specific regulatory change engine</span>
            </span>
          </div>
          <div className="flex items-center gap-3">
            {screen !== "setup" && screen !== "propagating" && (
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-slateLine bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
              >
                <RotateCcw className="h-4 w-4" />
                Start over
              </button>
            )}
            <Link
              href="/agent"
              className="inline-flex items-center gap-2 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 px-4 py-2 text-sm font-bold transition hover:bg-violet-100"
            >
              <Zap className="h-4 w-4" />
              Live Agent
            </Link>
            <Link
              href="/"
              className="hidden lg:inline-flex items-center gap-2 rounded-lg border border-slateLine bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              ← CompliancePilot
            </Link>
          </div>
        </div>

        {/* Step Rail */}
        {screen !== "propagating" && (
          <div className="border-t border-slateLine bg-white">
            <div className="mx-auto flex max-w-[1560px] gap-0 px-4 sm:px-6 lg:px-8">
              {([
                { id: "setup", label: "Company Setup", icon: <Building2 className="h-3.5 w-3.5" /> },
                { id: "intake", label: "Regulation", icon: <FileText className="h-3.5 w-3.5" /> },
                { id: "impact", label: "Impact", icon: <Layers className="h-3.5 w-3.5" /> }
              ] as { id: MonitorScreen; label: string; icon: React.ReactNode }[]).map((step, i) => {
                const isActive = screen === step.id;
                const isDone =
                  (screen === "intake" && step.id === "setup") ||
                  (screen === "impact" && (step.id === "setup" || step.id === "intake"));
                return (
                  <div
                    key={step.id}
                    className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                      isActive
                        ? "border-violet-600 text-violet-700"
                        : isDone
                        ? "border-transparent text-slate-500"
                        : "border-transparent text-slate-400"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5 text-violet-500" /> : step.icon}
                    {`${i + 1}. ${step.label}`}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Screens */}
      <div className="mx-auto max-w-[1560px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        {screen === "setup" && (
          <SetupScreen model={model} onChange={setModel} onNext={() => setScreen("intake")} />
        )}
        {screen === "intake" && (
          <IntakeScreen
            text={regulationText}
            onChange={setRegulationText}
            error={error}
            onBack={() => setScreen("setup")}
            onRun={runEngine}
          />
        )}
        {screen === "propagating" && (
          <PropagatingScreen stepIndex={stepIndex} companyName={model.companyName} />
        )}
        {screen === "impact" && (extraction || propagation) && (
          <ImpactScreen
            extraction={extraction}
            propagation={propagation}
            companyName={model.companyName}
          />
        )}
      </div>
    </main>
  );
}

// ─── Screen 1: Company Setup ──────────────────────────────────────────────────

function SetupScreen({ model, onChange, onNext }: { model: OperatingModel; onChange: (m: OperatingModel) => void; onNext: () => void }) {
  const canContinue = model.companyName.trim().length > 0 && model.services.length > 0;

  function toggleService(s: string) {
    onChange({
      ...model,
      services: model.services.includes(s)
        ? model.services.filter((x) => x !== s)
        : [...model.services, s]
    });
  }

  // Save the profile to the live agent memory layer when clicking continue
  async function handleContinue() {
    onNext();
    // Fire and forget: save to Supabase so the agent monitoring loop has context
    fetch("/api/agent/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ operatingModel: model })
    }).catch(console.error);
  }

  function toggleTeam(t: TeamName) {
    onChange({
      ...model,
      teams: model.teams.includes(t)
        ? model.teams.filter((x) => x !== t)
        : [...model.teams, t]
    });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="mb-6">
        <p className="text-sm font-semibold text-violet-600">Step 1</p>
        <h1 className="mt-1 text-3xl font-semibold">Define your company profile</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          This profile is the foundation of the propagation engine. Every regulatory change will be mapped
          against your specific services, technology, teams, and internal assets.
        </p>
      </div>

      {/* Company Identity */}
      <Section icon={<Building2 className="h-4 w-4 text-violet-600" />} title="Company Identity">
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Company name *</span>
            <input
              id="company-name"
              value={model.companyName}
              onChange={(e) => onChange({ ...model, companyName: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slateLine bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
              placeholder="e.g. Payflow Ltd"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Entity type *</span>
            <select
              id="company-type"
              value={model.companyType}
              onChange={(e) => onChange({ ...model, companyType: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slateLine bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            >
              {MONITOR_COMPANY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-600">Jurisdiction</span>
            <select
              id="company-country"
              value={model.country}
              onChange={(e) => onChange({ ...model, country: e.target.value })}
              className="mt-1 w-full rounded-lg border border-slateLine bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
            >
              {MONITOR_COUNTRIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
      </Section>

      {/* Regulated Services */}
      <Section icon={<ShieldCheck className="h-4 w-4 text-violet-600" />} title="Regulated Services *">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MONITOR_SERVICES.map((s) => {
            const active = model.services.includes(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleService(s)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                  active ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slateLine bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{s}</span>
                {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Tech Stack */}
      <Section icon={<Cpu className="h-4 w-4 text-violet-600" />} title="Technology Stack">
        <p className="mb-2 text-xs text-slate-500">Type a technology and press Enter to add (e.g. AWS, Stripe, Kubernetes)</p>
        <TagInput
          id="tech-stack"
          tags={model.techStack}
          onChange={(tags) => onChange({ ...model, techStack: tags })}
          placeholder="Add technology..."
        />
      </Section>

      {/* Teams */}
      <Section icon={<Users className="h-4 w-4 text-violet-600" />} title="Teams">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {ALL_TEAMS.map((t) => {
            const active = model.teams.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTeam(t)}
                className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                  active ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slateLine bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{t}</span>
                {active && <CheckCircle2 className="h-4 w-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </Section>

      {/* Internal Assets */}
      <Section icon={<ClipboardList className="h-4 w-4 text-violet-600" />} title="Internal Assets">
        <p className="mb-2 text-xs text-slate-500">
          Add your named policies, runbooks, contracts, systems, and processes. The engine maps regulatory
          obligations directly to these.
        </p>
        <AssetBuilder assets={model.internalAssets} onChange={(a) => onChange({ ...model, internalAssets: a })} />
      </Section>

      {/* Vendors */}
      <Section icon={<Network className="h-4 w-4 text-violet-600" />} title="Key Vendors">
        <p className="mb-2 text-xs text-slate-500">Third-party ICT providers, payment processors, cloud providers (press Enter to add)</p>
        <TagInput
          id="vendors"
          tags={model.vendors}
          onChange={(tags) => onChange({ ...model, vendors: tags })}
          placeholder="Add vendor..."
        />
      </Section>

      <div className="flex justify-end pt-2">
        <button
          id="setup-continue-btn"
          type="button"
          onClick={handleContinue}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to Regulation
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Screen 2: Intake ─────────────────────────────────────────────────────────

function IntakeScreen({
  text,
  onChange,
  error,
  onBack,
  onRun
}: {
  text: string;
  onChange: (t: string) => void;
  error: string;
  onBack: () => void;
  onRun: () => void;
}) {
  const [mode, setMode] = useState<"paste" | "preset">("paste");

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="mb-6">
        <p className="text-sm font-semibold text-violet-600">Step 2</p>
        <h1 className="mt-1 text-3xl font-semibold">Select or paste regulation</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Choose a pre-loaded regulation excerpt or paste your own text. The propagation engine will map
          every obligation against your company profile.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex rounded-lg border border-slateLine bg-white p-1 shadow-sm">
        <button
          id="tab-paste"
          type="button"
          onClick={() => setMode("paste")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === "paste" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileText className="h-4 w-4" /> Paste text
        </button>
        <button
          id="tab-preset"
          type="button"
          onClick={() => setMode("preset")}
          className={`flex flex-1 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition ${
            mode === "preset" ? "bg-violet-600 text-white" : "text-slate-600 hover:bg-slate-50"
          }`}
        >
          <Sparkles className="h-4 w-4" /> Use preset
        </button>
      </div>

      {mode === "paste" ? (
        <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm">
          <textarea
            id="regulation-text"
            value={text}
            onChange={(e) => onChange(e.target.value)}
            rows={14}
            placeholder="Paste raw regulation text here (PSD3, DORA, EU AI Act, FCA Consumer Duty...)"
            className="w-full resize-none rounded-lg border border-slateLine bg-slate-50 px-3 py-3 text-sm leading-6 placeholder:text-slate-400 focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-100"
          />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {REGULATION_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              id={`preset-${preset.id}`}
              onClick={() => { onChange(preset.text); setMode("paste"); }}
              className={`rounded-xl border-2 p-4 text-left transition hover:shadow-md ${preset.color} ${text === preset.text ? "ring-2 ring-violet-500" : ""}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">{preset.label}</span>
                <Globe className="h-4 w-4" />
              </div>
              <p className="mt-1 text-xs font-semibold opacity-70">{preset.subtitle}</p>
              <p className="mt-2 text-xs opacity-60">{preset.jurisdiction} · Click to select</p>
            </button>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {text && (
        <div className="rounded-lg border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-800">
          <span className="font-semibold">Ready:</span> {text.split(" ").length} words loaded. The propagation engine will extract obligations and map them to your company.
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slateLine bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300"
        >
          Back
        </button>
        <button
          id="run-engine-btn"
          type="button"
          onClick={onRun}
          disabled={!text.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BrainCircuit className="h-4 w-4" />
          Run Propagation Engine
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Screen 3: Propagating ────────────────────────────────────────────────────

function PropagatingScreen({ stepIndex, companyName }: { stepIndex: number; companyName: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50 to-white p-10 shadow-lg">
        <div className="flex flex-col items-center text-center">
          <div className="relative">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-600">
              <BrainCircuit className="h-8 w-8 text-white" />
            </div>
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 rounded-full bg-violet-600" />
            </span>
          </div>
          <h2 className="mt-5 text-xl font-semibold text-violet-900">Propagating regulation</h2>
          {companyName && (
            <p className="mt-1 text-sm text-violet-600 font-medium">Mapping to {companyName}</p>
          )}
          <p className="mt-1 text-xs text-slate-500">This usually takes 30–60 seconds</p>
        </div>

        <div className="mt-8 space-y-2">
          {PROPAGATION_STEPS.map((step, i) => (
            <div
              key={step}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-all ${
                i === stepIndex
                  ? "bg-violet-100 text-violet-800"
                  : i < stepIndex
                  ? "text-slate-500"
                  : "text-slate-300"
              }`}
            >
              {i < stepIndex ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-violet-500" />
              ) : i === stepIndex ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-600" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border-2 border-current" />
              )}
              <span className="text-sm font-medium">{step}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Screen 4: Impact Dashboard ───────────────────────────────────────────────

function ImpactScreen({
  extraction,
  propagation,
  companyName
}: {
  extraction: RegulatoryChangeEvent | null;
  propagation: PropagationResult | null;
  companyName: string;
}) {
  const [activeTab, setActiveTab] = useState<"teams" | "assets" | "vendors" | "actions">("teams");
  const result = propagation;
  const reg = propagation ?? extraction;
  const regName = reg
    ? "regulation_name" in reg
      ? reg.regulation_name
      : (extraction?.regulation_name ?? "Regulation")
    : "Regulation";

  const relevanceScore = result?.relevance_score ?? null;
  const relevantObligs = result?.relevant_obligations ?? 0;
  const totalObligs = result?.total_obligations ?? extraction?.obligation_groups.reduce((s, g) => s + g.obligations.length, 0) ?? 0;

  const affectedTeams = result?.impact_summary.affected_teams ?? [];
  const affectedAssets = result?.impact_summary.affected_assets ?? [];
  const affectedVendors = result?.impact_summary.affected_vendors ?? [];
  const criticalActions = result?.impact_summary.critical_actions ?? [];
  const quickWins = result?.impact_summary.quick_wins ?? [];

  return (
    <div className="space-y-6">
      {/* Hero Row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-600 to-violet-700 p-5 text-white shadow-md lg:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-violet-200">Regulation analysed</p>
          <h2 className="mt-1 text-xl font-bold">{regName || "Unknown Regulation"}</h2>
          {extraction?.jurisdiction && (
            <p className="mt-1 text-sm text-violet-200">{extraction.jurisdiction}</p>
          )}
          <p className="mt-3 text-sm text-violet-100 leading-6">
            {propagation?.summary || extraction?.summary || ""}
          </p>
        </div>

        <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Relevance Score</p>
          <p className={`mt-2 text-5xl font-bold ${relevanceScore !== null && relevanceScore >= 70 ? "text-red-600" : relevanceScore !== null && relevanceScore >= 40 ? "text-amber-500" : "text-green-600"}`}>
            {relevanceScore !== null ? `${relevanceScore}%` : "—"}
          </p>
          <p className="mt-1 text-xs text-slate-500">of regulation applies to {companyName || "your company"}</p>
        </div>

        <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Obligations</p>
          <p className="mt-2 text-5xl font-bold text-ink">{relevantObligs}<span className="text-2xl text-slate-400">/{totalObligs}</span></p>
          <p className="mt-1 text-xs text-slate-500">obligations relevant to you</p>
        </div>
      </div>

      {/* Quick Wins */}
      {quickWins.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-5 py-4">
          <div className="flex items-center gap-2 mb-3">
            <Zap className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-green-800">Quick Wins — Low effort, high impact</p>
          </div>
          <ul className="grid gap-2 sm:grid-cols-2">
            {quickWins.map((w) => (
              <li key={w} className="flex items-start gap-2 text-sm text-green-800">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-green-600" />{w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-lg border border-slateLine bg-white p-1 shadow-sm">
        {([
          { id: "teams", label: `Teams (${affectedTeams.length})`, icon: <Users className="h-4 w-4" /> },
          { id: "assets", label: `Assets (${affectedAssets.length})`, icon: <FileCheck2 className="h-4 w-4" /> },
          { id: "vendors", label: `Vendors (${affectedVendors.length})`, icon: <Network className="h-4 w-4" /> },
          { id: "actions", label: `Actions (${criticalActions.length})`, icon: <ClipboardList className="h-4 w-4" /> }
        ] as { id: typeof activeTab; label: string; icon: React.ReactNode }[]).map((tab) => (
          <button
            key={tab.id}
            id={`tab-${tab.id}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition ${
              activeTab === tab.id ? "bg-violet-600 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "teams" && (
        <div className="space-y-4">
          {affectedTeams.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {affectedTeams.map((t) => (
                <div key={t.team} className="rounded-xl border border-slateLine bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{t.team}</p>
                      <p className="mt-1 text-xs text-slate-500">{t.obligation_count} obligation(s) assigned</p>
                    </div>
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                      <Users className="h-4 w-4 text-violet-600" />
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-5 text-slate-600">{t.top_action}</p>
                </div>
              ))}
            </div>
          ) : propagation?.propagations ? (
            <PropagationObligationList propagations={propagation.propagations} />
          ) : (
            <EmptyTab label="No team impact data available." />
          )}
        </div>
      )}

      {activeTab === "assets" && (
        <div className="space-y-3">
          {affectedAssets.length > 0 ? (
            affectedAssets.map((a, i) => <AssetCard key={i} asset={a} />)
          ) : (
            <EmptyTab label="No internal asset impacts identified." />
          )}
        </div>
      )}

      {activeTab === "vendors" && (
        <div className="space-y-3">
          {affectedVendors.length > 0 ? (
            affectedVendors.map((v, i) => <VendorCard key={i} vendor={v} />)
          ) : (
            <EmptyTab label="No vendor impacts identified." />
          )}
        </div>
      )}

      {activeTab === "actions" && (
        <div className="space-y-3">
          {criticalActions.length > 0 ? (
            criticalActions.map((a, i) => <ActionCard key={i} action={a} />)
          ) : propagation?.propagations ? (
            <PropagationActionList propagations={propagation.propagations} />
          ) : (
            <EmptyTab label="No actions generated." />
          )}
        </div>
      )}
    </div>
  );
}

// ─── Supporting Components ────────────────────────────────────────────────────

function PropagationObligationList({ propagations }: { propagations: ObligationPropagation[] }) {
  const relevant = propagations.filter((p) => p.relevant);
  return (
    <div className="space-y-3">
      {relevant.map((p) => (
        <ObligationCard key={p.obligation_id} propagation={p} />
      ))}
    </div>
  );
}

function ObligationCard({ propagation: p }: { propagation: ObligationPropagation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-slateLine bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-5 py-4 text-left"
      >
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono text-slate-400">{p.obligation_id}</span>
            <SeverityBadge severity={p.gap_severity} />
            <ComplianceBadge status={p.compliance_status} />
          </div>
          <p className="mt-1.5 text-sm font-medium text-slate-800">{p.obligation_description}</p>
          <p className="mt-1 text-xs text-slate-500 italic">{p.relevance_reason}</p>
        </div>
        <div className="shrink-0 pt-1">
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>
      {open && (
        <div className="border-t border-slateLine px-5 py-4 space-y-4">
          {p.affected_teams.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Affected Teams</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {p.affected_teams.map((t) => (
                  <span key={t} className="rounded-full bg-violet-100 px-3 py-1 text-xs font-semibold text-violet-700">{t}</span>
                ))}
              </div>
            </div>
          )}
          {p.affected_assets.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Asset Impacts</p>
              <div className="mt-2 space-y-2">
                {p.affected_assets.map((a, i) => <AssetCard key={i} asset={a} compact />)}
              </div>
            </div>
          )}
          {p.action_plan.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Action Plan</p>
              <ul className="mt-2 space-y-1.5">
                {p.action_plan.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-violet-500" />
                    <span><span className="font-semibold">{a.team}:</span> {a.task} <span className="text-slate-400">· {a.deadline} · {a.effort} effort</span></span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function PropagationActionList({ propagations }: { propagations: ObligationPropagation[] }) {
  const actions = propagations.flatMap((p) => p.action_plan);
  return (
    <div className="space-y-3">
      {actions.map((a, i) => <ActionCard key={i} action={a} />)}
    </div>
  );
}

function AssetCard({ asset, compact }: { asset: AssetImpact; compact?: boolean }) {
  const actionColors: Record<AssetAction, string> = {
    update: "bg-amber-100 text-amber-700",
    review: "bg-blue-100 text-blue-700",
    create: "bg-green-100 text-green-700",
    retire: "bg-red-100 text-red-700"
  };
  return (
    <div className={`rounded-lg border border-slateLine bg-white ${compact ? "px-3 py-2" : "px-4 py-3"} shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-slate-400 shrink-0" />
            <p className="text-sm font-semibold text-slate-800">{asset.assetName}</p>
          </div>
          {!compact && <p className="mt-1 text-xs text-slate-500 pl-6">{asset.reason}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${actionColors[asset.action]}`}>
            {asset.action.toUpperCase()}
          </span>
          <SeverityBadge severity={asset.urgency} />
        </div>
      </div>
    </div>
  );
}

function VendorCard({ vendor }: { vendor: VendorImpact }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-slateLine bg-white px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 min-w-0">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
          <Network className="h-4 w-4 text-slate-500" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{vendor.vendorName}</p>
          <p className="mt-0.5 text-xs text-slate-500">{vendor.action}</p>
        </div>
      </div>
      <SeverityBadge severity={vendor.urgency} />
    </div>
  );
}

function ActionCard({ action }: { action: TeamAction }) {
  const effortColor = { high: "text-red-600", medium: "text-amber-600", low: "text-green-600" }[action.effort];
  return (
    <div className="flex items-start gap-4 rounded-lg border border-slateLine bg-white px-4 py-3 shadow-sm">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100">
        <ClipboardList className="h-4 w-4 text-violet-600" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-800">{action.task}</p>
        <p className="mt-1 text-xs text-slate-500">
          <span className="font-semibold text-violet-700">{action.team}</span>
          <span className="mx-2">·</span>
          <span>{action.deadline}</span>
          <span className="mx-2">·</span>
          <span className={`font-semibold ${effortColor}`}>{action.effort} effort</span>
        </p>
      </div>
    </div>
  );
}

function EmptyTab({ label }: { label: string }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-xl border border-dashed border-slateLine bg-white">
      <p className="text-sm text-slate-400">{label}</p>
    </div>
  );
}

// ─── Reusable Form Components ─────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 border-b border-slateLine pb-4">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function TagInput({ id, tags, onChange, placeholder }: { id: string; tags: string[]; onChange: (tags: string[]) => void; placeholder: string }) {
  const [input, setInput] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = input.trim().replace(/,$/, "");
      if (val && !tags.includes(val)) onChange([...tags, val]);
      setInput("");
    } else if (e.key === "Backspace" && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  }

  return (
    <div className="flex flex-wrap gap-2 rounded-lg border border-slateLine bg-slate-50 p-2.5">
      {tags.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-1 text-xs font-semibold text-violet-700">
          {tag}
          <button type="button" onClick={() => onChange(tags.filter((t) => t !== tag))}>
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        id={id}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? placeholder : "Add more..."}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
      />
    </div>
  );
}

function AssetBuilder({ assets, onChange }: { assets: InternalAsset[]; onChange: (a: InternalAsset[]) => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<InternalAssetType>("policy");

  function addAsset() {
    if (!name.trim()) return;
    onChange([...assets, { id: crypto.randomUUID(), name: name.trim(), type }]);
    setName("");
    setType("policy");
  }

  const typeColors: Record<InternalAssetType, string> = {
    policy: "bg-blue-100 text-blue-700",
    runbook: "bg-amber-100 text-amber-700",
    contract: "bg-green-100 text-green-700",
    system: "bg-purple-100 text-purple-700",
    process: "bg-slate-100 text-slate-600"
  };

  return (
    <div className="space-y-2">
      {assets.map((a) => (
        <div key={a.id} className="flex items-center justify-between rounded-lg border border-slateLine bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-medium">{a.name}</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${typeColors[a.type]}`}>{ASSET_TYPE_LABELS[a.type]}</span>
          </div>
          <button type="button" onClick={() => onChange(assets.filter((x) => x.id !== a.id))}>
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      ))}
      <div className="flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addAsset()}
          placeholder="Asset name (e.g. Incident Response Runbook)"
          className="min-w-0 flex-1 rounded-lg border border-slateLine bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as InternalAssetType)}
          className="rounded-lg border border-slateLine bg-white px-3 py-2 text-sm focus:border-violet-400 focus:outline-none"
        >
          {(Object.entries(ASSET_TYPE_LABELS) as [InternalAssetType, string][]).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={addAsset}
          className="flex items-center gap-1 rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
    </div>
  );
}

// ─── Badges ───────────────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: GapSeverity }) {
  const colors: Record<GapSeverity, string> = {
    critical: "bg-red-600 text-white",
    high: "bg-orange-100 text-orange-700",
    medium: "bg-amber-100 text-amber-700",
    low: "bg-slate-100 text-slate-600"
  };
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${colors[severity]}`}>{severity}</span>;
}

function ComplianceBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    non_compliant: { label: "Non-compliant", className: "bg-red-100 text-red-700" },
    partially_compliant: { label: "Partial", className: "bg-amber-100 text-amber-700" },
    compliant: { label: "Compliant", className: "bg-green-100 text-green-700" }
  };
  const c = config[status] ?? { label: status, className: "bg-slate-100 text-slate-600" };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${c.className}`}>{c.label}</span>;
}
