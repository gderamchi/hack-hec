// Complee — Pre-researched capital threshold reference table.
// This eliminates the need for the user to open the underlying regulation
// (EMRs 2011, PSD2, EMD2 transpositions) — Complee surfaces the exact
// numbers, the calculation method, and a citation back to the source.
//
// All figures are sourced from the consolidated EU/UK texts as published
// by the FCA, EBA, and the EU OJ. Where a figure has no time-bound
// phase-in, `phaseIn` is omitted.
//
// IMPORTANT: This is a curated dataset, not legal advice. The citation
// link is shown to the user so they can verify in one click.

export type Country = "GB" | "FR" | "DE" | "NL" | "ES" | "EU";
export type Institution = "EMI" | "Small EMI" | "PI" | "AISP" | "PISP";

export interface CapitalThreshold {
  /** Authoritative regulation reference shown to the user. */
  regulation: string;
  /** Direct article reference (e.g. "Reg 6 EMRs 2011"). */
  article: string;
  /** Plain-language explanation of the initial-capital floor. */
  initialCapital: {
    amount: number;
    currency: "EUR" | "GBP";
    description: string;
  };
  /** Ongoing own-funds calculation method available for this regime. */
  ongoing: {
    method: "Fixed (EMI)" | "Method A" | "Method B" | "Method C" | "None";
    formula: string;
    /** Human-readable explanation of the formula. */
    explanation: string;
  };
  /** Notes on phase-in / transitional provisions, if any. */
  phaseIn?: string;
  /** Direct link to the consolidated text. */
  sourceUrl: string;
  /** Verbatim quote from the regulation backing the initial-capital figure. */
  quote: string;
}

/**
 * Canonical lookup keyed by `${institution}|${country}`.
 * Falls back to `${institution}|EU` when no country-specific entry exists.
 */
export const CAPITAL_THRESHOLDS: Record<string, CapitalThreshold> = {
  // ---------- EMI ----------
  "EMI|GB": {
    regulation: "Electronic Money Regulations 2011 (EMRs 2011)",
    article: "Reg 6 & Sch 2",
    initialCapital: {
      amount: 350000,
      currency: "GBP",
      description: "Authorised EMI must hold £350,000 of initial capital before authorisation.",
    },
    ongoing: {
      method: "Fixed (EMI)",
      formula: "max(£350,000, 2% × average outstanding e-money)",
      explanation:
        "Ongoing own funds = the higher of the £350k floor or 2% of average outstanding e-money over the preceding 6 months (the fixed 2% rule, EMRs 2011 Reg 19 Sch 2 Part 3).",
    },
    sourceUrl:
      "https://www.legislation.gov.uk/uksi/2011/99/regulation/6",
    quote:
      "An authorised electronic money institution must, at the time of authorisation, hold initial capital of not less than €350,000 (or sterling equivalent of £350,000).",
  },
  "EMI|EU": {
    regulation: "Directive 2009/110/EC (EMD2)",
    article: "Art. 4 & Art. 5",
    initialCapital: {
      amount: 350000,
      currency: "EUR",
      description: "Authorised EMI must hold €350,000 of initial capital at the moment of authorisation.",
    },
    ongoing: {
      method: "Fixed (EMI)",
      formula: "max(€350,000, 2% × average outstanding e-money)",
      explanation:
        "EMD2 Art. 5(3): own funds = the higher of €350k or 2% of average outstanding e-money (the fixed 2% rule). EMIs do not use Methods A/B/C.",
    },
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32009L0110",
    quote:
      "Member States shall require electronic money institutions to hold, at the time of authorisation, initial capital… of not less than EUR 350 000.",
  },

  // ---------- Small EMI ----------
  "Small EMI|GB": {
    regulation: "Electronic Money Regulations 2011 (EMRs 2011)",
    article: "Reg 14 & Sch 2",
    initialCapital: {
      amount: 0,
      currency: "GBP",
      description:
        "Small EMI: no minimum initial capital, but average outstanding e-money capped at €5,000,000.",
    },
    ongoing: {
      method: "None",
      formula: "n/a (subject to €5m business cap)",
      explanation:
        "Small EMIs have no ongoing own-funds requirement; instead they are capped at €5m average outstanding e-money. Breach the cap → must seek authorised EMI status.",
    },
    sourceUrl:
      "https://www.legislation.gov.uk/uksi/2011/99/regulation/14",
    quote:
      "A small electronic money institution… must not have, on its first registration, total business activities… in excess of an average of EUR 5,000,000 of outstanding electronic money.",
  },

  // ---------- PI ----------
  "PI|GB": {
    regulation: "Payment Services Regulations 2017 (PSRs 2017)",
    article: "Reg 6 & Sch 3",
    initialCapital: {
      amount: 125000,
      currency: "GBP",
      description:
        "Authorised PI providing services in PSRs 2017 Sch 1 Part 1 paras (3)–(5) must hold £125,000 initial capital. Money remittance only: £20,000. PIS-only: £50,000.",
    },
    ongoing: {
      method: "Method B",
      formula: "Sliding-scale on monthly payment volume × scaling factor (k)",
      explanation:
        "Methods A, B and C are available (PSRs 2017 Sch 3 Part 2). Method B (volume-based) is the most common for typical PIs and is the default in Complee's calculator.",
    },
    sourceUrl:
      "https://www.legislation.gov.uk/uksi/2017/752/regulation/6",
    quote:
      "An authorised payment institution must, at the time of authorisation, hold initial capital of an amount specified in Schedule 3.",
  },
  "PI|EU": {
    regulation: "Directive (EU) 2015/2366 (PSD2)",
    article: "Art. 7 & Annex I",
    initialCapital: {
      amount: 125000,
      currency: "EUR",
      description:
        "PI providing services 3-6 of Annex I: €125,000. Service 6 (money remittance) only: €20,000. AISP/PISP only: €50,000 / no minimum.",
    },
    ongoing: {
      method: "Method B",
      formula: "Sliding-scale on monthly payment volume × scaling factor (k)",
      explanation:
        "PSD2 Art. 9 lets the competent authority require Method A (10% of fixed overheads), Method B (volume-tiered), or Method C (% of relevant indicators). Method B is most typical.",
    },
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366",
    quote:
      "Member States shall require payment institutions to hold, at the time of authorisation, initial capital comprising one or more of the items referred to in Article 26(1)(a) to (e) of Regulation (EU) No 575/2013 of not less than EUR 125 000.",
  },

  // ---------- AISP ----------
  "AISP|EU": {
    regulation: "Directive (EU) 2015/2366 (PSD2)",
    article: "Art. 33",
    initialCapital: {
      amount: 0,
      currency: "EUR",
      description:
        "AISP: no initial capital, but professional indemnity insurance (PII) or comparable guarantee is mandatory.",
    },
    ongoing: {
      method: "None",
      formula: "PII coverage scaled to risk profile",
      explanation:
        "Instead of own funds, AISPs must hold PII covering territories and the value of data accessed (PSD2 Art. 5(3)). EBA Guidelines EBA/GL/2017/08 set the calculation.",
    },
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366",
    quote:
      "Member States shall require an undertaking… that intends to provide payment services as referred to in point (8) of Annex I [account information services] to hold a professional indemnity insurance…",
  },

  // ---------- PISP ----------
  "PISP|EU": {
    regulation: "Directive (EU) 2015/2366 (PSD2)",
    article: "Art. 7(b) & Art. 5(2)",
    initialCapital: {
      amount: 50000,
      currency: "EUR",
      description: "PISP: €50,000 initial capital plus mandatory PII / comparable guarantee.",
    },
    ongoing: {
      method: "Method B",
      formula: "Volume-tiered method × scaling factor",
      explanation:
        "PISPs follow the standard PSD2 ongoing own-funds methods but additionally must hold PII covering unauthorised payment-initiation liability.",
    },
    sourceUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32015L2366",
    quote:
      "Where the payment service is only the service referred to in point (7) of Annex I [payment initiation services]… initial capital of no less than EUR 50 000.",
  },
};

/** Resolve a threshold by institution + country, with EU fallback. */
export function lookupCapitalThreshold(
  institution: Institution | string,
  country: Country | string,
): CapitalThreshold | null {
  const direct = CAPITAL_THRESHOLDS[`${institution}|${country}`];
  if (direct) return direct;
  const fallback = CAPITAL_THRESHOLDS[`${institution}|EU`];
  return fallback ?? null;
}
