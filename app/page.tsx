import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Database,
  FileCheck2,
  GitCompareArrows,
  Map,
  ShieldCheck,
  Sparkles,
  XCircle
} from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { HowItWorksScroller } from "@/components/complee/HowItWorksScroller";
import { RegulatoryRibbon } from "@/components/complee/RegulatoryRibbon";
import { REGULATORY_SOURCE_SUMMARY } from "@/lib/app-config";
import { PSD3_PSR_REQUIREMENTS } from "@/data/psd3-psr-requirements";

const USE_CASES = [
  {
    tag: "Market entry",
    title: "France to UK expansion readiness",
    body: "Assess what an ACPR-authorised EMI needs to operate under FCA expectations."
  },
  {
    tag: "Licensing",
    title: "Payment licensing requirement checks",
    body: "Map PSD2, PSD3 and PSR obligations and authorisation prerequisites by market."
  },
  {
    tag: "Resilience",
    title: "Operational resilience gap review",
    body: "Compare existing DORA controls against target-market evidence expectations."
  }
];

const DEMO_ROWS = [
  {
    requirement: "CASS 15 daily safeguarding reconciliation",
    regulator: "FCA",
    status: "Missing",
    tone: "danger"
  },
  {
    requirement: "Strong customer authentication evidence",
    regulator: "PSD3 / PSR",
    status: "Partial",
    tone: "warn"
  },
  {
    requirement: "Open banking consent dashboard",
    regulator: "PSD3 / PSR",
    status: "Covered",
    tone: "success"
  }
];

export default function LandingPage() {
  return (
    <Chrome>
      <section
        aria-labelledby="hero-heading"
        className="relative overflow-hidden bg-navy text-navy-foreground"
        style={{ minHeight: "calc(100vh - 60px)" }}
      >
        <div className="complee-grid-bg absolute inset-0 opacity-[0.12]" aria-hidden="true" />
        <div className="relative mx-auto flex min-h-[calc(100vh-60px)] max-w-[1440px] flex-col px-4 sm:px-6 lg:px-8 2xl:max-w-[1680px]">
          <div className="grid flex-1 grid-cols-1 items-center gap-10 py-12 lg:grid-cols-12 lg:gap-12 lg:py-16">
            <div className="lg:col-span-7">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3 py-1.5 text-[12px] font-medium text-navy-foreground/85">
                <span className="h-2 w-2 rounded-full bg-success" aria-hidden="true" />
                Live regulatory data and evidence-gated analysis
              </p>
              <h1 id="hero-heading" className="fluid-h1 max-w-[820px] font-semibold">
                Expand into regulated markets with{" "}
                <span className="text-brand-foreground">
                  confidence
                </span>
                .
              </h1>
              <p className="fluid-lead mt-7 max-w-[650px] text-navy-foreground/75">
                Assess regulatory readiness across GDPR, PSD2/PSD3 and DORA before
                expansion risk becomes expensive.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link
                  href="/profile"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-lg bg-brand px-6 py-3 text-[15px] font-medium text-brand-foreground shadow-sm transition hover:bg-brand/90"
                >
                  Assess Expansion Readiness
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex min-h-[48px] items-center gap-2 rounded-lg border border-navy-foreground/20 px-5 py-3 text-[14px] font-medium text-navy-foreground transition hover:bg-navy-foreground/10"
                >
                  How It Works
                </a>
              </div>
              <div className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-navy-foreground/15 bg-navy-foreground/5 px-3.5 py-2 text-[12px] text-navy-foreground/85 sm:text-[13px]">
                <span className="relative flex h-2 w-2" aria-hidden="true">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-70" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                Tracking {PSD3_PSR_REQUIREMENTS.length} controls and {REGULATORY_SOURCE_SUMMARY.length} source groups
              </div>
            </div>

            <div className="hidden lg:col-span-5 lg:block">
              <HeroProductVisual />
            </div>
          </div>

          <div className="relative pb-6 sm:pb-8">
            <RegulatoryRibbon />
          </div>
        </div>
      </section>

      <section
        id="why-complee"
        aria-labelledby="value-heading"
        className="flex min-h-screen items-center border-t border-border bg-surface-muted/40 scroll-mt-20"
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 2xl:max-w-[1280px]">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Why Complee
            </p>
            <h2 id="value-heading" className="fluid-h2 mt-2 font-semibold text-navy">
              Know what blocks expansion before regulators do
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-4 text-left sm:grid-cols-3">
            <ValueCard
              icon={<Database className="h-4 w-4" aria-hidden="true" />}
              title="Real Regulatory Data"
              body="Requirements sourced from FCA, ACPR, BaFin and other regulators, then reinforced by the existing PSD3/PSR data layer."
            />
            <ValueCard
              icon={<GitCompareArrows className="h-4 w-4" aria-hidden="true" />}
              title="Cross-Border Gap Analysis"
              body="Identify which controls are ready, partial or missing for a target-market launch."
            />
            <ValueCard
              icon={<Map className="h-4 w-4" aria-hidden="true" />}
              title="Execution-Ready Roadmap"
              body="Receive a prioritized action plan, evidence trail and exportable submission pack."
            />
          </div>
        </div>
      </section>

      <section
        id="use-cases"
        aria-labelledby="usecases-heading"
        className="flex min-h-screen items-center border-t border-border bg-surface-muted/40"
      >
        <div className="mx-auto w-full max-w-[1080px] px-4 py-14 sm:px-6 sm:py-20 lg:px-8 2xl:max-w-[1280px]">
          <div className="mx-auto max-w-[720px] text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Use cases
            </p>
            <h2 id="usecases-heading" className="fluid-h2 mt-2 font-semibold text-navy">
              Built for FinTech expansion decisions
            </h2>
          </div>
          <div className="mt-10 grid grid-cols-1 gap-4 text-left md:grid-cols-3">
            {USE_CASES.map((useCase) => (
              <article
                key={useCase.title}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
                  <FileCheck2 className="h-4 w-4" aria-hidden="true" />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  {useCase.tag}
                </p>
                <h3 className="mt-2 text-[17px] font-semibold text-navy">{useCase.title}</h3>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                  {useCase.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <HowItWorksScroller />

      <section
        id="coverage"
        aria-labelledby="coverage-heading"
        className="border-t border-border bg-navy text-navy-foreground scroll-mt-20"
      >
        <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-brand-foreground">
              Impact
            </p>
            <h2 id="coverage-heading" className="fluid-h2 mt-2 font-semibold">
              Evidence, analysis and monitoring are connected now
            </h2>
            <p className="mt-4 max-w-[560px] text-[15px] leading-relaxed text-navy-foreground/75">
              The forked UI no longer stops at static demo scoring. Uploaded documents
              are extracted by the existing backend, scored by the analysis endpoint and
              can seed the Live Agent profile.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <ImpactCard label="Extraction" value="PDF, TXT, MD" />
            <ImpactCard label="Analysis" value="API backed" />
            <ImpactCard label="Agent" value="Profile seed" />
          </div>
        </div>
      </section>

      <section
        id="demo-results"
        aria-labelledby="demo-heading"
        className="border-t border-border bg-background scroll-mt-20"
      >
        <div className="mx-auto max-w-[1200px] px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Demo results
              </p>
              <h2 id="demo-heading" className="fluid-h2 mt-2 font-semibold text-navy">
                A readiness matrix built for action
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">
                The real results route renders the live API response. This preview shows
                the matrix density and decision language users see after processing.
              </p>
              <Link
                href="/profile"
                className="mt-7 inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy px-5 py-2.5 text-[14px] font-medium text-navy-foreground shadow-sm transition hover:bg-navy/90"
              >
                Start your expansion assessment
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>

            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="border-b border-border px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                      FlowPay UK expansion
                    </p>
                    <h3 className="mt-1 text-[18px] font-semibold text-navy">
                      Readiness matrix
                    </h3>
                  </div>
                  <div className="rounded-full bg-warn-soft px-3 py-1 text-[12px] font-semibold text-warn-foreground">
                    42% ready
                  </div>
                </div>
              </div>
              <div className="divide-y divide-border">
                {DEMO_ROWS.map((row) => (
                  <div
                    key={row.requirement}
                    className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_140px_120px] sm:items-center"
                  >
                    <div>
                      <p className="text-[14px] font-medium text-navy">
                        {row.requirement}
                      </p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {row.regulator}
                      </p>
                    </div>
                    <span className="text-[12px] text-muted-foreground">
                      Evidence gated
                    </span>
                    <DemoStatus status={row.status} tone={row.tone} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5 px-4 py-10 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <div>
            <h2 className="text-[22px] font-semibold text-navy">
              Start with the FlowPay sample pack or upload your own evidence.
            </h2>
            <p className="mt-2 text-[14px] text-muted-foreground">
              This is a readiness assessment, not legal advice.
            </p>
          </div>
          <Link
            href="/profile"
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-brand px-5 py-2.5 text-[14px] font-medium text-brand-foreground shadow-sm transition hover:bg-brand/90"
          >
            Start assessment
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </Chrome>
  );
}

function HeroProductVisual() {
  return (
    <div className="relative mx-auto aspect-square max-w-[540px]">
      <div className="absolute inset-6 rounded-full border border-navy-foreground/15" />
      <div className="absolute inset-16 rounded-full border border-navy-foreground/10" />
      <div className="absolute inset-0 rounded-full complee-grid-bg opacity-30" />
      <div className="absolute left-5 top-12 w-[270px] rounded-2xl border border-navy-foreground/10 bg-navy-foreground/[0.08] p-4 shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-navy-foreground">
            Expansion scope
          </span>
          <Sparkles className="h-4 w-4 text-brand-foreground" aria-hidden="true" />
        </div>
        {["France home licence", "United Kingdom target", "E-money + payments"].map(
          (item) => (
            <div key={item} className="mb-2 flex items-center gap-2 text-[12px] text-navy-foreground/78">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
              {item}
            </div>
          )
        )}
      </div>
      <div className="absolute bottom-16 right-0 w-[320px] rounded-2xl border border-navy-foreground/10 bg-navy-foreground/[0.08] p-4 shadow-2xl backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-[12px] font-semibold text-navy-foreground">
            Evidence matrix
          </span>
          <BarChart3 className="h-4 w-4 text-brand-foreground" aria-hidden="true" />
        </div>
        {[
          ["Covered", "62%", CheckCircle2, "text-success"],
          ["Partial", "24%", ShieldCheck, "text-warn"],
          ["Missing", "14%", XCircle, "text-danger"]
        ].map(([label, value, Icon, color]) => (
          <div key={label as string} className="mb-3">
            <div className="mb-1 flex items-center justify-between text-[12px] text-navy-foreground/78">
              <span className="flex items-center gap-2">
                <Icon className={`h-3.5 w-3.5 ${color}`} aria-hidden="true" />
                {label as string}
              </span>
              <span>{value as string}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-navy-foreground/10">
              <div
                className="h-full rounded-full bg-brand"
                style={{ width: value as string }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ValueCard({
  icon,
  title,
  body
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-lg bg-brand-soft text-brand">
        {icon}
      </div>
      <h3 className="text-[16px] font-semibold text-navy">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">{body}</p>
    </article>
  );
}

function ImpactCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-navy-foreground/10 bg-navy-foreground/[0.06] p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-navy-foreground/55">
        {label}
      </p>
      <p className="mt-2 text-[24px] font-semibold text-navy-foreground">{value}</p>
    </div>
  );
}

function DemoStatus({ status, tone }: { status: string; tone: string }) {
  const classes =
    tone === "success"
      ? "border-success/25 bg-success-soft text-success-foreground"
      : tone === "warn"
        ? "border-warn/25 bg-warn-soft text-warn-foreground"
        : "border-danger/25 bg-danger-soft text-danger";

  return (
    <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[12px] font-semibold ${classes}`}>
      {status}
    </span>
  );
}
