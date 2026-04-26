import type {
  CompanyProfile,
  Country,
  InstitutionType,
  Priority,
  Requirement
} from "@/lib/types";

export type CompleeCountryCode = "FR" | "DE" | "NL" | "ES" | "GB";

export type CompleeRequirement = {
  id: string;
  title: string;
  description: string;
  regulation_reference: string;
  category: string;
  applies_to: InstitutionType[];
  evidence_quote: string;
  priority: "critical" | "high" | "medium" | "low";
  typical_effort_days: number;
  typical_cost_eur: string;
  country: CompleeCountryCode;
  authority: string;
  source_url: string;
  expected_evidence: string[];
};

const COUNTRY_TO_CODE: Partial<Record<Country, CompleeCountryCode>> = {
  France: "FR",
  Germany: "DE",
  Netherlands: "NL",
  Spain: "ES",
  "United Kingdom": "GB"
};

const AUTHORITY_SOURCE: Record<string, Requirement["sourceInstrument"]> = {
  FCA: "FCA guidance",
  BaFin: "BaFin guidance",
  ACPR: "ACPR guidance",
  DNB: "DNB guidance",
  "Banco de Espana": "Banco de Espana guidance"
};

const COMPANY_TYPES_BY_INSTITUTION: Record<InstitutionType, Requirement["relevantFor"]> = {
  EMI: ["Electronic Money Institution", "Neobank", "Wallet"],
  "Small EMI": ["Electronic Money Institution", "Wallet"],
  PI: ["Payment Institution", "Payment Orchestrator", "Neobank"],
  AISP: ["Open Banking Provider"],
  PISP: ["Open Banking Provider", "Payment Institution"]
};

export const COMPLEE_REQUIREMENTS: CompleeRequirement[] = [
  {
    id: "COMPLEE-GB-CASS15-DAILY-RECON",
    title: "CASS 15 daily safeguarding reconciliation",
    description:
      "Payment and e-money firms entering the UK need daily reconciliation evidence for safeguarded customer funds and board-owned exception handling.",
    regulation_reference: "FCA PS25/12; CASS 15",
    category: "safeguarding",
    applies_to: ["EMI", "Small EMI", "PI"],
    evidence_quote:
      "Daily reconciliation between safeguarded funds and customer balances from 7 May 2026.",
    priority: "critical",
    typical_effort_days: 25,
    typical_cost_eur: "30000",
    country: "GB",
    authority: "FCA",
    source_url:
      "https://www.fca.org.uk/publications/policy-statements/ps25-12-changes-safeguarding-regime-payments-and-e-money-firms",
    expected_evidence: [
      "daily safeguarding reconciliation log",
      "customer funds ledger and safeguarded account balance extract",
      "exception approval record",
      "board or senior management oversight minutes"
    ]
  },
  {
    id: "COMPLEE-GB-CONSUMER-DUTY",
    title: "Consumer Duty outcomes and board attestation",
    description:
      "UK expansion packs should evidence customer outcome monitoring, vulnerable customer handling and annual board accountability.",
    regulation_reference: "FCA PRIN 2A",
    category: "consumer_protection",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote:
      "Board must attest annually to delivering good outcomes for retail customers.",
    priority: "high",
    typical_effort_days: 12,
    typical_cost_eur: "15000",
    country: "GB",
    authority: "FCA",
    source_url: "https://www.fca.org.uk/firms/consumer-duty",
    expected_evidence: [
      "customer outcome monitoring dashboard",
      "vulnerable customer support procedure",
      "board attestation or governance minutes",
      "customer communication test evidence"
    ]
  },
  {
    id: "COMPLEE-GB-MLRO-APPOINTMENT",
    title: "MLRO appointment and financial-crime governance",
    description:
      "UK authorisation evidence should show accountable MLRO ownership, escalation routes and financial-crime reporting cadence.",
    regulation_reference: "MLR 2017, Reg 21",
    category: "aml_kyc",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote:
      "A relevant person must appoint a Money Laundering Reporting Officer.",
    priority: "high",
    typical_effort_days: 5,
    typical_cost_eur: "8000",
    country: "GB",
    authority: "FCA",
    source_url: "https://www.fca.org.uk/firms/financial-crime",
    expected_evidence: [
      "MLRO appointment record",
      "financial crime escalation procedure",
      "suspicious activity reporting workflow",
      "periodic compliance reporting pack"
    ]
  },
  {
    id: "COMPLEE-DE-ZAG-AUTHORISATION",
    title: "ZAG authorisation procedure",
    description:
      "German expansion requires a BaFin authorisation package aligned to ZAG licence scope, management reliability and governance evidence.",
    regulation_reference: "ZAG Sec. 10-11",
    category: "governance",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote: "Written authorisation from BaFin required under ZAG Sec. 10 or Sec. 11.",
    priority: "critical",
    typical_effort_days: 60,
    typical_cost_eur: "80000",
    country: "DE",
    authority: "BaFin",
    source_url:
      "https://www.bafin.de/EN/Aufsicht/ZahlungsdienstePSD2/ZulassungsverfahrenundLaufendeAufsicht/ZulassungsverfahrenundLaufendeAufsicht_node_en.html",
    expected_evidence: [
      "BaFin authorisation application checklist",
      "German licence scope mapping",
      "management reliability and fitness evidence",
      "local governance and outsourcing register"
    ]
  },
  {
    id: "COMPLEE-DE-MARISK-RISK",
    title: "MaRisk risk management framework",
    description:
      "BaFin-facing operating model should evidence risk-management responsibilities, internal controls and outsourced provider oversight.",
    regulation_reference: "BaFin Circular 09/2017",
    category: "operational_resilience",
    applies_to: ["EMI", "Small EMI", "PI"],
    evidence_quote: "Institutions must establish proper risk management under MaRisk.",
    priority: "high",
    typical_effort_days: 40,
    typical_cost_eur: "60000",
    country: "DE",
    authority: "BaFin",
    source_url: "https://www.bafin.de",
    expected_evidence: [
      "MaRisk-aligned risk control framework",
      "outsourcing risk assessment",
      "operational incident register",
      "internal control test evidence"
    ]
  },
  {
    id: "COMPLEE-FR-ACPR-LICENCE",
    title: "ACPR payment institution licence application",
    description:
      "French authorisation packs should evidence licence perimeter, programme of operations, governance and safeguarding arrangements.",
    regulation_reference: "Code monetaire et financier L.522-6",
    category: "governance",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote:
      "EMI authorisation granted by ACPR under the French Monetary and Financial Code.",
    priority: "critical",
    typical_effort_days: 50,
    typical_cost_eur: "70000",
    country: "FR",
    authority: "ACPR",
    source_url: "https://acpr.banque-france.fr/en",
    expected_evidence: [
      "ACPR licence application checklist",
      "programme of operations",
      "governance and internal control file",
      "safeguarding and own-funds evidence"
    ]
  },
  {
    id: "COMPLEE-NL-DNB-INTEGRITY",
    title: "DNB integrity screening and governance evidence",
    description:
      "Dutch market entry should evidence integrity screening, governance, AML ownership and incident escalation.",
    regulation_reference: "Wft Art. 3:8",
    category: "governance",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote: "Dutch financial institutions must evidence fit and proper integrity.",
    priority: "high",
    typical_effort_days: 15,
    typical_cost_eur: "20000",
    country: "NL",
    authority: "DNB",
    source_url: "https://www.dnb.nl/en",
    expected_evidence: [
      "DNB integrity screening file",
      "management fitness and propriety evidence",
      "AML ownership matrix",
      "incident escalation and reporting procedure"
    ]
  },
  {
    id: "COMPLEE-ES-BDE-REGISTER",
    title: "Banco de Espana payment services registration",
    description:
      "Spanish expansion packs should map service scope, local registration evidence and customer transparency controls.",
    regulation_reference: "Royal Decree-law 19/2018",
    category: "reporting",
    applies_to: ["EMI", "Small EMI", "PI", "AISP", "PISP"],
    evidence_quote:
      "Payment service providers must evidence registration and conduct controls.",
    priority: "high",
    typical_effort_days: 25,
    typical_cost_eur: "25000",
    country: "ES",
    authority: "Banco de Espana",
    source_url: "https://www.bde.es/wbe/en",
    expected_evidence: [
      "Spanish service registration checklist",
      "local customer terms and fee disclosures",
      "complaints handling procedure",
      "regulatory reporting owner matrix"
    ]
  }
];

export function getCompleeExpansionRequirements(
  profile: CompanyProfile
): Requirement[] {
  const targetCountry = getTargetCountry(profile);
  const targetCode = COUNTRY_TO_CODE[targetCountry];
  const institutionType = profile.institutionType ?? "PI";

  if (!targetCode) {
    return [];
  }

  return COMPLEE_REQUIREMENTS.filter(
    (requirement) =>
      requirement.country === targetCode &&
      requirement.applies_to.includes(institutionType)
  ).map(mapCompleeRequirementToRequirement);
}

export function mapCompleeRequirementToRequirement(
  requirement: CompleeRequirement
): Requirement {
  return {
    id: requirement.id,
    domain: `${requirement.authority} Expansion`,
    title: requirement.title,
    summary: requirement.description,
    expectedEvidence: requirement.expected_evidence,
    impactAreas: impactAreasForCategory(requirement.category),
    priority: mapPriority(requirement.priority),
    relevantFor: requirement.applies_to.flatMap(
      (institution) => COMPANY_TYPES_BY_INSTITUTION[institution]
    ),
    sourceInstrument:
      AUTHORITY_SOURCE[requirement.authority] ?? "Complee regulatory source",
    sourceReference: `${requirement.regulation_reference}; effort ${requirement.typical_effort_days} days; estimated advisory cost ${requirement.typical_cost_eur} EUR`,
    sourceUrl: requirement.source_url
  };
}

export function isCrossBorderProfile(profile: CompanyProfile): boolean {
  return profile.assessmentMode === "cross_border";
}

export function getHomeCountry(profile: CompanyProfile): Country {
  return profile.homeCountry ?? profile.country;
}

export function getTargetCountry(profile: CompanyProfile): Country {
  return profile.targetCountry ?? profile.country;
}

function mapPriority(priority: CompleeRequirement["priority"]): Priority {
  const priorities: Record<CompleeRequirement["priority"], Priority> = {
    critical: "Critical",
    high: "High",
    medium: "Medium",
    low: "Low"
  };

  return priorities[priority];
}

function impactAreasForCategory(category: string): string[] {
  if (category.includes("safeguarding")) return ["Finance", "Compliance", "Operations"];
  if (category.includes("operational")) return ["Engineering", "Risk", "Compliance"];
  if (category.includes("consumer")) return ["Product", "Support", "Compliance"];
  if (category.includes("aml")) return ["Compliance", "Financial Crime", "Operations"];
  if (category.includes("reporting")) return ["Operations", "Compliance"];
  return ["Compliance", "Legal", "Operations"];
}
