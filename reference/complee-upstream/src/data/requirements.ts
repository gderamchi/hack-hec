// Complee — Data Layer
// Strict types + JSON loader with embedded fallback.

export type RequirementPriority = "critical" | "high" | "medium" | "low";

export type RequirementCategory =
  | "capital_requirements"
  | "safeguarding"
  | "fraud_prevention"
  | "aml_kyc"
  | "consumer_protection"
  | "governance"
  | "operational_resilience"
  | "reporting"
  | "open_banking"
  | "other";

export type RequirementStatus = "covered" | "partial" | "missing";

export type CountryCode = "FR" | "DE" | "NL" | "ES" | "GB";

export type InstitutionType = "EMI" | "Small EMI" | "PI" | "AISP" | "PISP";

export interface Requirement {
  id?: string;
  title: string;
  description: string;
  regulation_reference: string;
  category: RequirementCategory | string;
  applies_to: string[];
  evidence_quote: string;
  priority: RequirementPriority;
  typical_effort_days: number;
  typical_cost_eur: string;
  country: CountryCode | string;
  authority: string;
  source_url: string;
}

export interface RequirementsFile {
  generated_at: string;
  version: string;
  coverage: {
    countries: string[];
    authorities: string[];
    total_requirements: number;
  };
  requirements: Requirement[];
}

export interface CompanyProfile {
  companyName: string;
  homeCountry: CountryCode;
  targetCountry: CountryCode;
  institutionType: InstitutionType;
}

export interface AssessmentResultRow {
  requirement: Requirement;
  status: RequirementStatus;
  confidence: number;
  evidenceExcerpt: string;
  gap?: string;
  recommendedAction?: string;
  owner?: "Compliance" | "Engineering" | "Product" | "Operations";
}

export interface AssessmentResult {
  generatedAt: string;
  homeCountry: CountryCode;
  targetCountry: CountryCode;
  totalRequirements: number;
  covered: number;
  partial: number;
  missing: number;
  readinessScore: number;
  rows: AssessmentResultRow[];
}

export interface RegulatorMetadata {
  code: CountryCode;
  country: string;
  flag: string;
  authority: string;
  website: string;
  language: string;
}

export const REGULATORS: RegulatorMetadata[] = [
  {
    code: "FR",
    country: "France",
    flag: "🇫🇷",
    authority: "ACPR",
    website: "https://acpr.banque-france.fr/en",
    language: "fr",
  },
  {
    code: "DE",
    country: "Germany",
    flag: "🇩🇪",
    authority: "BaFin",
    website: "https://www.bafin.de/EN",
    language: "de",
  },
  {
    code: "NL",
    country: "Netherlands",
    flag: "🇳🇱",
    authority: "DNB",
    website: "https://www.dnb.nl/en",
    language: "nl",
  },
  {
    code: "ES",
    country: "Spain",
    flag: "🇪🇸",
    authority: "Banco de España",
    website: "https://www.bde.es/wbe/en",
    language: "es",
  },
  {
    code: "GB",
    country: "United Kingdom",
    flag: "🇬🇧",
    authority: "FCA",
    website: "https://www.fca.org.uk",
    language: "en",
  },
];

export const FALLBACK_REQUIREMENTS: Requirement[] = [
  {
    title: "AEMI initial capital",
    regulation_reference: "EMRs 2011, Reg 6",
    country: "GB",
    authority: "FCA",
    category: "capital_requirements",
    priority: "critical",
    typical_effort_days: 0,
    typical_cost_eur: "350000",
    source_url: "https://www.fca.org.uk/firms/apply-emoney-payment-institution/emi",
    evidence_quote: "Initial capital of at least £350,000.",
    description: "Authorised EMI must hold initial capital of at least £350,000.",
    applies_to: ["EMI"],
  },
  {
    title: "CASS 15 daily reconciliation",
    regulation_reference: "FCA PS25/12",
    country: "GB",
    authority: "FCA",
    category: "safeguarding",
    priority: "critical",
    typical_effort_days: 25,
    typical_cost_eur: "30000",
    source_url:
      "https://www.fca.org.uk/publications/policy-statements/ps25-12-changes-safeguarding-regime-payments-and-e-money-firms",
    evidence_quote:
      "Daily reconciliation between safeguarded funds and customer balances from 7 May 2026.",
    description:
      "From 7 May 2026, daily reconciliation of safeguarded e-money funds is mandatory.",
    applies_to: ["EMI", "Small EMI"],
  },
  {
    title: "Strong customer authentication",
    regulation_reference: "PSRs 2017, Reg 100",
    country: "GB",
    authority: "FCA",
    category: "fraud_prevention",
    priority: "high",
    typical_effort_days: 30,
    typical_cost_eur: "40000",
    source_url: "https://www.fca.org.uk",
    evidence_quote: "PSPs must apply SCA where the payer accesses a payment account online.",
    description: "Strong customer authentication required for online payment account access.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "MLRO appointment",
    regulation_reference: "MLR 2017, Reg 21",
    country: "GB",
    authority: "FCA",
    category: "aml_kyc",
    priority: "high",
    typical_effort_days: 5,
    typical_cost_eur: "8000",
    source_url: "https://www.fca.org.uk",
    evidence_quote: "A relevant person must appoint a Money Laundering Reporting Officer.",
    description: "Must appoint a designated MLRO under MLR 2017 Reg 21.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "Consumer Duty board attestation",
    regulation_reference: "FCA PRIN 2A",
    country: "GB",
    authority: "FCA",
    category: "consumer_protection",
    priority: "high",
    typical_effort_days: 12,
    typical_cost_eur: "15000",
    source_url: "https://www.fca.org.uk",
    evidence_quote:
      "Board must attest annually to delivering good outcomes for retail customers.",
    description: "Annual board attestation on Consumer Duty compliance.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "ZAG authorisation procedure",
    regulation_reference: "ZAG §10–11",
    country: "DE",
    authority: "BaFin",
    category: "governance",
    priority: "critical",
    typical_effort_days: 60,
    typical_cost_eur: "80000",
    source_url:
      "https://www.bafin.de/EN/Aufsicht/ZahlungsdienstePSD2/ZulassungsverfahrenundLaufendeAufsicht/ZulassungsverfahrenundLaufendeAufsicht_node_en.html",
    evidence_quote: "Written authorisation from BaFin required under ZAG §10 or §11.",
    description:
      "Payment and e-money institutions need BaFin authorisation under ZAG §10 (PI) or §11 (EMI).",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "MaRisk risk management",
    regulation_reference: "BaFin Circular 09/2017",
    country: "DE",
    authority: "BaFin",
    category: "operational_resilience",
    priority: "high",
    typical_effort_days: 40,
    typical_cost_eur: "60000",
    source_url: "https://www.bafin.de",
    evidence_quote: "Institutions must establish proper risk management under MaRisk.",
    description: "Document risk management aligned with BaFin's MaRisk circular.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "ACPR licence application",
    regulation_reference: "Code monétaire et financier L.522-6",
    country: "FR",
    authority: "ACPR",
    category: "governance",
    priority: "critical",
    typical_effort_days: 50,
    typical_cost_eur: "70000",
    source_url: "https://acpr.banque-france.fr/en",
    evidence_quote:
      "EMI authorisation granted by ACPR under the French Monetary and Financial Code.",
    description: "ACPR is the competent authority for EMI authorisation in France.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "DNB integrity screening",
    regulation_reference: "Wft Art. 3:8",
    country: "NL",
    authority: "DNB",
    category: "governance",
    priority: "high",
    typical_effort_days: 15,
    typical_cost_eur: "20000",
    source_url: "https://www.dnb.nl/en",
    evidence_quote: "Policy makers and qualifying holders must be of integrity.",
    description:
      "DNB requires integrity screening of board members and qualifying shareholders.",
    applies_to: ["EMI", "PI"],
  },
  {
    title: "Banco de España PI authorisation",
    regulation_reference: "Ley 21/2011",
    country: "ES",
    authority: "Banco de España",
    category: "governance",
    priority: "critical",
    typical_effort_days: 55,
    typical_cost_eur: "75000",
    source_url: "https://www.bde.es/wbe/en",
    evidence_quote:
      "Banco de España is the competent authority for payment institution authorisation.",
    description:
      "Authorisation for payment and e-money services in Spain runs through Banco de España.",
    applies_to: ["EMI", "PI"],
  },
];

// Try to load the hackathon team's JSON file. If missing or invalid, fall back.
// Vite supports the `import.meta.glob` pattern for optional imports.
let _loaded: Requirement[] | null = null;
let _meta: { generated_at: string; version: string } | null = null;

try {
  const modules = import.meta.glob("./complee-requirements.json", {
    eager: true,
    import: "default",
  }) as Record<string, unknown>;
  const file = Object.values(modules)[0] as Partial<RequirementsFile> | undefined;
  if (file && Array.isArray(file.requirements) && file.requirements.length > 0) {
    _loaded = file.requirements as Requirement[];
    _meta = {
      generated_at: file.generated_at ?? new Date().toISOString(),
      version: file.version ?? "1.0.0",
    };
  }
} catch {
  _loaded = null;
}

export function getRequirements(): Requirement[] {
  return _loaded ?? FALLBACK_REQUIREMENTS;
}

export function getRequirementsMeta(): { generated_at: string; version: string } {
  return (
    _meta ?? {
      generated_at: new Date().toISOString(),
      version: "fallback-1.0.0",
    }
  );
}

export function getRequirementCount(): number {
  return getRequirements().length;
}

export function getRegulatorByCountry(code: string): RegulatorMetadata | undefined {
  return REGULATORS.find((r) => r.code === code);
}
