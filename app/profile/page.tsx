"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Building2, Check, Info, Scale, Sparkles } from "lucide-react";
import { Chrome } from "@/components/complee/Chrome";
import { StepShell } from "@/components/complee/StepShell";
import { useAssessment } from "@/components/complee/assessment-context";
import {
  COUNTRY_OPTIONS,
  INSTITUTION_OPTIONS,
  REGULATION_GROUPS,
  SERVICE_GROUPS,
  activeRegulationsForFrontend,
  countryAuthority,
  type CompleeCountryCode
} from "@/lib/complee-frontend";
import type { InstitutionType } from "@/lib/types";

const SERVICE_TO_REG_HINTS: Record<string, string[]> = {
  "Payment initiation": ["PSD3 / PSR", "SCA / RTS"],
  "Account information": ["PSD2", "PSD3 / PSR"],
  "Cross-border transfers": ["PSD3 / PSR", "DORA"],
  "Card issuing": ["SCA / RTS", "PSD2"],
  "E-money issuance": ["EMD2", "PSD2"],
  "Safeguarded customer funds": ["EMD2"],
  "Merchant acquiring": ["PSD2", "SCA / RTS"],
  "Payment accounts": ["PSD2", "GDPR"],
  "Fraud monitoring": ["PSD3 / PSR", "DORA"]
};

export default function ProfilePage() {
  const router = useRouter();
  const {
    profile,
    selectedServices,
    selectedRegulations,
    setCompanyName,
    setHomeCountry,
    setTargetCountry,
    setInstitutionType,
    toggleService,
    toggleRegulation,
    analysisError,
    setAnalysisError
  } = useAssessment();
  const sameCountry = profile.homeCountry === profile.targetCountry;
  const suggestedRegulations = Array.from(
    new Set(
      selectedServices.flatMap((service) =>
        (SERVICE_TO_REG_HINTS[service] ?? []).filter(
          (regulation) => !selectedRegulations.includes(regulation)
        )
      )
    )
  );
  const canContinue =
    !sameCountry &&
    selectedServices.length > 0 &&
    selectedRegulations.length > 0 &&
    profile.companyName.trim().length > 0;
  const activeRegulations = activeRegulationsForFrontend(
    profile,
    selectedServices,
    selectedRegulations
  );

  function handleContinue() {
    if (!profile.companyName.trim()) {
      setAnalysisError("Enter the company name before continuing.");
      return;
    }

    if (sameCountry) {
      setAnalysisError("Choose a different target country.");
      return;
    }

    if (selectedServices.length === 0) {
      setAnalysisError("Select at least one service to assess.");
      return;
    }

    if (selectedRegulations.length === 0) {
      setAnalysisError("Select at least one regulation to scope the assessment.");
      return;
    }

    setAnalysisError("");
    router.push("/documents");
  }

  return (
    <Chrome>
      <StepShell
        eyebrow="Step 1 of 4 - Company scope"
        title="Tell us about your company"
        description="We'll use this to scope the regulatory requirements that apply to your expansion. Pre-filled with the FlowPay demo - adjust any field to match your business."
      >
        <section>
          <SectionHeader
            icon={<Building2 className="h-4 w-4" aria-hidden="true" />}
            title="Company profile"
            description="The basics about your business and where you operate."
          />
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 md:grid-cols-2">
              <Field label="Company name">
                <input
                  type="text"
                  value={profile.companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="e.g. FlowPay"
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
              </Field>

              <Field label="Institution type">
                <select
                  value={profile.institutionType}
                  onChange={(event) =>
                    setInstitutionType(event.target.value as InstitutionType)
                  }
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {INSTITUTION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Home country" hint="Where you're licensed today.">
                <select
                  value={profile.homeCountry}
                  onChange={(event) =>
                    setHomeCountry(event.target.value as CompleeCountryCode)
                  }
                  className="h-11 w-full rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20"
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.country} - {country.authority}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Target country" hint="Where you want to expand.">
                <select
                  value={profile.targetCountry}
                  onChange={(event) =>
                    setTargetCountry(event.target.value as CompleeCountryCode)
                  }
                  className={`h-11 w-full rounded-lg border bg-background px-3.5 text-[14px] outline-none transition focus:ring-2 ${
                    sameCountry
                      ? "border-danger focus:border-danger focus:ring-danger/20"
                      : "border-input focus:border-brand focus:ring-brand/20"
                  }`}
                >
                  {COUNTRY_OPTIONS.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.country} - {country.authority}
                    </option>
                  ))}
                </select>
                {sameCountry ? (
                  <p className="mt-2 text-[12px] text-danger">
                    Choose a different target country to run an expansion assessment.
                  </p>
                ) : null}
              </Field>
            </div>
          </div>
        </section>

        <section>
          <SectionHeader
            icon={<Check className="h-4 w-4" aria-hidden="true" />}
            title="Services offered"
            description="Select everything you provide today - we'll map each to its regulatory obligations."
            badge={
              selectedServices.length > 0
                ? `${selectedServices.length} selected`
                : "None selected"
            }
            badgeActive={selectedServices.length > 0}
          />
          <div className="space-y-7 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {SERVICE_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-3">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-navy">
                    {group.title}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {group.options.map((option) => {
                    const active = selectedServices.includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => toggleService(option)}
                        className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                          active
                            ? "border-brand bg-brand-soft/70 text-navy shadow-sm"
                            : "border-border bg-card text-foreground hover:border-brand/50 hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            active
                              ? "border-brand bg-brand text-white"
                              : "border-border bg-background"
                          }`}
                        >
                          {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                        <span className="font-medium">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader
            icon={<Scale className="h-4 w-4" aria-hidden="true" />}
            title="Regulations in scope"
            description="Choose the frameworks you want assessed against. Your services and target country drive what's recommended."
            badge={
              selectedRegulations.length > 0
                ? `${selectedRegulations.length} selected`
                : "None selected"
            }
            badgeActive={selectedRegulations.length > 0}
          />
          <div className="space-y-7 rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {suggestedRegulations.length > 0 ? (
              <div className="rounded-xl border border-brand/20 bg-brand-soft/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-[13px] font-semibold text-navy">
                  <Sparkles className="h-4 w-4 text-brand" aria-hidden="true" />
                  Suggested from selected services
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedRegulations.map((regulation) => (
                    <button
                      key={regulation}
                      type="button"
                      onClick={() => toggleRegulation(regulation)}
                      className="rounded-full border border-brand/25 bg-card px-3 py-1.5 text-[12px] font-medium text-brand transition hover:bg-brand-soft"
                    >
                      Add {regulation}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {REGULATION_GROUPS.map((group) => (
              <div key={group.title}>
                <div className="mb-3">
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-navy">
                    {group.title}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                    {group.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {group.options.map((option) => {
                    const active = selectedRegulations.includes(option);
                    return (
                      <button
                        type="button"
                        key={option}
                        onClick={() => toggleRegulation(option)}
                        className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-all ${
                          active
                            ? "border-brand bg-brand-soft/70 text-navy shadow-sm"
                            : "border-border bg-card text-foreground hover:border-brand/50 hover:bg-muted"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                            active
                              ? "border-brand bg-brand text-white"
                              : "border-border bg-background"
                          }`}
                        >
                          {active ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : null}
                        </span>
                        <span className="font-medium">{option}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface-muted p-5">
          <div className="flex items-start gap-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" aria-hidden="true" />
            <div>
              <h2 className="text-[14px] font-semibold text-navy">Backend mapping preview</h2>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {profile.companyName || "This company"} will be assessed as a{" "}
                {profile.institutionType} expanding from {countryAuthority(profile.homeCountry)} to{" "}
                {countryAuthority(profile.targetCountry)}. The Live Agent will monitor{" "}
                {activeRegulations.join(", ")}.
              </p>
            </div>
          </div>
        </section>

        {analysisError ? (
          <div className="rounded-xl border border-danger/25 bg-danger-soft p-4 text-[13px] font-medium text-danger">
            {analysisError}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/"
            className="rounded px-1 py-1 text-[13px] text-muted-foreground transition hover:text-foreground"
          >
            Back
          </Link>
          <button
            type="button"
            onClick={handleContinue}
            disabled={!canContinue}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-navy px-5 py-3 text-[14px] font-medium text-navy-foreground shadow-sm transition hover:bg-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue to evidence
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </StepShell>
    </Chrome>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-navy">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[12px] text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function SectionHeader({
  icon,
  title,
  description,
  badge,
  badgeActive = false
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  badgeActive?: boolean;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-brand-soft text-brand">
          {icon}
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-navy">{title}</h2>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
      {badge ? (
        <span
          className={`hidden rounded-full px-3 py-1 text-[12px] font-medium sm:inline-flex ${
            badgeActive
              ? "bg-brand-soft text-brand"
              : "bg-surface-muted text-muted-foreground"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </div>
  );
}
