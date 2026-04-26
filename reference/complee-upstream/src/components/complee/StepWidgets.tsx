// Complee — Specialised in-app input widgets.
// These render rich, structured UIs (calculators, tables, radio cards) for
// step inputs that would otherwise force the user out of the app to do
// math or research. The captured value is JSON-serialised and stored as a
// string in the existing stepProgress.formInputs map.

import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Plus,
  Quote,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { lookupCapitalThreshold } from "@/lib/capitalThresholds";

// ---------- Capital Calculator ----------

type CapitalMethod = "Method A" | "Method B" | "Method C" | "Fixed (EMI)";

interface CapitalCalcValue {
  institutionType: "EMI" | "Small EMI" | "PI" | "AISP" | "PISP";
  method: CapitalMethod;
  currency: "EUR" | "GBP" | "USD";
  qualifying: number;
  // Inputs depending on method
  fixedOverhead: number; // Method A: 10% of preceding year's fixed overheads
  paymentVolume: number; // Method B: previous year's payment volume / 12
  totalIncome: number; // Method C: net income
  emoneyOutstanding: number; // EMI: average outstanding e-money
  // Computed
  threshold: number;
  headroom: number;
  /** Whether the user has manually overridden the auto-recommended method. */
  methodOverridden?: boolean;
}

/**
 * Recommend the calculation method from institution + jurisdiction.
 * Mirrors EMD2 Art. 5 (EMI → fixed 2% rule) and PSD2 Art. 9
 * (PI → Method B is the most common default; competent authority may
 * require A or C). AISPs hold PII instead of own funds.
 */
function recommendMethod(institution: CapitalCalcValue["institutionType"]): {
  method: CapitalMethod;
  reason: string;
  cite: string;
} {
  switch (institution) {
    case "EMI":
    case "Small EMI":
      return {
        method: "Fixed (EMI)",
        reason:
          "EMIs are not subject to Methods A/B/C. Ongoing own funds = the higher of the €350k floor or 2% of average outstanding e-money (the fixed 2% rule under EMD2 Art. 5(3)).",
        cite: "EMD2 Art. 5(3) / EMRs 2011 Reg 19 Sch 2 Part 3",
      };
    case "PI":
    case "PISP":
      return {
        method: "Method B",
        reason:
          "PSD2 lets the regulator pick A, B or C. Method B (volume-tiered) is the default for most PIs/PISPs because it scales with payment activity rather than overheads.",
        cite: "PSD2 Art. 9 / PSRs 2017 Sch 3 Part 2",
      };
    case "AISP":
      return {
        method: "Fixed (EMI)", // placeholder — AISPs don't run a method
        reason:
          "AISPs hold no minimum own funds. Instead, professional indemnity insurance (PII) is mandatory under PSD2 Art. 5(3) and EBA/GL/2017/08.",
        cite: "PSD2 Art. 33 + EBA/GL/2017/08",
      };
    default:
      return {
        method: "Method B",
        reason: "Default to Method B pending regulator guidance.",
        cite: "PSD2 Art. 9",
      };
  }
}

const CAPITAL_DEFAULTS: CapitalCalcValue = {
  institutionType: "EMI",
  method: "Fixed (EMI)",
  currency: "EUR",
  qualifying: 0,
  fixedOverhead: 0,
  paymentVolume: 0,
  totalIncome: 0,
  emoneyOutstanding: 0,
  threshold: 350000,
  headroom: 0,
};

// Initial capital floors per regime (rough EU/UK harmonised view).
// CapitalThresholdLookup gives the country-precise figure; this is a fallback.
const INITIAL_CAPITAL: Record<CapitalCalcValue["institutionType"], number> = {
  EMI: 350000,
  "Small EMI": 0, // no minimum but capped business
  PI: 125000, // depends on services; we use the most common (Annex I.3-6)
  PISP: 50000,
  AISP: 0, // PII instead of own funds
};

function computeOngoing(v: CapitalCalcValue): number {
  switch (v.method) {
    case "Method A":
      // 10% of preceding year's fixed overheads
      return v.fixedOverhead * 0.1;
    case "Method B": {
      // Sliding-scale on monthly payment volume (k = scaling factor for the institution type)
      const pv = v.paymentVolume; // monthly average
      // Tier amounts as per PSD2 Annex
      let req = 0;
      const tier1 = Math.min(pv, 5_000_000);
      const tier2 = Math.min(Math.max(pv - 5_000_000, 0), 5_000_000);
      const tier3 = Math.min(Math.max(pv - 10_000_000, 0), 90_000_000);
      const tier4 = Math.min(Math.max(pv - 100_000_000, 0), 150_000_000);
      const tier5 = Math.max(pv - 250_000_000, 0);
      req = tier1 * 0.04 + tier2 * 0.025 + tier3 * 0.01 + tier4 * 0.005 + tier5 * 0.0025;
      // Scaling factor: PI without account services typically k=0.5
      return req * 0.5;
    }
    case "Method C":
      // Multiplier on net income — simplified (10% of net income as a working proxy)
      return v.totalIncome * 0.1;
    case "Fixed (EMI)":
      // EMI: max(€350k, 2% of average outstanding e-money)
      return Math.max(350000, v.emoneyOutstanding * 0.02);
    default:
      return 0;
  }
}

function fmt(n: number, currency: string) {
  if (!isFinite(n)) return "—";
  return new Intl.NumberFormat("en-EU", {
    style: "currency",
    currency: currency || "EUR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function CapitalCalculator({
  value,
  onChange,
  institution,
  country,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Auto-detected from the assessment context. */
  institution?: string;
  country?: string;
}) {
  // Resolve a sane initial institution from props the first time we mount.
  const initialInstitution = (() => {
    const i = institution as CapitalCalcValue["institutionType"] | undefined;
    if (i && (i === "EMI" || i === "Small EMI" || i === "PI" || i === "AISP" || i === "PISP")) {
      return i;
    }
    return CAPITAL_DEFAULTS.institutionType;
  })();
  const initialCurrency: CapitalCalcValue["currency"] = country === "GB" ? "GBP" : "EUR";

  const [v, setV] = useState<CapitalCalcValue>(() => {
    try {
      const parsed = JSON.parse(value || "{}") as Partial<CapitalCalcValue>;
      const rec = recommendMethod(initialInstitution);
      return {
        ...CAPITAL_DEFAULTS,
        institutionType: initialInstitution,
        method: rec.method,
        currency: initialCurrency,
        ...parsed,
      };
    } catch {
      const rec = recommendMethod(initialInstitution);
      return {
        ...CAPITAL_DEFAULTS,
        institutionType: initialInstitution,
        method: rec.method,
        currency: initialCurrency,
      };
    }
  });

  // The country-precise threshold from our regulatory lookup table.
  const lookup = useMemo(
    () => lookupCapitalThreshold(v.institutionType, country ?? "EU"),
    [v.institutionType, country],
  );
  const recommendation = useMemo(() => recommendMethod(v.institutionType), [v.institutionType]);

  // Recompute whenever inputs change
  useEffect(() => {
    // Use the country-precise floor when available; fall back to the regional default.
    const initial = lookup?.initialCapital.amount ?? INITIAL_CAPITAL[v.institutionType];
    const ongoing = computeOngoing(v);
    const threshold = Math.max(initial, ongoing);
    const headroom = v.qualifying - threshold;
    const next: CapitalCalcValue = { ...v, threshold, headroom };
    onChange(JSON.stringify(next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    v.institutionType,
    v.method,
    v.currency,
    v.qualifying,
    v.fixedOverhead,
    v.paymentVolume,
    v.totalIncome,
    v.emoneyOutstanding,
    lookup,
  ]);

  const meets = v.qualifying >= v.threshold;

  const set = <K extends keyof CapitalCalcValue>(key: K, val: CapitalCalcValue[K]) =>
    setV((prev) => {
      const next = { ...prev, [key]: val };
      // Auto-pick the recommended method when institution changes
      if (key === "institutionType") {
        const rec = recommendMethod(val as CapitalCalcValue["institutionType"]);
        next.method = rec.method;
        next.methodOverridden = false;
      }
      if (key === "method") {
        const rec = recommendMethod(prev.institutionType);
        next.methodOverridden = val !== rec.method;
      }
      return next;
    });

  const resetMethod = () =>
    setV((prev) => ({ ...prev, method: recommendMethod(prev.institutionType).method, methodOverridden: false }));

  return (
    <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand-soft/30 to-card p-4 space-y-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-brand">
        <Calculator className="h-3.5 w-3.5" />
        Own-funds calculator
      </div>

      {/* Auto-recommendation banner — explains WHICH method applies and WHY */}
      <div className="rounded-lg border border-brand/30 bg-brand-soft/40 p-3 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide font-semibold text-brand">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Recommended for {v.institutionType}
            {country ? ` · ${country}` : ""}
          </div>
          <span className="text-[11px] font-semibold text-navy bg-card border border-border rounded-md px-2 py-0.5">
            {recommendation.method}
          </span>
        </div>
        <p className="text-[11.5px] leading-relaxed text-navy">{recommendation.reason}</p>
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <span className="text-[10.5px] text-muted-foreground">
            Source: {recommendation.cite}
          </span>
          {lookup?.sourceUrl && (
            <a
              href={lookup.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-[10.5px] text-brand hover:underline inline-flex items-center gap-1"
            >
              Open regulation <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        {v.methodOverridden && (
          <div className="flex items-center justify-between gap-2 mt-1.5 rounded-md border border-warn/40 bg-warn-soft/40 px-2 py-1.5">
            <span className="text-[11px] text-navy">
              You picked <b>{v.method}</b> — this differs from the recommendation.
            </span>
            <button
              type="button"
              onClick={resetMethod}
              className="text-[11px] font-semibold text-brand hover:underline"
            >
              Reset to {recommendation.method}
            </button>
          </div>
        )}
      </div>

      {/* AISP special case — no own-funds calc applies */}
      {v.institutionType === "AISP" && (
        <div className="rounded-lg border border-border bg-card p-3 text-[12px] text-navy leading-relaxed">
          <b>No own-funds calculation required.</b> AISPs hold professional indemnity insurance (PII)
          instead of capital. Use the PII calculator step to compute your minimum cover under EBA/GL/2017/08.
        </div>
      )}

      {/* Small EMI special case — no ongoing own-funds, only the €5m business cap */}
      {v.institutionType === "Small EMI" && (
        <div className="rounded-lg border border-border bg-card p-3 text-[12px] text-navy leading-relaxed">
          <b>No ongoing own-funds requirement.</b> Small EMIs are subject to a €5,000,000 cap on
          average outstanding e-money. Track the cap in the safeguarding step rather than running a method here.
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Field label="Institution type" help={institution ? `Auto-detected: ${institution}` : undefined}>
          <select
            value={v.institutionType}
            onChange={(e) =>
              set("institutionType", e.target.value as CapitalCalcValue["institutionType"])
            }
            className={inputCls}
          >
            <option value="EMI">EMI (Authorised E-Money Institution)</option>
            <option value="Small EMI">Small EMI</option>
            <option value="PI">PI (Payment Institution)</option>
            <option value="PISP">PISP (Payment Initiation)</option>
            <option value="AISP">AISP (Account Information)</option>
          </select>
        </Field>
        <Field
          label="Calculation method"
          help={
            v.methodOverridden
              ? "Manual override — see banner above."
              : `Auto-picked from ${v.institutionType}.`
          }
        >
          <select
            value={v.method}
            onChange={(e) => set("method", e.target.value as CapitalCalcValue["method"])}
            className={inputCls}
            disabled={v.institutionType === "AISP" || v.institutionType === "Small EMI"}
          >
            <option>Fixed (EMI)</option>
            <option>Method A</option>
            <option>Method B</option>
            <option>Method C</option>
          </select>
        </Field>
        <Field label="Currency" help={country === "GB" ? "Auto-set to GBP for UK." : undefined}>
          <select
            value={v.currency}
            onChange={(e) => set("currency", e.target.value as CapitalCalcValue["currency"])}
            className={inputCls}
          >
            <option>EUR</option>
            <option>GBP</option>
            <option>USD</option>
          </select>
        </Field>
      </div>

      {/* Method-specific inputs */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <div className="text-[11px] font-semibold text-navy uppercase tracking-wide">
          {v.method} inputs
        </div>
        {v.method === "Fixed (EMI)" && (
          <Field
            label="Average outstanding e-money (last 6 months)"
            help="EMI ongoing requirement: max(€350,000, 2% of average outstanding e-money)."
          >
            <NumberInput value={v.emoneyOutstanding} onChange={(n) => set("emoneyOutstanding", n)} />
          </Field>
        )}
        {v.method === "Method A" && (
          <Field
            label="Preceding year's fixed overheads"
            help="Method A: ongoing own-funds = 10% of fixed overheads of the preceding year."
          >
            <NumberInput value={v.fixedOverhead} onChange={(n) => set("fixedOverhead", n)} />
          </Field>
        )}
        {v.method === "Method B" && (
          <Field
            label="Average monthly payment volume (last 12 months)"
            help="Method B: sliding-scale on monthly payment volume × scaling factor."
          >
            <NumberInput value={v.paymentVolume} onChange={(n) => set("paymentVolume", n)} />
          </Field>
        )}
        {v.method === "Method C" && (
          <Field
            label="Relevant net income (preceding financial year)"
            help="Method C: based on a multiplier of relevant income."
          >
            <NumberInput value={v.totalIncome} onChange={(n) => set("totalIncome", n)} />
          </Field>
        )}
      </div>

      <Field label="Qualifying capital you currently hold" help="Paid-up share capital + audited retained earnings.">
        <NumberInput value={v.qualifying} onChange={(n) => set("qualifying", n)} />
      </Field>

      {/* Result */}
      <div
        className={`rounded-lg border p-3 ${
          meets
            ? "border-success/40 bg-success-soft/40"
            : "border-warn/40 bg-warn-soft/40"
        }`}
      >
        <div className="flex items-start gap-2">
          {meets ? (
            <TrendingUp className="h-4 w-4 text-success mt-0.5 shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-warn-foreground mt-0.5 shrink-0" />
          )}
          <div className="flex-1">
            <div className="text-[12px] font-semibold text-navy">
              {meets
                ? "✓ Capital position meets the regulatory floor"
                : "Capital shortfall — close the gap before submission"}
            </div>
            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px]">
              <Stat label="Required threshold" value={fmt(v.threshold, v.currency)} />
              <Stat label="Qualifying capital" value={fmt(v.qualifying, v.currency)} />
              <Stat
                label="Headroom"
                value={fmt(v.headroom, v.currency)}
                tone={meets ? "good" : "bad"}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Capital Structure Table ----------

interface CapitalLine {
  label: string;
  amount: number;
  qualifies: boolean;
  /** True when the user has overridden the auto-classification. */
  manual?: boolean;
}

/**
 * EBA / PSD2 / EMD2 / CRR-aligned classification rules for own-funds items.
 * Each rule has matching keywords, the suggested qualification, and a short
 * explanation that we surface inline so the user understands WHY.
 *
 * Sources informing this list:
 *  - CRR Art. 26-36 (CET1 items + prudential filters / deductions)
 *  - PSD2 Art. 7 / EMD2 Art. 5 (own-funds composition references CRR)
 *  - EBA Guidelines on own funds
 */
interface ClassifyRule {
  match: RegExp;
  qualifies: boolean;
  reason: string;
}

const CLASSIFY_RULES: ClassifyRule[] = [
  // ---- Qualifying (CET1-eligible) ----
  {
    match: /paid[\s-]?up.*(share|ordinary|common).*capital|ordinary shares?|common stock|paid[\s-]?in capital/i,
    qualifies: true,
    reason: "Paid-up ordinary share capital — CET1 instrument under CRR Art. 28.",
  },
  {
    match: /share premium|additional paid[\s-]?in capital|capital surplus/i,
    qualifies: true,
    reason: "Share premium tied to CET1 instruments — CRR Art. 26(1)(b).",
  },
  {
    match: /retained earnings|accumulated profits?/i,
    qualifies: true,
    reason: "Retained earnings — qualifies once audited and net of foreseeable dividends (CRR Art. 26(1)(c) & 26(2)).",
  },
  {
    match: /reserves?|statutory reserve|legal reserve/i,
    qualifies: true,
    reason: "Other reserves — CET1 under CRR Art. 26(1)(d) if freely available to absorb losses.",
  },
  {
    match: /accumulated other comprehensive income|aoci|revaluation reserve/i,
    qualifies: true,
    reason: "AOCI — CET1 under CRR Art. 26(1)(d), subject to prudential filters.",
  },
  {
    match: /fund for general banking risk|general banking risk/i,
    qualifies: true,
    reason: "Fund for general banking risks — CET1 under CRR Art. 26(1)(f).",
  },
  // ---- Non-qualifying (deductions or excluded) ----
  {
    match: /goodwill/i,
    qualifies: false,
    reason: "Goodwill must be deducted from CET1 — CRR Art. 36(1)(b) & 37.",
  },
  {
    match: /intangible|software|trademark|patent/i,
    qualifies: false,
    reason: "Other intangible assets are deducted from CET1 — CRR Art. 36(1)(b) & 37.",
  },
  {
    match: /deferred tax asset|\bdta\b/i,
    qualifies: false,
    reason: "DTAs that rely on future profitability are deducted — CRR Art. 36(1)(c) & 38.",
  },
  {
    match: /shareholder loan|director loan|related[\s-]?party loan/i,
    qualifies: false,
    reason: "Shareholder/related-party loans are debt, not equity — not eligible as own funds.",
  },
  {
    match: /preferred shares?|preference shares?/i,
    qualifies: false,
    reason: "Most preference shares fall under AT1/T2, not CET1 — exclude unless specifically CET1-compliant.",
  },
  {
    match: /subordinated (debt|loan|liabilit)/i,
    qualifies: false,
    reason: "Subordinated debt is Tier 2 capital, not own funds for PI/EMI minimum-capital purposes.",
  },
  {
    match: /treasury shares?|own shares?/i,
    qualifies: false,
    reason: "Treasury / own shares must be deducted — CRR Art. 36(1)(f).",
  },
  {
    match: /current[\s-]?year (loss|losses)|interim loss|unaudited (profit|earnings)/i,
    qualifies: false,
    reason: "Current-year losses are deducted; unaudited profits cannot be added until verified — CRR Art. 26(2).",
  },
  {
    match: /minority interest/i,
    qualifies: false,
    reason: "Minority interests only qualify under strict consolidation conditions — exclude by default (CRR Art. 81-88).",
  },
  {
    match: /provision|accrual/i,
    qualifies: false,
    reason: "General provisions are not CET1 eligible (limited Tier 2 treatment may apply).",
  },
];

/** Library the user can pick from to add a pre-classified line. */
const COMMON_ITEMS: { label: string }[] = [
  { label: "Paid-up share capital" },
  { label: "Share premium" },
  { label: "Audited retained earnings" },
  { label: "Other reserves" },
  { label: "Accumulated OCI (AOCI)" },
  { label: "Goodwill" },
  { label: "Intangible assets (software)" },
  { label: "Deferred tax assets" },
  { label: "Shareholder loans" },
  { label: "Subordinated debt" },
  { label: "Preference shares" },
  { label: "Treasury shares" },
  { label: "Current-year unaudited profit" },
  { label: "Current-year loss" },
];

function classify(label: string): { qualifies: boolean; reason: string } | null {
  const hit = CLASSIFY_RULES.find((r) => r.match.test(label));
  return hit ? { qualifies: hit.qualifies, reason: hit.reason } : null;
}

const DEFAULT_LINES: CapitalLine[] = [
  { label: "Paid-up share capital", amount: 0, qualifies: true },
  { label: "Audited retained earnings", amount: 0, qualifies: true },
  { label: "Share premium", amount: 0, qualifies: true },
  { label: "Goodwill", amount: 0, qualifies: false },
  { label: "Deferred tax assets", amount: 0, qualifies: false },
  { label: "Shareholder loans", amount: 0, qualifies: false },
];

export function CapitalStructureTable({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const [lines, setLines] = useState<CapitalLine[]>(() => {
    try {
      const parsed = JSON.parse(value || "{}") as { lines?: CapitalLine[] };
      return parsed.lines && parsed.lines.length > 0 ? parsed.lines : DEFAULT_LINES;
    } catch {
      return DEFAULT_LINES;
    }
  });
  const [pickerOpen, setPickerOpen] = useState(false);

  const totals = useMemo(() => {
    const qualifying = lines.filter((l) => l.qualifies).reduce((s, l) => s + (l.amount || 0), 0);
    const nonQualifying = lines
      .filter((l) => !l.qualifies)
      .reduce((s, l) => s + (l.amount || 0), 0);
    return { qualifying, nonQualifying, total: qualifying + nonQualifying };
  }, [lines]);

  // Persist JSON-serialised whenever lines change
  useEffect(() => {
    onChange(
      JSON.stringify({
        lines,
        totals,
        summary: lines
          .filter((l) => l.qualifies && l.amount > 0)
          .map((l) => `${l.label}: ${fmt(l.amount, "EUR")}`)
          .join("; "),
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lines]);

  const update = (idx: number, patch: Partial<CapitalLine>) =>
    setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, ...patch } : l)));

  /** Update label and re-run auto-classification (unless user has overridden). */
  const updateLabel = (idx: number, label: string) =>
    setLines((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        if (l.manual) return { ...l, label };
        const c = classify(label);
        return c ? { ...l, label, qualifies: c.qualifies } : { ...l, label };
      }),
    );

  const remove = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx));

  const add = (label = "New line item") => {
    const c = classify(label);
    setLines((prev) => [
      ...prev,
      { label, amount: 0, qualifies: c ? c.qualifies : true },
    ]);
  };

  /** Re-run classification on every line, clearing manual overrides. */
  const autoClassifyAll = () => {
    setLines((prev) =>
      prev.map((l) => {
        const c = classify(l.label);
        return c ? { ...l, qualifies: c.qualifies, manual: false } : { ...l, manual: false };
      }),
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-navy uppercase tracking-wide">
          Map your balance sheet
        </span>
        <button
          type="button"
          onClick={autoClassifyAll}
          className="text-[10.5px] font-medium text-brand hover:text-brand/80"
          title="Re-classify every row using EBA / CRR rules"
        >
          ✨ Auto-classify all
        </button>
      </div>

      <div className="px-3 py-1.5 bg-brand-soft/30 border-b border-border text-[10.5px] text-navy leading-relaxed">
        Complee suggests qualification automatically using EBA / CRR own-funds rules. Each row
        explains the rule. You can override any row.
      </div>

      <div className="divide-y divide-border">
        {lines.map((l, i) => {
          const suggestion = classify(l.label);
          const matchesSuggestion = suggestion ? suggestion.qualifies === l.qualifies : true;
          return (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto_auto_auto] items-start gap-2 px-3 py-2"
            >
              <div className="min-w-0">
                <input
                  value={l.label}
                  onChange={(e) => updateLabel(i, e.target.value)}
                  className="w-full text-[12.5px] bg-transparent focus:outline-none focus:ring-1 focus:ring-brand/40 rounded px-1 py-0.5 text-navy"
                />
                {suggestion ? (
                  <div
                    className={`mt-0.5 px-1 text-[10.5px] leading-snug ${
                      matchesSuggestion ? "text-muted-foreground" : "text-warn-foreground"
                    }`}
                  >
                    {matchesSuggestion ? (
                      <>
                        <span className="font-semibold">
                          {suggestion.qualifies ? "✓ Auto: qualifies" : "✗ Auto: excluded"}
                        </span>
                        {" — "}
                        {suggestion.reason}
                      </>
                    ) : (
                      <>
                        <span className="font-semibold">
                          ⚠ Override active — Complee suggests{" "}
                          {suggestion.qualifies ? "QUALIFIES" : "EXCLUDED"}
                        </span>
                        {" — "}
                        {suggestion.reason}
                      </>
                    )}
                  </div>
                ) : (
                  <div className="mt-0.5 px-1 text-[10.5px] text-muted-foreground italic">
                    Unrecognised item — please classify manually or rename to a standard term.
                  </div>
                )}
              </div>
              <input
                type="number"
                value={l.amount || ""}
                onChange={(e) => update(i, { amount: Number(e.target.value) || 0 })}
                placeholder="0"
                className="w-28 text-right text-[12.5px] bg-transparent border-b border-border focus:outline-none focus:border-brand text-navy mt-0.5"
              />
              <label className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground cursor-pointer mt-0.5">
                <input
                  type="checkbox"
                  checked={l.qualifies}
                  onChange={(e) => update(i, { qualifies: e.target.checked, manual: true })}
                  className="accent-brand"
                />
                Qualifies
              </label>
              <button
                type="button"
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-danger p-1 mt-0.5"
                aria-label="Remove line"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
      <div className="px-3 py-2 border-t border-border bg-surface-muted/60 flex items-center gap-3 flex-wrap relative">
        <button
          type="button"
          onClick={() => add()}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-brand hover:text-brand/80 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add blank line
        </button>
        <button
          type="button"
          onClick={() => setPickerOpen((s) => !s)}
          className="inline-flex items-center gap-1.5 text-[11.5px] text-brand hover:text-brand/80 font-medium"
        >
          <Plus className="h-3.5 w-3.5" />
          Add common item…
        </button>
        {pickerOpen && (
          <div className="absolute bottom-full left-3 mb-1 z-10 max-h-60 w-64 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            {COMMON_ITEMS.map((it) => {
              const c = classify(it.label);
              return (
                <button
                  key={it.label}
                  type="button"
                  onClick={() => {
                    add(it.label);
                    setPickerOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-surface-muted flex items-center justify-between gap-2"
                >
                  <span className="text-navy">{it.label}</span>
                  <span
                    className={`text-[10px] font-semibold ${
                      c?.qualifies ? "text-success" : "text-muted-foreground"
                    }`}
                  >
                    {c?.qualifies ? "QUAL" : "EXCL"}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2 p-3 bg-surface-muted border-t border-border text-[11.5px]">
        <Stat label="Qualifying" value={fmt(totals.qualifying, "EUR")} tone="good" />
        <Stat label="Non-qualifying" value={fmt(totals.nonQualifying, "EUR")} tone="muted" />
        <Stat label="Total" value={fmt(totals.total, "EUR")} />
      </div>
    </div>
  );
}

// ---------- Multi-select chips ----------

export function MultiSelectChips({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (next: string) => void;
}) {
  const selected = useMemo<string[]>(() => {
    if (!value) return [];
    try {
      const p = JSON.parse(value);
      return Array.isArray(p) ? p : [];
    } catch {
      return value.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }, [value]);

  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onChange(JSON.stringify(next));
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const active = selected.includes(o);
        return (
          <button
            key={o}
            type="button"
            onClick={() => toggle(o)}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium border transition-colors ${
              active
                ? "border-brand bg-brand text-brand-foreground"
                : "border-border bg-card text-navy hover:border-brand/40 hover:bg-brand-soft/30"
            }`}
          >
            {active && "✓ "}
            {o}
          </button>
        );
      })}
    </div>
  );
}

// ---------- Radio with rich descriptions ----------

export function RadioExplained({
  value,
  options,
  onChange,
}: {
  value: string;
  options: { value: string; label: string; description?: string }[];
  onChange: (next: string) => void;
}) {
  return (
    <div className="space-y-2">
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={`block w-full text-left rounded-lg border p-3 transition-all ${
              active
                ? "border-brand bg-brand-soft/40 ring-1 ring-brand/40"
                : "border-border bg-card hover:border-brand/40"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                  active ? "border-brand" : "border-muted-foreground/40"
                }`}
              >
                {active && <span className="h-2 w-2 rounded-full bg-brand" />}
              </span>
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-navy">{o.label}</div>
                {o.description && (
                  <div className="mt-0.5 text-[11.5px] text-muted-foreground leading-relaxed">
                    {o.description}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ---------- Capital Threshold Lookup ----------

/**
 * Auto-resolves the exact capital threshold for the user's institution +
 * country combination from `lib/capitalThresholds.ts`. Replaces the manual
 * "open the regulation and write down the number" step with a one-click
 * confirmation. The user just clicks "Confirmed" and Complee stores the
 * full snapshot (regulation, article, amount, formula, source URL).
 */
export function CapitalThresholdLookup({
  value,
  onChange,
  institution,
  country,
}: {
  value: string;
  onChange: (next: string) => void;
  institution: string;
  country: string;
}) {
  const lookup = useMemo(
    () => lookupCapitalThreshold(institution, country),
    [institution, country],
  );

  const [confirmed, setConfirmed] = useState<boolean>(() => {
    try {
      const p = JSON.parse(value || "{}");
      return Boolean(p?.confirmed);
    } catch {
      return false;
    }
  });

  // When the lookup resolves, persist the full snapshot so generated
  // documents and downstream steps can read it.
  useEffect(() => {
    if (!lookup) return;
    onChange(
      JSON.stringify({
        confirmed,
        regulation: lookup.regulation,
        article: lookup.article,
        initialCapitalAmount: lookup.initialCapital.amount,
        initialCapitalCurrency: lookup.initialCapital.currency,
        initialCapitalDescription: lookup.initialCapital.description,
        ongoingMethod: lookup.ongoing.method,
        ongoingFormula: lookup.ongoing.formula,
        ongoingExplanation: lookup.ongoing.explanation,
        sourceUrl: lookup.sourceUrl,
        quote: lookup.quote,
        institution,
        country,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lookup, confirmed]);

  if (!lookup) {
    return (
      <div className="rounded-xl border border-warn/40 bg-warn-soft/40 p-4 text-[12.5px] text-warn-foreground">
        <div className="font-semibold mb-1">No pre-loaded threshold for this combination</div>
        <p className="leading-relaxed">
          Complee doesn't yet have a curated entry for{" "}
          <span className="font-mono">
            {institution} in {country}
          </span>
          . Please consult the local transposition of PSD2 / EMD2 manually and
          fill in the calculator below.
        </p>
      </div>
    );
  }

  const ic = lookup.initialCapital;
  const fmtAmount = ic.amount > 0
    ? new Intl.NumberFormat("en-EU", {
        style: "currency",
        currency: ic.currency,
        maximumFractionDigits: 0,
      }).format(ic.amount)
    : "No initial capital";

  return (
    <div className="rounded-xl border border-brand/30 bg-gradient-to-br from-brand-soft/40 to-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.08em] font-semibold text-brand">
          <BookOpen className="h-3.5 w-3.5" />
          Auto-resolved by Complee
        </div>
        <span className="text-[10.5px] text-muted-foreground">
          {institution} · {country}
        </span>
      </div>

      <div className="rounded-lg bg-card border border-border p-3">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">
          Initial capital
        </div>
        <div className="mt-0.5 text-[20px] font-bold text-navy tabular-nums">
          {fmtAmount}
        </div>
        <p className="mt-1 text-[11.5px] text-muted-foreground leading-relaxed">
          {ic.description}
        </p>
      </div>

      <div className="rounded-lg bg-card border border-border p-3">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">
          Ongoing own-funds method
        </div>
        <div className="mt-0.5 text-[13px] font-semibold text-navy">
          {lookup.ongoing.method}
        </div>
        <div className="mt-1 inline-block rounded bg-surface-muted px-2 py-0.5 text-[11.5px] font-mono text-navy">
          {lookup.ongoing.formula}
        </div>
        <p className="mt-1.5 text-[11.5px] text-muted-foreground leading-relaxed">
          {lookup.ongoing.explanation}
        </p>
      </div>

      <div className="rounded-lg bg-card border border-border p-3">
        <div className="text-[10.5px] uppercase tracking-wide text-muted-foreground font-semibold">
          Source
        </div>
        <div className="mt-0.5 text-[12.5px] text-navy">
          <span className="font-semibold">{lookup.regulation}</span> ·{" "}
          <span className="text-muted-foreground">{lookup.article}</span>
        </div>
        <div className="mt-2 flex items-start gap-2 rounded bg-surface-muted/60 px-2.5 py-2 text-[11.5px] text-navy">
          <Quote className="h-3.5 w-3.5 text-brand mt-0.5 shrink-0" />
          <span className="italic leading-relaxed">{lookup.quote}</span>
        </div>
        {lookup.phaseIn && (
          <p className="mt-2 text-[11.5px] text-warn-foreground leading-relaxed">
            <span className="font-semibold">Phase-in: </span>
            {lookup.phaseIn}
          </p>
        )}
        <a
          href={lookup.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-medium text-brand hover:text-brand/80"
        >
          Open the source text
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>

      <button
        type="button"
        onClick={() => setConfirmed((c) => !c)}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-[13px] font-medium transition-colors ${
          confirmed
            ? "bg-success text-white hover:bg-success/90"
            : "bg-brand text-brand-foreground hover:bg-brand/90"
        }`}
      >
        <CheckCircle2 className="h-4 w-4" />
        {confirmed ? "Confirmed — recorded in your file" : "Confirm threshold"}
      </button>
    </div>
  );
}

// ---------- Local primitives ----------

const inputCls =
  "w-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[12.5px] text-navy focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand";

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-[11.5px] font-medium text-navy mb-1">{label}</span>
      {children}
      {help && <span className="block text-[10.5px] text-muted-foreground mt-1">{help}</span>}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
}: {
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      value={value || ""}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      placeholder="0"
      className={inputCls}
    />
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad" | "muted";
}) {
  const cls =
    tone === "good"
      ? "text-success-foreground"
      : tone === "bad"
        ? "text-danger"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-navy";
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-[13px] font-semibold tabular-nums ${cls}`}>{value}</div>
    </div>
  );
}
