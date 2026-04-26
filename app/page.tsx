"use client";

import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Database,
  Download,
  Eye,
  FileCheck2,
  FileDown,
  FileText,
  Play,
  RotateCcw,
  Search,
  ShieldCheck,
  Upload,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  evaluateRequiredDocuments,
  type RequiredDocumentStatus
} from "@/data/document-requirements";
import { PSD3_PSR_REQUIREMENTS } from "@/data/psd3-psr-requirements";
import { PRODUCT_CONFIG } from "@/lib/app-config";
import {
  getCompleeExpansionRequirements,
  getHomeCountry,
  getTargetCountry,
  isCrossBorderProfile
} from "@/lib/complee-requirement-mapper";
import {
  ASSESSMENT_MODES,
  COMPANY_TYPES,
  COUNTRIES,
  EMPTY_COMPANY_PROFILE,
  DISCLAIMER,
  INSTITUTION_TYPES,
  SERVICES,
  type AssessmentMode,
  type AnalysisResult,
  type CompanyProfile,
  type EvidenceMatrixItem,
  type InstitutionType,
  type Priority,
  type RequirementStatus,
  type ServiceFlow,
  type UploadedDocument
} from "@/lib/types";

type Screen = "landing" | "scope" | "documents" | "processing" | "results";

const PROCESSING_STEPS = [
  "Extracting payment and compliance evidence",
  "Mapping against PSD3/PSR source-backed controls",
  "Extracting evidence",
  "Detecting missing controls",
  "Generating product/compliance roadmap"
];

const INSIGHTS = [
  "Payee verification, APP fraud and customer warning controls are checked separately.",
  "Open banking consent, interface availability and permission dashboards are mapped independently.",
  "SCA coverage includes fallback, exemptions and accessibility for non-smartphone users."
];

const FIELD_CONTROL_CLASS =
  "mt-2 w-full rounded-lg border border-slateLine bg-surface px-3.5 py-3 text-sm text-ink shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition placeholder:text-muted/70 hover:border-muted focus:border-primary";

const OUTLINE_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-slateLine bg-surface px-4 py-2.5 text-sm font-semibold text-mutedInk shadow-sm transition hover:border-muted hover:bg-surfaceMuted";

const MODE_LABELS: Record<AssessmentMode, { title: string; description: string }> = {
  cross_border: {
    title: "Cross-border expansion pack",
    description:
      "Complee-style market entry, local regulator gaps, PSD3/PSR evidence checks and submission roadmap."
  },
  psd3_psr: {
    title: "PSD3/PSR readiness",
    description:
      "Focused evidence-gated readiness matrix for EU payment services, fraud, SCA and open banking controls."
  }
};

const DASHBOARD_WORKSPACES = [
  {
    name: "FlowPay UK expansion",
    mode: "Cross-border",
    target: "France -> United Kingdom",
    status: "Evidence needed",
    score: "42%"
  },
  {
    name: "Atlas PSD3 remediation",
    mode: "PSD3/PSR",
    target: "France",
    status: "Backlog ready",
    score: "68%"
  },
  {
    name: "Helio Open Banking",
    mode: "PSD3/PSR",
    target: "Netherlands",
    status: "Reviewer later",
    score: "55%"
  }
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("landing");
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(
    EMPTY_COMPANY_PROFILE
  );
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploadNotice, setUploadNotice] = useState("");
  const [isExtractingDocuments, setIsExtractingDocuments] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [processingIndex, setProcessingIndex] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedItem, setSelectedItem] = useState<EvidenceMatrixItem | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [error, setError] = useState("");

  const topGaps = useMemo(
    () =>
      result?.matrix
        .filter((item) => item.status !== "Covered")
        .slice(0, 5) ?? [],
    [result]
  );

  const documentCheck = useMemo(
    () => evaluateRequiredDocuments(companyProfile, documents),
    [companyProfile, documents]
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [screen]);

  async function handleUpload(files: FileList | null) {
    if (!files) return;
    const accepted: UploadedDocument[] = [];
    const rejected: string[] = [];
    setIsExtractingDocuments(true);

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
      setIsExtractingDocuments(false);
    }

    setDocuments((current) => [...current, ...accepted]);
    setUploadNotice(
      [
        accepted.length ? `Extracted ${accepted.length} document(s).` : "",
        rejected.length ? `Skipped: ${rejected.join(", ")}.` : ""
      ]
        .filter(Boolean)
        .join(" ")
    );
  }

  async function runAssessment() {
    if (!companyProfile.companyName.trim()) {
      setError("Enter the company name before running the assessment.");
      setScreen("scope");
      return;
    }

    if (companyProfile.services.length === 0) {
      setError("Select at least one service or flow before running the assessment.");
      setScreen("scope");
      return;
    }

    if (
      isCrossBorderProfile(companyProfile) &&
      getHomeCountry(companyProfile) === getTargetCountry(companyProfile)
    ) {
      setError("Choose a different target country for a cross-border expansion assessment.");
      setScreen("scope");
      return;
    }

    if (documents.length === 0) {
      setUploadNotice("Upload the required PDF, .txt or .md evidence before running the assessment.");
      return;
    }

    if (documentCheck.missing.length > 0) {
      setUploadNotice(
        `Missing required evidence: ${documentCheck.missing
          .map((document) => document.title)
          .join(", ")}.`
      );
      return;
    }

    setError("");
    setIsAnalyzing(true);
    setProcessingIndex(0);
    setScreen("processing");

    const timer = window.setInterval(() => {
      setProcessingIndex((current) => Math.min(current + 1, PROCESSING_STEPS.length - 1));
    }, 820);

    try {
      const [response] = await Promise.all([
        fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyProfile,
            documents
          })
        }),
        delay(4200)
      ]);

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as
          | { error?: string; missingRequiredDocuments?: Array<{ title: string }> }
          | null;
        if (payload?.missingRequiredDocuments?.length) {
          throw new Error(
            `Missing required evidence: ${payload.missingRequiredDocuments
              .map((document) => document.title)
              .join(", ")}.`
          );
        }
        throw new Error(payload?.error ?? "Analysis failed");
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
      setProcessingIndex(PROCESSING_STEPS.length - 1);
      setScreen("results");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The assessment could not be completed. Check the server logs and try again."
      );
      setScreen("documents");
    } finally {
      window.clearInterval(timer);
      setIsAnalyzing(false);
    }
  }

  function resetAssessment() {
    setCompanyProfile(EMPTY_COMPANY_PROFILE);
    setDocuments([]);
    setResult(null);
    setSelectedItem(null);
    setReportOpen(false);
    setUploadNotice("");
    setError("");
    setProcessingIndex(0);
    setScreen("landing");
  }

  function toggleService(service: ServiceFlow) {
    setCompanyProfile((profile) => ({
      ...profile,
      services: profile.services.includes(service)
        ? profile.services.filter((item) => item !== service)
        : [...profile.services, service]
    }));
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <AppHeader
        screen={screen}
        onStart={() => setScreen("scope")}
        onReset={resetAssessment}
      />

      {screen !== "landing" ? (
        <div className="mx-auto flex w-full max-w-[1560px] gap-6 px-4 pb-6 pt-4 sm:px-6 lg:px-8">
          <aside className="no-print hidden w-56 shrink-0 lg:block">
            <WorkflowRail screen={screen} />
          </aside>
          <section className="min-w-0 flex-1">
            <div className="no-print mb-4 lg:hidden">
              <WorkflowRail screen={screen} variant="mobile" />
            </div>
            {screen === "scope" ? (
              <CompanyScopeStep
                profile={companyProfile}
                error={error}
                onChange={setCompanyProfile}
                onToggleService={toggleService}
                onNext={() => {
                  setError("");
                  setScreen("documents");
                }}
              />
            ) : null}

            {screen === "documents" ? (
              <DocumentsStep
                profile={companyProfile}
                documents={documents}
                isExtractingDocuments={isExtractingDocuments}
                documentCheck={documentCheck}
                uploadNotice={uploadNotice}
                error={error}
                onBack={() => setScreen("scope")}
                onUpload={handleUpload}
                onRemoveDocument={(name) =>
                  setDocuments((current) => current.filter((doc) => doc.name !== name))
                }
                onRun={runAssessment}
              />
            ) : null}

            {screen === "processing" ? (
              <ProcessingStep
                profile={companyProfile}
                currentIndex={processingIndex}
                isAnalyzing={isAnalyzing}
                documentCount={documents.length}
              />
            ) : null}

            {screen === "results" && result ? (
              <ResultsDashboard
                result={result}
                documents={documents}
                profile={companyProfile}
                onSelectItem={setSelectedItem}
                onDownloadCsv={() => downloadCsv(result)}
                onDownloadSubmissionPack={() =>
                  downloadSubmissionPack(result, companyProfile, documents)
                }
                onOpenReport={() => setReportOpen(true)}
                onReset={resetAssessment}
              />
            ) : null}
          </section>
        </div>
      ) : (
        <Landing onStart={() => setScreen("scope")} />
      )}

      <footer className="border-t border-slateLine bg-surface/90 px-4 py-4 text-center text-xs text-mutedInk">
        {DISCLAIMER}
      </footer>

      {selectedItem ? (
        <EvidenceDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
      ) : null}

      {reportOpen && result ? (
        <ReportModal
          result={result}
          profile={companyProfile}
          documents={documents}
          topGaps={topGaps}
          onClose={() => setReportOpen(false)}
        />
      ) : null}
    </main>
  );
}

function AppHeader({
  screen,
  onStart,
  onReset
}: {
  screen: Screen;
  onStart: () => void;
  onReset: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slateLine bg-surface/95 backdrop-blur no-print">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onReset}
          className="flex min-w-0 items-center gap-3 text-left"
          aria-label={`Return to ${PRODUCT_CONFIG.name} landing page`}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="display-serif block truncate text-xl leading-6">{PRODUCT_CONFIG.name}</span>
            <span className="block truncate text-xs text-mutedInk">
              {PRODUCT_CONFIG.tagline}
            </span>
          </span>
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-slateLine bg-surfaceMuted p-1 text-xs text-mutedInk md:flex">
          {["Scope", "Documents", "Agent", "Results"].map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1.5 ${
                isActiveNav(item, screen) ? "bg-surface font-semibold text-primary shadow-sm" : ""
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          aria-label="Create workspace"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-ink sm:px-4"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          <span className="whitespace-nowrap sm:hidden">New</span>
          <span className="hidden whitespace-nowrap sm:inline">New workspace</span>
        </button>
      </div>
      <div className="hidden border-t border-primary/10 bg-primary px-4 py-3 text-center text-sm font-medium text-white sm:block">
        Cross-border expansion, PSD3/PSR evidence and submission readiness in one workspace
      </div>
    </header>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-112px)] max-w-[1560px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[270px_1fr] lg:px-8">
      <aside className="rounded-lg border border-slateLine bg-surface p-4 shadow-panel">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Workspaces
            </p>
            <h1 className="display-serif mt-1 text-3xl font-normal">{PRODUCT_CONFIG.name}</h1>
          </div>
          <span className="flex size-10 items-center justify-center rounded-lg bg-primary text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
        </div>

        <div className="flex flex-col gap-3">
          {DASHBOARD_WORKSPACES.map((workspace, index) => (
            <button
              key={workspace.name}
              type="button"
              className={`rounded-lg border p-3 text-left transition ${
                index === 0
                  ? "border-regBlue bg-primarySoft text-primary"
                  : "border-slateLine bg-surface text-mutedInk hover:border-muted"
              }`}
            >
              <span className="block text-sm font-semibold">{workspace.name}</span>
              <span className="mt-1 block text-xs">{workspace.target}</span>
              <span className="mt-3 flex items-center justify-between text-xs font-semibold">
                <span>{workspace.mode}</span>
                <span>{workspace.score}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink"
        >
          New workspace
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </aside>

      <div className="flex flex-col gap-6">
        <Panel className="overflow-hidden">
          <div className="grid gap-6 xl:grid-cols-[0.78fr_1.22fr]">
            <div>
              <p className="text-sm font-semibold text-regBlue">Unified platform</p>
              <h2 className="display-serif mt-2 text-4xl font-normal leading-tight sm:text-5xl">
                Expansion readiness, evidence checks and submission prep in one place.
              </h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-mutedInk">
                Complee now combines the upstream cross-border workspace idea with the
                current evidence-gated PSD3/PSR analyzer. Regulatory expectations seed the
                matrix, but uploaded proof decides coverage.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <ProofPoint label="PSD3/PSR base" value={`${PSD3_PSR_REQUIREMENTS.length} controls`} />
                <ProofPoint
                  label="Expansion seeds"
                  value={`${getCompleeExpansionRequirements(EMPTY_COMPANY_PROFILE).length} UK rows`}
                />
                <ProofPoint label="Gate" value="Evidence first" />
              </div>
            </div>

            <div className="rounded-lg border border-slateLine bg-surfaceMuted/55 p-4">
              <div className="flex flex-col gap-3 border-b border-slateLine pb-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
                    FlowPay UK expansion
                  </p>
                  <h3 className="mt-1 text-xl font-semibold">Readiness command center</h3>
                </div>
                <StatusBadge status="Partially covered" />
              </div>

              <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-4">
                <MetricCard label="Sources" value="2" tone="blue" />
                <MetricCard label="Covered" value="0" tone="green" />
                <MetricCard label="Partial" value="4" tone="amber" />
                <MetricCard label="No evidence" value="8" tone="red" />
              </div>

              <div className="grid gap-4 lg:grid-cols-[1fr_0.86fr]">
                <div className="overflow-hidden rounded-lg border border-slateLine bg-surface">
                  <div className="flex items-center justify-between border-b border-slateLine bg-surfaceMuted px-4 py-3">
                    <p className="text-sm font-semibold">Evidence-gated matrix</p>
                    <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-mutedInk">
                      Live path
                    </span>
                  </div>
                  {[
                    ["FCA Expansion", "CASS 15 reconciliation", "Not evidenced"],
                    ["FCA Expansion", "Consumer Duty outcomes", "Partially covered"],
                    ["Payee Verification", "Name matching flow", "Not evidenced"],
                    ["Strong Customer Authentication", "Fallback and accessibility", "Needs human review"]
                  ].map(([domain, title, status]) => (
                    <div
                      key={`${domain}-${title}`}
                      className="grid grid-cols-[1fr_auto] gap-3 border-b border-slateLine px-4 py-3 text-sm last:border-b-0"
                    >
                      <span>
                        <span className="block font-medium">{title}</span>
                        <span className="text-xs text-muted">{domain}</span>
                      </span>
                      <StatusBadge status={status as RequirementStatus} />
                    </div>
                  ))}
                </div>

                <div className="rounded-lg border border-slateLine bg-primarySoft/55 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold">Submission pack v1</p>
                    <FileDown className="h-4 w-4 text-regBlue" aria-hidden="true" />
                  </div>
                  <div className="mt-4 flex flex-col gap-3">
                    {[
                      ["Cover letter", "Ready after analysis"],
                      ["Requirement checklist", "Evidence-gated"],
                      ["Roadmap", "Owner + deadline"],
                      ["Reviewer portal", "Queued"]
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-slateLine bg-surface p-3">
                        <p className="text-sm font-semibold">{label}</p>
                        <p className="mt-1 text-xs text-mutedInk">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Panel>

        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<Building2 className="h-5 w-5" aria-hidden="true" />}
            title="Scope workspace"
            text="Choose PSD3/PSR readiness or cross-border expansion with home and target country context."
          />
          <FeatureCard
            icon={<Search className="h-5 w-5" aria-hidden="true" />}
            title="Gate evidence"
            text="Upload policy, operational and audit evidence; source expectations alone never mark coverage."
          />
          <FeatureCard
            icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
            title="Package output"
            text="Generate a matrix, remediation backlog, board report and submission-pack data export."
          />
        </div>
      </div>
    </section>
  );
}

function CompanyScopeStep({
  profile,
  error,
  onChange,
  onToggleService,
  onNext
}: {
  profile: CompanyProfile;
  error: string;
  onChange: (profile: CompanyProfile) => void;
  onToggleService: (service: ServiceFlow) => void;
  onNext: () => void;
}) {
  const assessmentMode = profile.assessmentMode ?? "psd3_psr";
  const crossBorder = assessmentMode === "cross_border";
  const homeCountry = getHomeCountry(profile);
  const targetCountry = getTargetCountry(profile);
  const expansionRequirements = getCompleeExpansionRequirements(profile);
  const canContinue =
    profile.companyName.trim().length > 0 &&
    profile.services.length > 0 &&
    (!crossBorder || homeCountry !== targetCountry);

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-slateLine pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 1</p>
          <h1 className="display-serif mt-1 text-4xl font-normal leading-tight">
            Create a compliance workspace
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mutedInk">
            Select the platform mode, regulated entity type and every payment service that
            should drive the evidence pack.
          </p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-lg bg-primarySoft text-regBlue sm:flex">
          <Building2 className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-3 py-6 md:grid-cols-2">
        {ASSESSMENT_MODES.map((mode) => {
          const selected = assessmentMode === mode;
          return (
            <button
              key={mode}
              type="button"
              onClick={() =>
                onChange({
                  ...profile,
                  assessmentMode: mode,
                  targetCountry:
                    mode === "cross_border"
                      ? profile.targetCountry ?? "United Kingdom"
                      : profile.country
                })
              }
              className={`rounded-lg border p-4 text-left shadow-sm transition ${
                selected
                  ? "border-regBlue bg-primarySoft text-primary"
                  : "border-slateLine bg-surface text-mutedInk hover:border-muted"
              }`}
            >
              <span className="text-sm font-semibold">{MODE_LABELS[mode].title}</span>
              <span className="mt-2 block text-sm leading-6">
                {MODE_LABELS[mode].description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-5 border-t border-slateLine py-6 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Company name</span>
          <input
            value={profile.companyName}
            onChange={(event) =>
              onChange({ ...profile, companyName: event.target.value })
            }
            placeholder="Atlas Payments"
            className={FIELD_CONTROL_CLASS}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Company type</span>
          <select
            value={profile.companyType}
            onChange={(event) =>
              onChange({
                ...profile,
                companyType: event.target.value as CompanyProfile["companyType"]
              })
            }
            className={FIELD_CONTROL_CLASS}
          >
            {COMPANY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        {crossBorder ? (
          <label className="block">
            <span className="text-sm font-semibold">Institution type</span>
            <select
              value={profile.institutionType ?? "PI"}
              onChange={(event) =>
                onChange({
                  ...profile,
                  institutionType: event.target.value as InstitutionType,
                  companyType: companyTypeForInstitution(
                    event.target.value as InstitutionType
                  )
                })
              }
              className={FIELD_CONTROL_CLASS}
            >
              {INSTITUTION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block">
          <span className="text-sm font-semibold">
            {crossBorder ? "Home country" : "Country"}
          </span>
          <select
            value={crossBorder ? homeCountry : profile.country}
            onChange={(event) =>
              onChange({
                ...profile,
                country: crossBorder
                  ? profile.country
                  : (event.target.value as CompanyProfile["country"]),
                homeCountry: event.target.value as CompanyProfile["country"]
              })
            }
            className={FIELD_CONTROL_CLASS}
          >
            {COUNTRIES.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </label>

        {crossBorder ? (
          <label className="block">
            <span className="text-sm font-semibold">Target country</span>
            <select
              value={targetCountry}
              onChange={(event) =>
                onChange({
                  ...profile,
                  targetCountry: event.target.value as CompanyProfile["country"],
                  country: event.target.value as CompanyProfile["country"]
                })
              }
              className={FIELD_CONTROL_CLASS}
            >
              {COUNTRIES.filter((country) => country !== "Other EU").map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
            {homeCountry === targetCountry ? (
              <p className="mt-2 text-xs font-semibold text-regRed">
                Pick a different target country for expansion mode.
              </p>
            ) : null}
          </label>
        ) : null}

        <div className="rounded-lg border border-slateLine bg-primarySoft/70 p-4">
          <p className="text-sm font-semibold text-primary">Positioning guardrail</p>
          <p className="mt-2 text-sm leading-6 text-mutedInk">
            Output is an evidence-gated readiness pack and backlog, not legal certification.
          </p>
          {crossBorder ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-regBlue">
              {expansionRequirements.length} target-market seed rows
            </p>
          ) : null}
        </div>
      </div>

      <div>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Services / flows</p>
            <p className="text-sm text-mutedInk">
              Select every flow that changes the regulatory scope and evidence pack.
            </p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            {profile.services.length} selected
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const selected = profile.services.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => onToggleService(service)}
                className={`flex min-h-[72px] items-start justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm shadow-sm transition ${
                  selected
                    ? "border-regBlue bg-primarySoft text-primary"
                    : "border-slateLine bg-surface text-mutedInk hover:border-muted hover:bg-surfaceMuted/70"
                }`}
              >
                <span className="leading-5">{service}</span>
                <span
                  className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border ${
                    selected ? "border-regBlue bg-regBlue text-white" : "border-slateLine bg-surface"
                  }`}
                >
                  {selected ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-8 flex justify-end">
        <button
          type="button"
          onClick={onNext}
          disabled={!canContinue}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to documents
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

function DocumentsStep({
  profile,
  documents,
  isExtractingDocuments,
  documentCheck,
  uploadNotice,
  error,
  onBack,
  onUpload,
  onRemoveDocument,
  onRun
}: {
  profile: CompanyProfile;
  documents: UploadedDocument[];
  isExtractingDocuments: boolean;
  documentCheck: {
    required: RequiredDocumentStatus[];
    missing: RequiredDocumentStatus[];
  };
  uploadNotice: string;
  error: string;
  onBack: () => void;
  onUpload: (files: FileList | null) => void;
  onRemoveDocument: (name: string) => void;
  onRun: () => void;
}) {
  const crossBorder = isCrossBorderProfile(profile);

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-slateLine pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 2</p>
          <h1 className="display-serif mt-1 text-4xl font-normal leading-tight">
            Upload the required evidence documents
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-mutedInk">
            The required document list is generated from the workspace mode and services.
            Analysis is blocked until every required evidence pack is represented.
          </p>
        </div>
        <span className="hidden size-12 items-center justify-center rounded-lg bg-primarySoft text-regBlue sm:flex">
          <FileText className="h-6 w-6" aria-hidden="true" />
        </span>
      </div>

      <div className="grid items-start gap-4 py-6 lg:grid-cols-[0.88fr_1.12fr]">
        <label className="group flex min-h-[236px] cursor-pointer flex-col justify-between rounded-lg border border-dashed border-primary/25 bg-primarySoft/45 p-5 transition hover:border-regBlue hover:bg-primarySoft">
          <div className="flex items-start gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface text-primary shadow-sm">
            <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Upload PDF, .txt or .md</p>
              <p className="mt-1 text-sm leading-6 text-mutedInk">
                {isExtractingDocuments ? "Extracting documents..." : "PDF text is extracted before upload"}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-slateLine bg-surface px-4 py-3 text-xs leading-5 text-mutedInk shadow-sm">
            Drop policies, operating logs, board packs or application checklists here.
            Required packs update from the selected mode.
          </div>
          <input
            type="file"
            multiple
            accept=".txt,.md,.pdf,text/plain,text/markdown"
            className="sr-only"
            disabled={isExtractingDocuments}
            onChange={(event) => onUpload(event.target.files)}
          />
        </label>

        <div className="rounded-lg border border-slateLine bg-surfaceMuted/55 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Required evidence for selected services</p>
              <p className="mt-1 text-sm text-mutedInk">
                {documentCheck.required.length} pack(s), {documentCheck.missing.length} missing.
              </p>
              {crossBorder ? (
                <p className="mt-1 text-xs font-semibold text-regBlue">
                  {getHomeCountry(profile)} to {getTargetCountry(profile)} expansion mode
                </p>
              ) : null}
            </div>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface text-mutedInk">
              <ClipboardList className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <div className="mt-4 flex max-h-64 flex-col gap-3 overflow-y-auto pr-1">
            {documentCheck.required.map((requirement) => (
              <div
                key={requirement.id}
                className={`rounded-lg border bg-surface p-3 shadow-sm ${
                  requirement.satisfiedBy.length
                    ? "border-green-200"
                    : "border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{requirement.title}</p>
                    <p className="mt-1 text-xs leading-5 text-mutedInk">
                      {requirement.description}
                    </p>
                  </div>
                  {requirement.satisfiedBy.length ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-regGreen" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-regAmber" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">
                  {requirement.satisfiedBy.length
                    ? `Matched: ${requirement.satisfiedBy.join(", ")}`
                    : `Needed for: ${requirement.requirementIds.join(", ")}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {uploadNotice ? (
        <div className="mb-5 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {uploadNotice}
        </div>
      ) : null}
      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="rounded-lg border border-slateLine bg-surface">
        <div className="flex items-center justify-between border-b border-slateLine px-4 py-3">
          <p className="font-semibold">Documents ready for analysis</p>
          <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-mutedInk">
            {documents.length} file(s)
          </span>
        </div>
        {documents.length ? (
          <div className="divide-y divide-slateLine">
            {documents.map((document) => (
              <div
                key={document.name}
                className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-regGreen" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{document.name}</p>
                    <p className="mt-1 text-xs text-muted">
                      {document.content.length.toLocaleString()} characters extracted
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveDocument(document.name)}
                  className="inline-flex items-center gap-1 self-start rounded-lg border border-slateLine px-3 py-2 text-xs font-semibold text-mutedInk transition hover:border-muted"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center text-sm text-muted">
            <FileText className="h-6 w-6" aria-hidden="true" />
            <span>No documents loaded yet.</span>
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className={OUTLINE_BUTTON_CLASS}
        >
          Back
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={isExtractingDocuments}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink"
        >
          Run {crossBorder ? "expansion readiness assessment" : "PSD3/PSR readiness assessment"}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

function ProcessingStep({
  profile,
  currentIndex,
  isAnalyzing,
  documentCount
}: {
  profile: CompanyProfile;
  currentIndex: number;
  isAnalyzing: boolean;
  documentCount: number;
}) {
  const crossBorder = isCrossBorderProfile(profile);

  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 3</p>
          <h1 className="display-serif mt-1 text-4xl font-normal leading-tight">
            Agent is building your readiness matrix
          </h1>
          <p className="mt-3 text-sm leading-6 text-mutedInk">
            The workflow reads {documentCount} document(s), maps evidence against
            source-backed {crossBorder ? "target-market and PSD3/PSR" : "PSD3/PSR"} controls and prepares a board-ready backlog.
          </p>
          <div className="mt-6 rounded-lg border border-slateLine bg-surfaceMuted p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Live insights
            </p>
            <div className="mt-3 grid gap-3">
              {INSIGHTS.map((insight, index) => (
                <div
                  key={insight}
                  className={`rounded-lg border bg-surface p-3 text-sm shadow-sm transition ${
                    index <= currentIndex
                      ? "border-amber-200 text-ink"
                      : "border-slateLine text-muted"
                  }`}
                >
                  <AlertTriangle
                    className={`mr-2 inline h-4 w-4 ${
                      index <= currentIndex ? "text-regAmber" : "text-muted"
                    }`}
                    aria-hidden="true"
                  />
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slateLine bg-surface p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-semibold">Agent timeline</p>
            <span className="rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-regBlue">
              {isAnalyzing ? "Running" : "Finalizing"}
            </span>
          </div>
          <div className="flex flex-col gap-4">
            {PROCESSING_STEPS.map((step, index) => {
              const complete = index < currentIndex;
              const active = index === currentIndex;
              return (
                <div key={step} className="flex gap-3">
                  <span
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                      complete
                        ? "border-green-200 bg-green-50 text-regGreen"
                        : active
                          ? "border-blue-200 bg-blue-50 text-regBlue"
                          : "border-slateLine bg-surfaceMuted text-muted"
                    }`}
                  >
                    {complete ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <Clock3
                        className={`h-4 w-4 ${active ? "animate-pulse" : ""}`}
                        aria-hidden="true"
                      />
                    )}
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{step}</p>
                    <p className="mt-1 text-xs text-muted">
                      {active ? "Analyzing evidence and gaps..." : complete ? "Completed" : "Queued"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function ResultsDashboard({
  result,
  documents,
  profile,
  onSelectItem,
  onDownloadCsv,
  onDownloadSubmissionPack,
  onOpenReport,
  onReset
}: {
  result: AnalysisResult;
  documents: UploadedDocument[];
  profile: CompanyProfile;
  onSelectItem: (item: EvidenceMatrixItem) => void;
  onDownloadCsv: () => void;
  onDownloadSubmissionPack: () => void;
  onOpenReport: () => void;
  onReset: () => void;
}) {
  const crossBorder = isCrossBorderProfile(profile);

  return (
    <div className="flex flex-col gap-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-regBlue">Step 4</p>
            <h1 className="display-serif mt-1 text-4xl font-normal leading-tight">
              {crossBorder ? "Expansion readiness dashboard" : "PSD3/PSR readiness dashboard"}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-mutedInk">
              Evidence matrix and remediation backlog for {profile.companyName}
              {crossBorder
                ? ` expanding from ${getHomeCountry(profile)} to ${getTargetCountry(profile)}`
                : ""}. This is a readiness assessment, not legal advice.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onDownloadSubmissionPack}
              className={OUTLINE_BUTTON_CLASS}
            >
              <FileCheck2 className="h-4 w-4" aria-hidden="true" />
              Submission pack
            </button>
            <button
              type="button"
              onClick={onOpenReport}
              className={OUTLINE_BUTTON_CLASS}
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={onDownloadCsv}
              className={OUTLINE_BUTTON_CLASS}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-ink"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Start new assessment
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Analyzed requirements" value={result.summary.totalRequirements} tone="blue" />
          <MetricCard label="Covered" value={result.summary.covered} tone="green" />
          <MetricCard label="Partially covered" value={result.summary.partiallyCovered} tone="amber" />
          <MetricCard label="Not evidenced" value={result.summary.notEvidenced} tone="red" />
          <MetricCard label="Needs review" value={result.summary.needsHumanReview} tone="gray" />
        </div>

        {result.diagnostics ? <EngineBanner result={result} /> : null}
      </Panel>

      <Panel>
        <div className="flex flex-col gap-2 border-b border-slateLine pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">Readiness matrix</h2>
            <p className="mt-1 text-sm text-mutedInk">
              {documents.length} document(s) analyzed against the current source-backed
              {crossBorder ? " expansion and PSD3/PSR" : " PSD3/PSR"} requirement base.
            </p>
          </div>
          <span className="rounded-full bg-primarySoft px-3 py-1 text-xs font-semibold text-regBlue">
            Source-backed controls
          </span>
        </div>
        <MatrixMobileCards matrix={result.matrix} onSelectItem={onSelectItem} />
        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-slateLine md:block">
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-surfaceMuted text-xs uppercase tracking-[0.08em] text-muted">
                {[
                  "Domain",
                  "Requirement",
                  "Reference",
                  "Status",
                  "Evidence found",
                  "Missing evidence",
                  "Priority",
                  "Confidence",
                  "Action"
                ].map((heading) => (
                  <th key={heading} className="border-b border-slateLine px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.matrix.map((item) => (
                <tr key={item.requirementId} className="align-top transition hover:bg-surfaceMuted/45">
                  <td className="border-b border-slateLine px-3 py-4 font-semibold text-ink">
                    {item.domain}
                  </td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4">
                    <p className="font-medium">{item.requirementTitle}</p>
                    <p className="mt-1 text-xs text-muted">{item.requirementId}</p>
                  </td>
                  <td className="max-w-[220px] border-b border-slateLine px-3 py-4 text-xs leading-5 text-muted">
                    <span className="line-clamp-3">
                      {item.regulatoryReference ?? "Source reference not supplied"}
                    </span>
                  </td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="max-w-[250px] border-b border-slateLine px-3 py-4 text-mutedInk">
                    <span className="line-clamp-3">{item.evidenceFound}</span>
                  </td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4 text-mutedInk">
                    <span className="line-clamp-3">
                      {item.missingEvidence.length
                        ? item.missingEvidence.join("; ")
                        : "No material gap detected in supplied documents."}
                    </span>
                  </td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <PriorityBadge priority={item.priority} />
                  </td>
                  <td className="border-b border-slateLine px-3 py-4 font-semibold">
                    {Math.round(item.confidence * 100)}%
                  </td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <button
                      type="button"
                      onClick={() => onSelectItem(item)}
                      aria-label={`View evidence for ${item.requirementId}`}
                      title="View evidence"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slateLine bg-surface text-mutedInk transition hover:border-regBlue hover:text-regBlue"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span className="sr-only">View evidence</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel>
        <div className="flex items-start justify-between gap-4 border-b border-slateLine pb-4">
          <div>
            <h2 className="text-xl font-semibold">Generated roadmap/backlog</h2>
            <p className="mt-1 text-sm text-mutedInk">
              Prioritized product, compliance and engineering tasks from the evidence gaps.
            </p>
          </div>
          <ClipboardList className="hidden h-6 w-6 text-muted sm:block" aria-hidden="true" />
        </div>
        <RoadmapMobileCards roadmap={result.roadmap} />
        <div className="mt-4 hidden overflow-x-auto rounded-lg border border-slateLine md:block">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="bg-surfaceMuted text-xs uppercase tracking-[0.08em] text-muted">
                {[
                  "Task",
                  "Owner",
                  "Priority",
                  "Deadline",
                  "Evidence required",
                  "Acceptance criteria"
                ].map((heading) => (
                  <th key={heading} className="border-b border-slateLine px-3 py-3 font-semibold">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.roadmap.map((task) => (
                <tr key={`${task.title}-${task.linkedRequirementIds.join("-")}`} className="align-top transition hover:bg-surfaceMuted/45">
                  <td className="max-w-[260px] border-b border-slateLine px-3 py-4 font-semibold">
                    {task.title}
                    <p className="mt-1 text-xs font-normal text-muted">
                      {task.linkedRequirementIds.join(", ")}
                    </p>
                  </td>
                  <td className="border-b border-slateLine px-3 py-4 text-mutedInk">{task.owner}</td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="border-b border-slateLine px-3 py-4 font-semibold">{task.deadline}</td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4 text-mutedInk">
                    {task.evidenceRequired.join("; ")}
                  </td>
                  <td className="max-w-[300px] border-b border-slateLine px-3 py-4 text-mutedInk">
                    {task.acceptanceCriteria}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function EngineBanner({ result }: { result: AnalysisResult }) {
  const diagnostics = result.diagnostics;
  if (!diagnostics) return null;

  const engineLabel =
    diagnostics.engine === "openai"
      ? `OpenAI ${diagnostics.model ?? "model"}`
      : "Deterministic fallback";
  const persistenceTone =
    diagnostics.persistence.status === "saved"
      ? "border-green-200 bg-emerald-50 text-green-900"
      : diagnostics.persistence.status === "failed"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-lg border border-slateLine bg-primarySoft/65 p-4 text-sm text-primary">
        <div className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="h-4 w-4" aria-hidden="true" />
          {engineLabel}
        </div>
        <p className="mt-2 leading-6">
          Reasoning effort: {diagnostics.reasoningEffort ?? "not applicable"}.
          Generated {new Date(diagnostics.generatedAt).toLocaleString()}.
        </p>
        {diagnostics.warnings.length ? (
          <details className="mt-3 rounded-lg border border-slateLine bg-surface/70 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.12em] text-regBlue">
              Run notes ({diagnostics.warnings.length})
            </summary>
            <p className="mt-2 leading-6">{diagnostics.warnings.join(" ")}</p>
          </details>
        ) : null}
      </div>
      <div className={`rounded-lg border p-4 text-sm ${persistenceTone}`}>
        <div className="flex items-center gap-2 font-semibold">
          <Database className="h-4 w-4" aria-hidden="true" />
          Supabase: {diagnostics.persistence.status}
        </div>
        <p className="mt-2 leading-6">{diagnostics.persistence.detail}</p>
      </div>
    </div>
  );
}

function EvidenceDrawer({
  item,
  onClose
}: {
  item: EvidenceMatrixItem;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-primary/30 backdrop-blur-sm no-print">
      <button
        type="button"
        aria-label="Close evidence panel"
        className="hidden flex-1 sm:block"
        onClick={onClose}
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-slateLine bg-surface p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slateLine pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              Evidence review
            </p>
            <h2 className="display-serif mt-2 text-3xl font-normal leading-tight">
              {item.requirementTitle}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close evidence panel"
            className="rounded-lg border border-slateLine p-2 text-mutedInk transition hover:border-muted"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex flex-col gap-4 py-5">
          <DetailRow label="Requirement ID" value={item.requirementId} />
          <DetailRow label="Status" value={<StatusBadge status={item.status} />} />
          <DetailRow label="Domain" value={item.domain} />
          <DetailRow
            label="Regulatory reference"
            value={item.regulatoryReference ?? "No regulatory reference supplied"}
          />
          <DetailRow label="Source document" value={item.sourceDocument ?? "No source document"} />
          <DetailRow
            label="Evidence excerpt"
            value={
              item.evidenceExcerpt ??
              "Not evidenced in the uploaded documents"
            }
          />
          <DetailRow
            label="Missing evidence"
            value={
              item.missingEvidence.length
                ? item.missingEvidence.join("; ")
                : "No material missing evidence listed."
            }
          />
          <DetailRow label="Recommended remediation task" value={item.recommendedTask} />
          <DetailRow label="Confidence score" value={`${Math.round(item.confidence * 100)}%`} />
        </div>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          This is a readiness assessment, not legal advice.
        </div>
      </aside>
    </div>
  );
}

function MatrixMobileCards({
  matrix,
  onSelectItem
}: {
  matrix: EvidenceMatrixItem[];
  onSelectItem: (item: EvidenceMatrixItem) => void;
}) {
  return (
    <div className="mt-4 grid gap-3 md:hidden">
      {matrix.map((item) => (
        <article key={item.requirementId} className="rounded-lg border border-slateLine bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
            <span className="text-xs font-semibold text-muted">{item.requirementId}</span>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            {item.domain}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-6">{item.requirementTitle}</h3>
          <p className="mt-2 text-xs leading-5 text-muted">
            {item.regulatoryReference ?? "Source reference not supplied"}
          </p>
          <p className="mt-3 text-sm leading-6 text-mutedInk">{item.evidenceFound}</p>
          <p className="mt-3 text-sm leading-6 text-mutedInk">
            <span className="font-semibold">Missing: </span>
            {item.missingEvidence.length
              ? item.missingEvidence.join("; ")
              : "No material gap detected in supplied documents."}
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">
              Confidence {Math.round(item.confidence * 100)}%
            </span>
            <button
              type="button"
              onClick={() => onSelectItem(item)}
              className="inline-flex items-center gap-2 rounded-lg border border-slateLine bg-surface px-3 py-2 text-xs font-semibold text-mutedInk transition hover:border-regBlue hover:text-regBlue"
            >
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
              View evidence
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}

function RoadmapMobileCards({ roadmap }: { roadmap: AnalysisResult["roadmap"] }) {
  return (
    <div className="mt-4 grid gap-3 md:hidden">
      {roadmap.map((task) => (
        <article key={task.title} className="rounded-lg border border-slateLine bg-surface p-4 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs font-semibold text-mutedInk">
              {task.deadline}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-6">{task.title}</h3>
          <p className="mt-1 text-sm font-semibold text-muted">{task.owner}</p>
          <p className="mt-3 text-sm leading-6 text-mutedInk">
            <span className="font-semibold">Evidence: </span>
            {task.evidenceRequired.join("; ")}
          </p>
          <p className="mt-3 text-sm leading-6 text-mutedInk">
            <span className="font-semibold">Acceptance: </span>
            {task.acceptanceCriteria}
          </p>
          <p className="mt-3 text-xs font-semibold text-muted">
            {task.linkedRequirementIds.join(", ")}
          </p>
        </article>
      ))}
    </div>
  );
}

function ReportModal({
  result,
  profile,
  documents,
  topGaps,
  onClose
}: {
  result: AnalysisResult;
  profile: CompanyProfile;
  documents: UploadedDocument[];
  topGaps: EvidenceMatrixItem[];
  onClose: () => void;
}) {
  const crossBorder = isCrossBorderProfile(profile);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-primary/35 p-4 backdrop-blur-sm print-shell">
      <div className="mx-auto max-w-5xl rounded-lg border border-slateLine bg-surface p-6 shadow-2xl print-card">
        <div className="no-print mb-5 flex flex-col gap-3 border-b border-slateLine pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-regBlue">Export PDF</p>
            <h2 className="display-serif text-3xl font-normal leading-tight">
              Board-ready report preview
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Print / save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className={OUTLINE_BUTTON_CLASS}
            >
              Close
            </button>
          </div>
        </div>

        <article className="flex flex-col gap-6 text-sm">
          <section className="print-break">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              {PRODUCT_CONFIG.name}
            </p>
            <h1 className="display-serif mt-2 text-4xl font-normal leading-tight">
              {crossBorder ? "Expansion readiness report" : "PSD3/PSR readiness report"}
            </h1>
            <p className="mt-2 text-mutedInk">
              {profile.companyName} - {profile.companyType} -{" "}
              {crossBorder
                ? `${getHomeCountry(profile)} to ${getTargetCountry(profile)}`
                : profile.country}
            </p>
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
              {DISCLAIMER}
            </p>
          </section>

          <section className="grid gap-3 print-break sm:grid-cols-4">
            <MetricCard label="Requirements" value={result.summary.totalRequirements} tone="blue" />
            <MetricCard label="Covered" value={result.summary.covered} tone="green" />
            <MetricCard label="Partial" value={result.summary.partiallyCovered} tone="amber" />
            <MetricCard label="No evidence" value={result.summary.notEvidenced} tone="red" />
          </section>

          {result.diagnostics ? (
            <section className="print-break">
              <h2 className="text-xl font-semibold">Analysis run</h2>
              <div className="mt-3 grid gap-3 rounded-lg border border-slateLine p-4 sm:grid-cols-2">
                <DetailRow
                  label="Engine"
                  value={
                    result.diagnostics.engine === "openai"
                      ? `OpenAI ${result.diagnostics.model ?? ""}`.trim()
                      : "Deterministic fallback"
                  }
                />
                <DetailRow
                  label="Persistence"
                  value={`${result.diagnostics.persistence.status}: ${result.diagnostics.persistence.detail}`}
                />
              </div>
            </section>
          ) : null}

          <section className="print-break">
            <h2 className="text-xl font-semibold">Company profile</h2>
            <div className="mt-3 grid gap-3 rounded-lg border border-slateLine p-4 sm:grid-cols-2">
              <DetailRow
                label="Mode"
                value={MODE_LABELS[profile.assessmentMode ?? "psd3_psr"].title}
              />
              {crossBorder ? (
                <DetailRow
                  label="Expansion corridor"
                  value={`${getHomeCountry(profile)} -> ${getTargetCountry(profile)}`}
                />
              ) : null}
              <DetailRow label="Services" value={profile.services.join(", ")} />
              <DetailRow label="Documents analyzed" value={documents.map((doc) => doc.name).join(", ")} />
            </div>
          </section>

          <section className="print-break">
            <h2 className="text-xl font-semibold">Top gaps</h2>
            <div className="mt-3 flex flex-col gap-3">
              {topGaps.map((gap) => (
                <div key={gap.requirementId} className="rounded-lg border border-slateLine p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={gap.status} />
                    <PriorityBadge priority={gap.priority} />
                    <span className="text-xs font-semibold text-muted">{gap.requirementId}</span>
                  </div>
                  <p className="mt-2 font-semibold">{gap.requirementTitle}</p>
                  <p className="mt-1 text-mutedInk">{gap.missingEvidence.join("; ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Readiness matrix</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="text-muted">
                    <th className="border-b border-slateLine py-2 pr-3">Domain</th>
                    <th className="border-b border-slateLine py-2 pr-3">Requirement</th>
                    <th className="border-b border-slateLine py-2 pr-3">Reference</th>
                    <th className="border-b border-slateLine py-2 pr-3">Status</th>
                    <th className="border-b border-slateLine py-2 pr-3">Missing evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matrix.map((item) => (
                    <tr key={item.requirementId}>
                      <td className="border-b border-slateLine py-2 pr-3 font-semibold">
                        {item.domain}
                      </td>
                      <td className="border-b border-slateLine py-2 pr-3">
                        {item.requirementTitle}
                      </td>
                      <td className="border-b border-slateLine py-2 pr-3">
                        {item.regulatoryReference ?? "No source reference"}
                      </td>
                      <td className="border-b border-slateLine py-2 pr-3">{item.status}</td>
                      <td className="border-b border-slateLine py-2 pr-3">
                        {item.missingEvidence.join("; ") || "No material gap detected"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Roadmap</h2>
            <div className="mt-3 flex flex-col gap-3">
              {result.roadmap.map((task) => (
                <div key={task.title} className="rounded-lg border border-slateLine p-4 print-break">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs font-semibold text-muted">{task.deadline}</span>
                  </div>
                  <p className="mt-2 font-semibold">{task.title}</p>
                  <p className="mt-1 text-mutedInk">
                    Owner: {task.owner}. Evidence: {task.evidenceRequired.join("; ")}.
                  </p>
                  <p className="mt-1 text-mutedInk">
                    Acceptance criteria: {task.acceptanceCriteria}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {result.diagnostics?.regulatorySources.length ? (
            <section className="print-break">
              <h2 className="text-xl font-semibold">Regulatory sources</h2>
              <div className="mt-3 flex flex-col gap-2">
                {result.diagnostics.regulatorySources.map((source) => (
                  <p key={source.url} className="text-mutedInk">
                    {source.label}: {source.url}
                  </p>
                ))}
              </div>
            </section>
          ) : null}
        </article>
      </div>
    </div>
  );
}

function WorkflowRail({
  screen,
  variant = "desktop"
}: {
  screen: Screen;
  variant?: "desktop" | "mobile";
}) {
  const steps = [
    ["scope", "Company scope"],
    ["documents", "Documents"],
    ["processing", "Agent processing"],
    ["results", "Results dashboard"]
  ] as const;

  if (variant === "mobile") {
    return (
      <div className="rounded-lg border border-slateLine bg-surface p-2 shadow-sm">
        <div className="grid grid-cols-4 gap-2">
          {steps.map(([key, label], index) => {
            const active = key === screen;
            const shortLabel =
              key === "scope"
                ? "Scope"
                : key === "documents"
                  ? "Docs"
                  : key === "processing"
                    ? "Agent"
                    : "Result";
            return (
              <div
                key={key}
                aria-label={label}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-[11px] ${
                  active
                    ? "bg-primary text-white"
                    : "bg-surfaceMuted text-mutedInk"
                }`}
              >
                <span
                  className={`flex size-5 items-center justify-center rounded-full text-[11px] font-semibold ${
                    active ? "bg-surface/18 text-white" : "bg-surface text-mutedInk"
                  }`}
                >
                  {index + 1}
                </span>
                <span className="truncate font-semibold">{shortLabel}</span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 rounded-lg border border-slateLine bg-surface p-4 shadow-panel">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
        Workflow
      </p>
      <div className="flex flex-col gap-2">
        {steps.map(([key, label], index) => {
          const active = key === screen;
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                active ? "bg-primary font-semibold text-white" : "text-mutedInk hover:bg-surfaceMuted"
              }`}
            >
              <span
                className={`flex size-6 items-center justify-center rounded-full text-xs ${
                  active ? "bg-surface/20 text-white" : "bg-surfaceMuted text-muted"
                }`}
              >
                {index + 1}
              </span>
              {label}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Panel({
  children,
  className = ""
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-lg border border-slateLine bg-surface p-5 shadow-panel sm:p-6 ${className}`}>
      {children}
    </div>
  );
}

function MetricCard({
  label,
  value,
  tone
}: {
  label: string;
  value: string | number;
  tone: "blue" | "green" | "amber" | "red" | "gray";
}) {
  const toneClasses = {
    blue: "border-blue-200 bg-blue-50 text-regBlue",
    green: "border-green-200 bg-emerald-50 text-regGreen",
    amber: "border-amber-200 bg-amber-50 text-regAmber",
    red: "border-red-200 bg-red-50 text-regRed",
    gray: "border-slateLine bg-surfaceMuted text-mutedInk"
  };

  return (
    <div className={`rounded-lg border p-4 shadow-sm ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ProofPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slateLine bg-surface p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">{label}</p>
      <p className="mt-2 font-semibold text-ink">{value}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  text
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-lg border border-slateLine bg-surface p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-panel">
      <div className="mb-4 flex size-10 items-center justify-center rounded-lg bg-primarySoft text-regBlue">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-mutedInk">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: RequirementStatus }) {
  const classes = {
    Covered: "bg-emerald-50 text-regGreen border-green-200",
    "Partially covered": "bg-amber-50 text-regAmber border-amber-200",
    "Not evidenced": "bg-red-50 text-regRed border-red-200",
    "Needs human review": "bg-blue-50 text-regBlue border-blue-200"
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[status]}`}
    >
      {status}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const classes = {
    Low: "bg-surfaceMuted text-mutedInk border-slateLine",
    Medium: "bg-blue-50 text-regBlue border-blue-200",
    High: "bg-amber-50 text-regAmber border-amber-200",
    Critical: "bg-red-50 text-regRed border-red-200"
  };

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${classes[priority]}`}
    >
      {priority}
    </span>
  );
}

function DetailRow({
  label,
  value
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-ink">{value}</div>
    </div>
  );
}

function isActiveNav(label: string, screen: Screen) {
  return (
    (label === "Scope" && screen === "scope") ||
    (label === "Documents" && screen === "documents") ||
    (label === "Agent" && screen === "processing") ||
    (label === "Results" && screen === "results")
  );
}

function companyTypeForInstitution(
  institutionType: InstitutionType
): CompanyProfile["companyType"] {
  if (institutionType === "EMI" || institutionType === "Small EMI") {
    return "Electronic Money Institution";
  }

  if (institutionType === "AISP" || institutionType === "PISP") {
    return "Open Banking Provider";
  }

  return "Payment Institution";
}

async function extractUploadedDocument(file: File): Promise<UploadedDocument> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/extract-document", {
    method: "POST",
    body: formData
  });
  const payload = (await response.json().catch(() => null)) as
    | { document?: UploadedDocument; error?: string }
    | null;

  if (!response.ok || !payload?.document) {
    throw new Error(payload?.error ?? "unsupported or unreadable file");
  }

  return payload.document;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function downloadCsv(result: AnalysisResult) {
  const rows = [
    ["Readiness matrix"],
    [
      "Requirement ID",
      "Domain",
      "Requirement",
      "Regulatory reference",
      "Status",
      "Evidence found",
      "Missing evidence",
      "Priority",
      "Confidence",
      "Recommended task"
    ],
    ...result.matrix.map((item) => [
      item.requirementId,
      item.domain,
      item.requirementTitle,
      item.regulatoryReference ?? "",
      item.status,
      item.evidenceFound,
      item.missingEvidence.join("; "),
      item.priority,
      `${Math.round(item.confidence * 100)}%`,
      item.recommendedTask
    ]),
    [],
    ["Roadmap"],
    [
      "Task",
      "Owner",
      "Priority",
      "Deadline",
      "Evidence required",
      "Acceptance criteria",
      "Linked requirements"
    ],
    ...result.roadmap.map((task) => [
      task.title,
      task.owner,
      task.priority,
      task.deadline,
      task.evidenceRequired.join("; "),
      task.acceptanceCriteria,
      task.linkedRequirementIds.join("; ")
    ]),
    [],
    ["Disclaimer", result.disclaimer]
  ];

  const csv = rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${PRODUCT_CONFIG.csvPrefix}-${result.runId}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function downloadSubmissionPack(
  result: AnalysisResult,
  profile: CompanyProfile,
  documents: UploadedDocument[]
) {
  const crossBorder = isCrossBorderProfile(profile);
  const pack = {
    generatedAt: new Date().toISOString(),
    product: PRODUCT_CONFIG.name,
    runId: result.runId,
    coverLetter: {
      title: crossBorder
        ? `${profile.companyName} expansion readiness pack`
        : `${profile.companyName} PSD3/PSR readiness pack`,
      companyName: profile.companyName,
      mode: MODE_LABELS[profile.assessmentMode ?? "psd3_psr"].title,
      corridor: crossBorder
        ? {
            homeCountry: getHomeCountry(profile),
            targetCountry: getTargetCountry(profile)
          }
        : null,
      disclaimer: result.disclaimer
    },
    preFlightChecklist: {
      totalRequirements: result.summary.totalRequirements,
      notReadyRows: result.matrix
        .filter((item) => item.status !== "Covered")
        .map((item) => ({
          requirementId: item.requirementId,
          title: item.requirementTitle,
          status: item.status,
          missingEvidence: item.missingEvidence
        })),
      uploadedDocuments: documents.map((document) => ({
        name: document.name,
        type: document.type,
        extractedCharacters: document.content.length
      }))
    },
    matrix: result.matrix,
    roadmap: result.roadmap,
    auditTrail: [
      {
        event: "workspace_scoped",
        actor: "local-user",
        at: result.diagnostics?.generatedAt ?? new Date().toISOString(),
        payload: {
          companyProfile: profile,
          documentCount: documents.length
        }
      },
      {
        event: "analysis_generated",
        actor: result.diagnostics?.engine ?? "fallback",
        at: result.diagnostics?.generatedAt ?? new Date().toISOString(),
        payload: {
          summary: result.summary,
          warnings: result.diagnostics?.warnings ?? []
        }
      }
    ],
    nextMilestone: "Reviewer comments, approval and hash-chain signing are queued after the unified core flow."
  };
  const blob = new Blob([JSON.stringify(pack, null, 2)], {
    type: "application/json;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${PRODUCT_CONFIG.csvPrefix}-submission-pack-${result.runId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}
