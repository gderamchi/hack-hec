import { PRODUCT_CONFIG } from "@/lib/app-config";
import {
  activeRegulationsForProfile,
  mapCompanyProfileToOperatingModel
} from "@/lib/profile-mapper";
import type {
  AnalysisResult,
  CompanyProfile,
  InstitutionType,
  Priority,
  RequirementStatus,
  ServiceFlow,
  UploadedDocument
} from "@/lib/types";

export type CompleeCountryCode = "FR" | "DE" | "NL" | "ES" | "GB";

export type CompleeProfile = {
  companyName: string;
  homeCountry: CompleeCountryCode;
  targetCountry: CompleeCountryCode;
  institutionType: InstitutionType;
};

export type CompleeDocument = UploadedDocument & {
  id: string;
  pages?: number;
  sample?: boolean;
};

export type AgentSeedStatus = {
  state: "idle" | "saving" | "saved" | "error";
  message: string;
};

export const COUNTRY_OPTIONS: Array<{
  code: CompleeCountryCode;
  country: CompanyProfile["country"];
  authority: string;
}> = [
  { code: "FR", country: "France", authority: "ACPR" },
  { code: "DE", country: "Germany", authority: "BaFin" },
  { code: "NL", country: "Netherlands", authority: "DNB" },
  { code: "ES", country: "Spain", authority: "Banco de Espana" },
  { code: "GB", country: "United Kingdom", authority: "FCA" }
];

export const INSTITUTION_OPTIONS: Array<{
  value: InstitutionType;
  label: string;
}> = [
  { value: "EMI", label: "E-Money Institution (EMI)" },
  { value: "Small EMI", label: "Small EMI" },
  { value: "PI", label: "Payment Institution (PI)" },
  { value: "AISP", label: "Account Information Service Provider (AISP)" },
  { value: "PISP", label: "Payment Initiation Service Provider (PISP)" }
];

export const SERVICE_GROUPS: Array<{
  title: string;
  description: string;
  options: string[];
}> = [
  {
    title: "Money and accounts",
    description: "Core financial products you offer to customers.",
    options: ["E-money issuance", "Payment accounts", "Safeguarded customer funds"]
  },
  {
    title: "Payments and cards",
    description: "How money moves in and out of your platform.",
    options: [
      "Card issuing",
      "Payment initiation",
      "Cross-border transfers",
      "Merchant acquiring"
    ]
  },
  {
    title: "Open banking and controls",
    description: "Data access, fraud monitoring and authentication controls.",
    options: [
      "Account information",
      "Fraud monitoring",
      "Strong customer authentication"
    ]
  }
];

export const REGULATION_GROUPS: Array<{
  title: string;
  description: string;
  options: string[];
}> = [
  {
    title: "Payments regulation",
    description: "Core frameworks governing payment services and electronic money.",
    options: ["PSD2", "PSD3 / PSR", "SCA / RTS", "EMD2"]
  },
  {
    title: "Operational resilience",
    description: "ICT risk, incident reporting, and third-party controls.",
    options: ["DORA", "ICT risk controls", "Incident reporting"]
  },
  {
    title: "Financial crime",
    description: "Anti-money laundering and customer due diligence.",
    options: ["AMLD6", "MLR 2017", "KYC / CDD"]
  },
  {
    title: "Data and consumer",
    description: "Data protection and consumer-facing obligations.",
    options: ["GDPR", "Consumer Duty", "Outsourcing / TPR"]
  }
];

export const DEFAULT_COMPLEE_PROFILE: CompleeProfile = {
  companyName: "FlowPay",
  homeCountry: "FR",
  targetCountry: "GB",
  institutionType: "EMI"
};

export const DEFAULT_SELECTED_SERVICES = [
  "E-money issuance",
  "Card issuing",
  "Payment initiation",
  "Account information",
  "Fraud monitoring",
  "Strong customer authentication"
];

export const DEFAULT_SELECTED_REGULATIONS = ["PSD2", "PSD3 / PSR", "DORA", "GDPR"];

export const SAMPLE_DOCUMENTS: CompleeDocument[] = [
  {
    id: "sample-authorisation",
    name: "FlowPay EMI Authorisation Dossier.pdf",
    type: "application/pdf",
    pages: 84,
    sample: true,
    content: [
      "FlowPay authorisation licence service scope application checklist target market competent authority registration.",
      "The dossier covers regulated service scope, own funds, initial capital, budget forecast, passporting and outsourcing.",
      "It includes governance, internal control, board oversight, risk management, complaints, customer outcome and integrity screening."
    ].join("\n")
  },
  {
    id: "sample-aml",
    name: "FlowPay AML Risk Assessment France.pdf",
    type: "application/pdf",
    pages: 32,
    sample: true,
    content: [
      "The MLRO owns financial crime escalation, suspicious activity reporting, transaction monitoring and fraud policy.",
      "Controls include risk score, scam warning, suspicious transaction freeze, fraud reporting, customer education and incident handling.",
      "The APP fraud playbook covers authorised push payment, impersonation, social engineering, police report, unauthorised transaction, reimbursement and liability."
    ].join("\n")
  },
  {
    id: "sample-safeguarding",
    name: "FlowPay Safeguarding Policy.pdf",
    type: "application/pdf",
    pages: 18,
    sample: true,
    content: [
      "The safeguarding policy covers customer funds, segregated account, reconciliation, concentration risk and electronic money.",
      "Daily safeguarding reconciliation logs are reviewed by compliance and the board.",
      "Operational dashboards track audit event evidence and exception approval."
    ].join("\n")
  },
  {
    id: "sample-ict",
    name: "FlowPay ICT Risk Register.pdf",
    type: "application/pdf",
    pages: 24,
    sample: true,
    content: [
      "The open banking dedicated interface documents consent, permission dashboard, revoke access, third-party provider, TPP, ASPSP and data access.",
      "The payment execution specification covers payment initiation, credit transfer, beneficiary, payee, unique identifier, IBAN, confirmation of payee, mismatch, spending limit and audit.",
      "The SCA policy covers strong customer authentication, SCA, MFA, 2FA, biometric, one-time passcode, risk assessment, exemption, fallback, failed authentication, accessibility and non-smartphone access.",
      "Mobile front-end evidence covers FRAND, fair reasonable and non-discriminatory access, mobile device controls, payment data storage, payment data transfer and wallet front-end dependencies."
    ].join("\n")
  },
  {
    id: "sample-complaints",
    name: "FlowPay Complaints Handling Procedure.pdf",
    type: "application/pdf",
    pages: 12,
    sample: true,
    content: [
      "Customer terms describe terms, fee, fees, charges, currency conversion, exchange rate, payment status, receipt, dispute and alternative dispute resolution ADR.",
      "Support procedures cover human support, complaint, refund, reimbursement, liability and customer communication.",
      "Card payment and merchant acquiring controls include scheme fee, interchange, chargeback, unauthorised, unauthorized, merchant fee and card funding.",
      "Privacy governance includes data protection impact assessment, DPIA, fraud data, information sharing, data minimisation, GDPR, retention and supervisory authority."
    ].join("\n")
  }
];

const COUNTRY_BY_CODE: Record<CompleeCountryCode, CompanyProfile["country"]> = {
  FR: "France",
  DE: "Germany",
  NL: "Netherlands",
  ES: "Spain",
  GB: "United Kingdom"
};

const SERVICE_MAP: Record<string, ServiceFlow[]> = {
  "E-money issuance": ["Electronic money issuance"],
  "Payment accounts": ["Wallet transfers"],
  "Safeguarded customer funds": ["Electronic money issuance"],
  "Card issuing": ["Card payments"],
  "Payment initiation": ["Payment initiation"],
  "Cross-border transfers": ["Multi-currency transfers"],
  "Merchant acquiring": ["Merchant acquiring"],
  "Account information": ["Open banking account access"],
  "Fraud monitoring": ["Fraud monitoring"],
  "Strong customer authentication": ["Strong customer authentication"],
  "Wallet accounts": ["Wallet transfers"],
  "Open banking AISP": ["Open banking account access"]
};

export function countryName(code: CompleeCountryCode): CompanyProfile["country"] {
  return COUNTRY_BY_CODE[code];
}

export function countryAuthority(code: CompleeCountryCode): string {
  return COUNTRY_OPTIONS.find((country) => country.code === code)?.authority ?? code;
}

export function companyTypeForInstitution(
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

export function mapSelectedServices(selectedServices: string[]): ServiceFlow[] {
  const mapped = selectedServices.flatMap((service) => SERVICE_MAP[service] ?? []);
  return Array.from(new Set(mapped));
}

export function toCompanyProfile(
  profile: CompleeProfile,
  selectedServices: string[]
): CompanyProfile {
  const services = mapSelectedServices(selectedServices);

  return {
    companyName: profile.companyName.trim(),
    companyType: companyTypeForInstitution(profile.institutionType),
    institutionType: profile.institutionType,
    country: countryName(profile.homeCountry),
    homeCountry: countryName(profile.homeCountry),
    targetCountry: countryName(profile.targetCountry),
    assessmentMode: profile.homeCountry === profile.targetCountry ? "psd3_psr" : "cross_border",
    services
  };
}

export function activeRegulationsForFrontend(
  profile: CompleeProfile,
  selectedServices: string[],
  selectedRegulations: string[]
): string[] {
  const base = new Set(
    activeRegulationsForProfile(toCompanyProfile(profile, selectedServices))
  );

  for (const regulation of selectedRegulations) {
    if (regulation.includes("PSD")) base.add("PSD3/PSR");
    if (regulation === "DORA" || regulation.includes("ICT")) base.add("DORA");
    if (regulation === "Consumer Duty") base.add("FCA Consumer Duty");
    if (regulation.includes("AI")) base.add("EU AI Act");
  }

  if (profile.targetCountry === "GB") {
    base.add("FCA Consumer Duty");
  }

  return Array.from(base);
}

export function toAgentProfilePayload(
  profile: CompleeProfile,
  selectedServices: string[],
  selectedRegulations: string[]
) {
  const companyProfile = toCompanyProfile(profile, selectedServices);

  return {
    operatingModel: mapCompanyProfileToOperatingModel(companyProfile),
    activeRegulations: activeRegulationsForFrontend(
      profile,
      selectedServices,
      selectedRegulations
    )
  };
}

export function documentsForAnalysis(documents: CompleeDocument[]): UploadedDocument[] {
  return documents.map(({ name, type, content }) => ({ name, type, content }));
}

export function readinessScore(result: AnalysisResult | null): number {
  if (!result || result.summary.totalRequirements === 0) return 0;
  return Math.round(
    ((result.summary.covered + result.summary.partiallyCovered * 0.5) /
      result.summary.totalRequirements) *
      100
  );
}

export function statusTone(status: RequirementStatus): string {
  if (status === "Covered") return "success";
  if (status === "Partially covered") return "warn";
  if (status === "Not evidenced") return "danger";
  return "brand";
}

export function priorityTone(priority: Priority): string {
  if (priority === "Critical") return "danger";
  if (priority === "High") return "warn";
  if (priority === "Medium") return "brand";
  return "muted";
}

export function downloadAnalysisCsv(result: AnalysisResult) {
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

  downloadBlob(
    rows.map((row) => row.map(escapeCsv).join(",")).join("\n"),
    "text/csv;charset=utf-8",
    `${PRODUCT_CONFIG.csvPrefix}-${result.runId}.csv`
  );
}

export function downloadSubmissionPack(
  result: AnalysisResult,
  profile: CompleeProfile,
  selectedServices: string[],
  documents: CompleeDocument[]
) {
  const companyProfile = toCompanyProfile(profile, selectedServices);
  const pack = {
    generatedAt: new Date().toISOString(),
    product: PRODUCT_CONFIG.name,
    runId: result.runId,
    coverLetter: {
      title: `${profile.companyName} expansion readiness pack`,
      companyName: profile.companyName,
      corridor: {
        homeCountry: countryName(profile.homeCountry),
        targetCountry: countryName(profile.targetCountry)
      },
      disclaimer: result.disclaimer
    },
    companyProfile,
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
    diagnostics: result.diagnostics ?? null
  };

  downloadBlob(
    JSON.stringify(pack, null, 2),
    "application/json;charset=utf-8",
    `${PRODUCT_CONFIG.csvPrefix}-submission-pack-${result.runId}.json`
  );
}

function downloadBlob(content: string, type: string, filename: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
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
