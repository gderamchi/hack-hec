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
import { useMemo, useState } from "react";
import {
  evaluateRequiredDocuments,
  type RequiredDocumentStatus
} from "@/data/document-requirements";
import { PSD3_PSR_REQUIREMENTS } from "@/data/psd3-psr-requirements";
import { PRODUCT_CONFIG, REGULATORY_SOURCE_SUMMARY } from "@/lib/app-config";
import {
  COMPANY_TYPES,
  COUNTRIES,
  EMPTY_COMPANY_PROFILE,
  DISCLAIMER,
  SERVICES,
  type AnalysisResult,
  type CompanyProfile,
  type EvidenceMatrixItem,
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
    <main className="min-h-screen bg-[#f6f8fb] text-ink">
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
                onOpenReport={() => setReportOpen(true)}
                onReset={resetAssessment}
              />
            ) : null}
          </section>
        </div>
      ) : (
        <Landing onStart={() => setScreen("scope")} />
      )}

      <footer className="border-t border-slateLine bg-white/80 px-4 py-4 text-center text-xs text-slate-600">
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
    <header className="sticky top-0 z-30 border-b border-slateLine bg-white/92 backdrop-blur no-print">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-3 text-left"
          aria-label={`Return to ${PRODUCT_CONFIG.name} landing page`}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ink text-white">
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-5">{PRODUCT_CONFIG.name}</span>
            <span className="block text-xs text-slate-500">
              {PRODUCT_CONFIG.tagline}
            </span>
          </span>
        </button>

        <div className="hidden items-center gap-2 rounded-full border border-slateLine bg-slate-50 p-1 text-xs text-slate-600 md:flex">
          {["Scope", "Documents", "Agent", "Results"].map((item) => (
            <span
              key={item}
              className={`rounded-full px-3 py-1.5 ${
                isActiveNav(item, screen) ? "bg-white font-semibold text-ink shadow-sm" : ""
              }`}
            >
              {item}
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={onStart}
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Play className="h-4 w-4" aria-hidden="true" />
          Start review
        </button>
      </div>
    </header>
  );
}

function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[0.88fr_1.12fr] lg:px-8">
      <div>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-slateLine bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm">
          <ShieldCheck className="h-4 w-4 text-regBlue" aria-hidden="true" />
          Built for European payment fintechs
        </div>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-ink sm:text-5xl lg:text-6xl">
          PSD3/PSR readiness evidence in one workspace.
        </h1>
        <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
          {PRODUCT_CONFIG.name} maps payment flows, fraud policies, SCA evidence,
          open banking APIs and customer support procedures against source-backed
          PSD3/PSR controls.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Start assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
          <a
            href="#how-it-works"
            className="inline-flex items-center justify-center rounded-lg border border-slateLine bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
          >
            See workflow
          </a>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-3">
          <ProofPoint label="Matrix" value={`${PSD3_PSR_REQUIREMENTS.length} controls`} />
          <ProofPoint label="AI mode" value="OpenAI visible" />
          <ProofPoint label="Output" value="Report + CSV" />
        </div>
      </div>

      <div className="rounded-xl border border-slateLine bg-white p-4 shadow-soft">
        <div className="flex items-center justify-between border-b border-slateLine pb-4">
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">Coverage model</p>
            <h2 className="mt-1 text-xl font-semibold">Readiness command center</h2>
          </div>
          <StatusBadge status="Partially covered" />
        </div>
        <div className="grid gap-4 py-5 sm:grid-cols-4">
          <MetricCard label="Controls" value={PSD3_PSR_REQUIREMENTS.length} tone="blue" />
          <MetricCard label="Sources" value={REGULATORY_SOURCE_SUMMARY.length} tone="green" />
          <MetricCard label="PDF" value="Enabled" tone="amber" />
          <MetricCard label="Storage" value="Supabase" tone="gray" />
        </div>
        <div className="overflow-hidden rounded-lg border border-slateLine">
          {[
            ["Payee Verification", "Critical"],
            ["APP Fraud Liability", "Critical"],
            ["Open Banking Dashboard", "High"],
            ["SCA Accessibility", "High"]
          ].map(([domain, priority]) => (
            <div
              key={domain}
              className="grid grid-cols-[1.1fr_0.8fr_0.5fr] gap-3 border-b border-slateLine bg-white px-4 py-3 text-sm last:border-b-0"
            >
              <span className="font-medium">{domain}</span>
              <span className="text-xs font-semibold text-slate-500">Control</span>
              <PriorityBadge priority={priority as Priority} />
            </div>
          ))}
        </div>
      </div>

      <div id="how-it-works" className="lg:col-span-2">
        <div className="grid gap-4 md:grid-cols-3">
          <FeatureCard
            icon={<FileText className="h-5 w-5" aria-hidden="true" />}
            title="Analyze documents"
            text="Upload PDF, text and Markdown evidence required by the selected services."
          />
          <FeatureCard
            icon={<Search className="h-5 w-5" aria-hidden="true" />}
            title="Extract evidence"
            text="Map evidence to source-backed PSD3/PSR controls with confidence."
          />
          <FeatureCard
            icon={<ClipboardList className="h-5 w-5" aria-hidden="true" />}
            title="Create backlog"
            text="Generate product, compliance and engineering tasks for the top gaps."
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
  const canContinue = profile.companyName.trim().length > 0 && profile.services.length > 0;

  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-slateLine pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 1</p>
          <h1 className="mt-1 text-3xl font-semibold">Tell us about your payment fintech</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Select the regulated entity type and every payment service that should drive the
            compliance scope and required evidence pack.
          </p>
        </div>
        <Building2 className="h-8 w-8 text-slate-400" aria-hidden="true" />
      </div>

      {error ? (
        <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="grid gap-5 py-6 md:grid-cols-2">
        <label className="block">
          <span className="text-sm font-semibold">Company name</span>
          <input
            value={profile.companyName}
            onChange={(event) =>
              onChange({ ...profile, companyName: event.target.value })
            }
            className="mt-2 w-full rounded-lg border border-slateLine bg-white px-3 py-3 text-sm"
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
            className="mt-2 w-full rounded-lg border border-slateLine bg-white px-3 py-3 text-sm"
          >
            {COMPANY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Country</span>
          <select
            value={profile.country}
            onChange={(event) =>
              onChange({
                ...profile,
                country: event.target.value as CompanyProfile["country"]
              })
            }
            className="mt-2 w-full rounded-lg border border-slateLine bg-white px-3 py-3 text-sm"
          >
            {COUNTRIES.map((country) => (
              <option key={country}>{country}</option>
            ))}
          </select>
        </label>

        <div className="rounded-lg border border-slateLine bg-slate-50 p-4">
          <p className="text-sm font-semibold">Positioning guardrail</p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Output is a readiness assessment and backlog, not legal certification.
          </p>
        </div>
      </div>

      <div>
        <p className="text-sm font-semibold">Services / flows</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => {
            const selected = profile.services.includes(service);
            return (
              <button
                key={service}
                type="button"
                onClick={() => onToggleService(service)}
                className={`flex min-h-14 items-center justify-between rounded-lg border px-3 py-3 text-left text-sm transition ${
                  selected
                    ? "border-regBlue bg-blue-50 text-regBlue"
                    : "border-slateLine bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span>{service}</span>
                {selected ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
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
          className="inline-flex items-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue to documents
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

function DocumentsStep({
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
  return (
    <Panel>
      <div className="flex flex-col gap-3 border-b border-slateLine pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 2</p>
          <h1 className="mt-1 text-3xl font-semibold">Upload the required evidence documents</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            The required document list is generated from the services selected in scope.
            Analysis is blocked until every required evidence pack is represented.
          </p>
        </div>
        <FileText className="h-8 w-8 text-slate-400" aria-hidden="true" />
      </div>

      <div className="grid gap-4 py-6 lg:grid-cols-[0.9fr_1.1fr]">
        <label className="rounded-lg border border-dashed border-slate-300 bg-white p-5 transition hover:border-regBlue">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-slate-700">
              <Upload className="h-5 w-5" aria-hidden="true" />
            </span>
            <div>
              <p className="font-semibold">Upload PDF, .txt or .md</p>
              <p className="mt-1 text-sm text-slate-600">
                {isExtractingDocuments ? "Extracting documents..." : "PDF text is extracted before upload"}
              </p>
            </div>
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

        <div className="rounded-lg border border-slateLine bg-slate-50 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-semibold">Required evidence for selected services</p>
              <p className="mt-1 text-sm text-slate-600">
                {documentCheck.required.length} pack(s), {documentCheck.missing.length} missing.
              </p>
            </div>
            <ClipboardList className="h-5 w-5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-4 max-h-80 space-y-3 overflow-y-auto pr-1">
            {documentCheck.required.map((requirement) => (
              <div
                key={requirement.id}
                className={`rounded-lg border bg-white p-3 ${
                  requirement.satisfiedBy.length
                    ? "border-green-200"
                    : "border-amber-200"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{requirement.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">
                      {requirement.description}
                    </p>
                  </div>
                  {requirement.satisfiedBy.length ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-regGreen" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-regAmber" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500">
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

      <div className="rounded-lg border border-slateLine bg-white">
        <div className="flex items-center justify-between border-b border-slateLine px-4 py-3">
          <p className="font-semibold">Documents ready for analysis</p>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
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
                    <p className="mt-1 text-xs text-slate-500">
                      {document.content.length.toLocaleString()} characters extracted
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveDocument(document.name)}
                  className="inline-flex items-center gap-1 self-start rounded-lg border border-slateLine px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-slate-300"
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No documents loaded yet.
          </div>
        )}
      </div>

      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slateLine bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
        >
          Back
        </button>
        <button
          type="button"
          onClick={onRun}
          disabled={isExtractingDocuments}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Run PSD3/PSR readiness assessment
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </Panel>
  );
}

function ProcessingStep({
  currentIndex,
  isAnalyzing,
  documentCount
}: {
  currentIndex: number;
  isAnalyzing: boolean;
  documentCount: number;
}) {
  return (
    <Panel>
      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-semibold text-regBlue">Step 3</p>
          <h1 className="mt-1 text-3xl font-semibold">Agent is building your readiness matrix</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            The workflow reads {documentCount} document(s), maps evidence against
            source-backed PSD3/PSR controls and prepares a board-ready backlog.
          </p>
          <div className="mt-6 rounded-lg border border-slateLine bg-slate-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Live insights
            </p>
            <div className="mt-3 grid gap-3">
              {INSIGHTS.map((insight, index) => (
                <div
                  key={insight}
                  className={`rounded-lg border bg-white p-3 text-sm shadow-sm transition ${
                    index <= currentIndex
                      ? "border-amber-200 text-slate-800"
                      : "border-slateLine text-slate-400"
                  }`}
                >
                  <AlertTriangle
                    className={`mr-2 inline h-4 w-4 ${
                      index <= currentIndex ? "text-regAmber" : "text-slate-300"
                    }`}
                    aria-hidden="true"
                  />
                  {insight}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <p className="font-semibold">Agent timeline</p>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-regBlue">
              {isAnalyzing ? "Running" : "Finalizing"}
            </span>
          </div>
          <div className="space-y-4">
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
                          : "border-slateLine bg-slate-50 text-slate-400"
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
                    <p className="mt-1 text-xs text-slate-500">
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
  onOpenReport,
  onReset
}: {
  result: AnalysisResult;
  documents: UploadedDocument[];
  profile: CompanyProfile;
  onSelectItem: (item: EvidenceMatrixItem) => void;
  onDownloadCsv: () => void;
  onOpenReport: () => void;
  onReset: () => void;
}) {
  return (
    <div className="space-y-5">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-regBlue">Step 4</p>
            <h1 className="mt-1 text-3xl font-semibold">PSD3/PSR readiness dashboard</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Evidence matrix and remediation backlog for {profile.companyName}. This is a
              readiness assessment, not legal advice.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onOpenReport}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slateLine bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Export PDF
            </button>
            <button
              type="button"
              onClick={onDownloadCsv}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slateLine bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
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
            <p className="mt-1 text-sm text-slate-600">
              {documents.length} document(s) analyzed against the current source-backed requirement base.
            </p>
          </div>
        </div>
        <MatrixMobileCards matrix={result.matrix} onSelectItem={onSelectItem} />
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
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
                <tr key={item.requirementId} className="align-top">
                  <td className="border-b border-slateLine px-3 py-4 font-semibold text-slate-800">
                    {item.domain}
                  </td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4">
                    <p className="font-medium">{item.requirementTitle}</p>
                    <p className="mt-1 text-xs text-slate-500">{item.requirementId}</p>
                  </td>
                  <td className="max-w-[220px] border-b border-slateLine px-3 py-4 text-xs leading-5 text-slate-500">
                    <span className="line-clamp-3">
                      {item.regulatoryReference ?? "Source reference not supplied"}
                    </span>
                  </td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="max-w-[250px] border-b border-slateLine px-3 py-4 text-slate-600">
                    <span className="line-clamp-3">{item.evidenceFound}</span>
                  </td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4 text-slate-600">
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
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slateLine bg-white text-slate-700 transition hover:border-regBlue hover:text-regBlue"
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
            <p className="mt-1 text-sm text-slate-600">
              Prioritized product, compliance and engineering tasks from the evidence gaps.
            </p>
          </div>
          <ClipboardList className="hidden h-6 w-6 text-slate-400 sm:block" aria-hidden="true" />
        </div>
        <RoadmapMobileCards roadmap={result.roadmap} />
        <div className="mt-4 hidden overflow-x-auto md:block">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-[0.08em] text-slate-500">
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
                <tr key={`${task.title}-${task.linkedRequirementIds.join("-")}`} className="align-top">
                  <td className="max-w-[260px] border-b border-slateLine px-3 py-4 font-semibold">
                    {task.title}
                    <p className="mt-1 text-xs font-normal text-slate-500">
                      {task.linkedRequirementIds.join(", ")}
                    </p>
                  </td>
                  <td className="border-b border-slateLine px-3 py-4 text-slate-600">{task.owner}</td>
                  <td className="border-b border-slateLine px-3 py-4">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="border-b border-slateLine px-3 py-4 font-semibold">{task.deadline}</td>
                  <td className="max-w-[240px] border-b border-slateLine px-3 py-4 text-slate-600">
                    {task.evidenceRequired.join("; ")}
                  </td>
                  <td className="max-w-[300px] border-b border-slateLine px-3 py-4 text-slate-600">
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
      ? "border-green-200 bg-green-50 text-green-900"
      : diagnostics.persistence.status === "failed"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className="mt-5 grid gap-3 lg:grid-cols-[1fr_1fr]">
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
        <div className="flex items-center gap-2 font-semibold">
          <BrainCircuit className="h-4 w-4" aria-hidden="true" />
          {engineLabel}
        </div>
        <p className="mt-2 leading-6">
          Reasoning effort: {diagnostics.reasoningEffort ?? "not applicable"}.
          Generated {new Date(diagnostics.generatedAt).toLocaleString()}.
        </p>
        {diagnostics.warnings.length ? (
          <p className="mt-2 leading-6">{diagnostics.warnings.join(" ")}</p>
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/30 no-print">
      <button
        type="button"
        aria-label="Close evidence panel"
        className="hidden flex-1 sm:block"
        onClick={onClose}
      />
      <aside className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slateLine pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Evidence review
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{item.requirementTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slateLine p-2 text-slate-600 transition hover:border-slate-300"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-4 py-5">
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
        <article key={item.requirementId} className="rounded-lg border border-slateLine p-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={item.status} />
            <PriorityBadge priority={item.priority} />
            <span className="text-xs font-semibold text-slate-500">{item.requirementId}</span>
          </div>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {item.domain}
          </p>
          <h3 className="mt-1 text-lg font-semibold leading-6">{item.requirementTitle}</h3>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            {item.regulatoryReference ?? "Source reference not supplied"}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">{item.evidenceFound}</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
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
              className="inline-flex items-center gap-2 rounded-lg border border-slateLine bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-regBlue hover:text-regBlue"
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
        <article key={task.title} className="rounded-lg border border-slateLine p-4">
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={task.priority} />
            <span className="rounded-full bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {task.deadline}
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold leading-6">{task.title}</h3>
          <p className="mt-1 text-sm font-semibold text-slate-500">{task.owner}</p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold">Evidence: </span>
            {task.evidenceRequired.join("; ")}
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            <span className="font-semibold">Acceptance: </span>
            {task.acceptanceCriteria}
          </p>
          <p className="mt-3 text-xs font-semibold text-slate-500">
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
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 p-4 print-shell">
      <div className="mx-auto max-w-5xl rounded-xl border border-slateLine bg-white p-6 shadow-2xl print-card">
        <div className="no-print mb-5 flex flex-col gap-3 border-b border-slateLine pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-regBlue">Export PDF</p>
            <h2 className="text-2xl font-semibold">Board-ready report preview</h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-semibold text-white"
            >
              <FileDown className="h-4 w-4" aria-hidden="true" />
              Print / save as PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slateLine px-4 py-2.5 text-sm font-semibold text-slate-700"
            >
              Close
            </button>
          </div>
        </div>

        <article className="space-y-6 text-sm">
          <section className="print-break">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              {PRODUCT_CONFIG.name}
            </p>
            <h1 className="mt-2 text-3xl font-semibold">PSD3/PSR readiness report</h1>
            <p className="mt-2 text-slate-600">
              {profile.companyName} - {profile.companyType} - {profile.country}
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
              <DetailRow label="Services" value={profile.services.join(", ")} />
              <DetailRow label="Documents analyzed" value={documents.map((doc) => doc.name).join(", ")} />
            </div>
          </section>

          <section className="print-break">
            <h2 className="text-xl font-semibold">Top gaps</h2>
            <div className="mt-3 space-y-3">
              {topGaps.map((gap) => (
                <div key={gap.requirementId} className="rounded-lg border border-slateLine p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={gap.status} />
                    <PriorityBadge priority={gap.priority} />
                    <span className="text-xs font-semibold text-slate-500">{gap.requirementId}</span>
                  </div>
                  <p className="mt-2 font-semibold">{gap.requirementTitle}</p>
                  <p className="mt-1 text-slate-600">{gap.missingEvidence.join("; ")}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold">Readiness matrix</h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[780px] border-separate border-spacing-0 text-left text-xs">
                <thead>
                  <tr className="text-slate-500">
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
            <div className="mt-3 space-y-3">
              {result.roadmap.map((task) => (
                <div key={task.title} className="rounded-lg border border-slateLine p-4 print-break">
                  <div className="flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={task.priority} />
                    <span className="text-xs font-semibold text-slate-500">{task.deadline}</span>
                  </div>
                  <p className="mt-2 font-semibold">{task.title}</p>
                  <p className="mt-1 text-slate-600">
                    Owner: {task.owner}. Evidence: {task.evidenceRequired.join("; ")}.
                  </p>
                  <p className="mt-1 text-slate-600">
                    Acceptance criteria: {task.acceptanceCriteria}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {result.diagnostics?.regulatorySources.length ? (
            <section className="print-break">
              <h2 className="text-xl font-semibold">Regulatory sources</h2>
              <div className="mt-3 space-y-2">
                {result.diagnostics.regulatorySources.map((source) => (
                  <p key={source.url} className="text-slate-600">
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

function WorkflowRail({ screen }: { screen: Screen }) {
  const steps = [
    ["scope", "Company scope"],
    ["documents", "Documents"],
    ["processing", "Agent processing"],
    ["results", "Results dashboard"]
  ] as const;

  return (
    <div className="sticky top-20 rounded-xl border border-slateLine bg-white p-4 shadow-sm">
      <p className="mb-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        Workflow
      </p>
      <div className="space-y-2">
        {steps.map(([key, label], index) => {
          const active = key === screen;
          return (
            <div
              key={key}
              className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm ${
                active ? "bg-blue-50 font-semibold text-regBlue" : "text-slate-600"
              }`}
            >
              <span
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                  active ? "bg-regBlue text-white" : "bg-slate-100 text-slate-500"
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

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm sm:p-6">
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
    blue: "border-blue-100 bg-blue-50 text-regBlue",
    green: "border-green-100 bg-green-50 text-regGreen",
    amber: "border-amber-100 bg-amber-50 text-regAmber",
    red: "border-red-100 bg-red-50 text-regRed",
    gray: "border-slate-200 bg-slate-50 text-slate-600"
  };

  return (
    <div className={`rounded-lg border p-4 ${toneClasses[tone]}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.12em] opacity-80">{label}</p>
      <p className="mt-2 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}

function ProofPoint({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slateLine bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
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
    <div className="rounded-xl border border-slateLine bg-white p-5 shadow-sm">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 text-regBlue">
        {icon}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: RequirementStatus }) {
  const classes = {
    Covered: "bg-green-50 text-regGreen border-green-200",
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
    Low: "bg-slate-50 text-slate-600 border-slate-200",
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
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </p>
      <div className="mt-1 text-sm leading-6 text-slate-800">{value}</div>
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

function escapeCsv(value: string | number) {
  const text = String(value);
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }

  return text;
}
