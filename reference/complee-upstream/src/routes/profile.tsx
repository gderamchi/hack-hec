import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Info } from "lucide-react";
import { toast } from "sonner";
import { Chrome } from "@/components/complee/Chrome";
import { useAssessment } from "@/store/assessment";
import {
  REGULATORS,
  getRegulatorByCountry,
  type CountryCode,
  type InstitutionType,
} from "@/data/requirements";

export const Route = createFileRoute("/profile")({
  head: () => ({ meta: [{ title: "Company profile — Complee" }] }),
  component: Profile,
});

const SERVICE_OPTIONS = [
  "E-money issuance",
  "Payment accounts",
  "Card issuing",
  "Payment initiation",
  "Account information",
  "Cross-border transfers",
  "Merchant acquiring",
  "Safeguarded customer funds",
];

const INSTITUTION_TYPES: { value: InstitutionType; label: string }[] = [
  { value: "EMI", label: "E-Money Institution (EMI)" },
  { value: "Small EMI", label: "Small EMI" },
  { value: "PI", label: "Payment Institution (PI)" },
  { value: "AISP", label: "Account Information Service Provider (AISP)" },
];

function Profile() {
  const navigate = useNavigate();
  const {
    profile,
    selectedServices,
    setCompanyName,
    setHomeCountry,
    setTargetCountry,
    setInstitutionType,
    toggleService,
  } = useAssessment();
  const home = getRegulatorByCountry(profile.homeCountry);
  const target = getRegulatorByCountry(profile.targetCountry);
  const sameCountry = profile.homeCountry === profile.targetCountry;

  const handleContinue = () => {
    if (sameCountry) return;
    if (selectedServices.length === 0) {
      toast.error("Select at least one service to assess.");
      return;
    }
    navigate({ to: "/documents" });
  };

  return (
    <Chrome>
      <div className="max-w-[1080px] mx-auto px-5 sm:px-6 py-8 sm:py-12">
        <div className="mb-8 sm:mb-10">
          <p className="text-[12px] uppercase tracking-[0.14em] text-brand font-medium mb-2">
            Step 2 — Profile
          </p>
          <h1 className="text-[24px] sm:text-[32px] font-semibold tracking-tight text-navy">
            Tell Complee about your company
          </h1>
          <p className="mt-2 text-[14px] sm:text-[15px] text-muted-foreground">
            Pre-filled with the FlowPay demo. Adjust anything.
          </p>
        </div>

        <div className="rounded-2xl border border-border bg-card shadow-sm p-5 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6">
            <Field label="Company name">
              <input
                type="text"
                value={profile.companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              />
            </Field>

            <Field label="Institution type">
              <select
                value={profile.institutionType}
                onChange={(e) => setInstitutionType(e.target.value as InstitutionType)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              >
                {INSTITUTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Home country">
              <select
                value={profile.homeCountry}
                onChange={(e) => setHomeCountry(e.target.value as CountryCode)}
                className="w-full h-11 rounded-lg border border-input bg-background px-3.5 text-[14px] outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 transition"
              >
                {REGULATORS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.country} — {r.authority}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Target country">
              <select
                value={profile.targetCountry}
                onChange={(e) => setTargetCountry(e.target.value as CountryCode)}
                className={`w-full h-11 rounded-lg border bg-background px-3.5 text-[14px] outline-none focus:ring-2 transition ${
                  sameCountry
                    ? "border-danger focus:border-danger focus:ring-danger/20"
                    : "border-input focus:border-brand focus:ring-brand/20"
                }`}
              >
                {REGULATORS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.flag} {r.country} — {r.authority}
                  </option>
                ))}
              </select>
              {sameCountry && (
                <p className="mt-2 text-[12px] text-danger">
                  Choose a different target country to run an expansion assessment.
                </p>
              )}
            </Field>

            <div className="md:col-span-2">
              <Field label="Services offered">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SERVICE_OPTIONS.map((opt) => {
                    const active = selectedServices.includes(opt);
                    return (
                      <label
                        key={opt}
                        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-all text-[13px] ${
                          active
                            ? "bg-brand-soft/50 border-brand text-navy"
                            : "bg-card border-border text-foreground hover:border-brand/50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={active}
                          onChange={() => toggleService(opt)}
                          className="h-4 w-4 rounded border-border accent-brand"
                        />
                        {opt}
                      </label>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>
        </div>

        {home && target && !sameCountry && (
          <div className="mt-6 rounded-xl border border-brand/20 bg-brand-soft/40 p-4 sm:p-5 flex gap-3">
            <Info className="h-5 w-5 text-brand mt-0.5 shrink-0" />
            <p className="text-[13px] sm:text-[14px] leading-relaxed text-navy">
              <span className="font-medium">Did you know?</span> Expanding from{" "}
              <span className="font-medium">
                {home.flag} {home.country}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {target.flag} {target.country}
              </span>{" "}
              typically takes 12–18 months and €200–500k in advisory fees. Complee compresses
              the assessment into 5 minutes.
            </p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 flex-wrap">
          <Link
            to="/"
            className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back
          </Link>
          <button
            onClick={handleContinue}
            disabled={sameCountry}
            className="inline-flex items-center gap-2 rounded-lg bg-navy text-navy-foreground px-5 py-3 text-[14px] font-medium hover:bg-navy/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue to documents
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Chrome>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-navy mb-1.5 uppercase tracking-[0.06em]">
        {label}
      </span>
      {children}
    </label>
  );
}
