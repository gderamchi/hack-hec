export const COMPANY_TYPES = [
  "Payment Institution",
  "Electronic Money Institution",
  "Wallet",
  "Neobank",
  "Open Banking Provider",
  "Payment Orchestrator",
  "Technical Service Provider",
  "Online Platform",
  "Electronic Communications Provider",
  "Crypto-asset Service Provider",
  "Retail Cash Provider",
  "Independent ATM Deployer"
] as const;

export const COUNTRIES = [
  "France",
  "Germany",
  "Spain",
  "Italy",
  "Netherlands",
  "Other EU"
] as const;

export const SERVICES = [
  "Instant credit transfers",
  "Wallet transfers",
  "Card payments",
  "Open banking account access",
  "Payment initiation",
  "Merchant acquiring",
  "Electronic money issuance",
  "Multi-currency transfers",
  "Cash withdrawal support",
  "Fraud monitoring",
  "Strong customer authentication",
  "Payment account provision to payment institutions",
  "Mobile wallet front-end services",
  "Financial services advertising",
  "Online platform fraud-content handling"
] as const;

export const STATUSES = [
  "Covered",
  "Partially covered",
  "Not evidenced",
  "Needs human review"
] as const;

export const PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;

export type CompanyType = (typeof COMPANY_TYPES)[number];
export type Country = (typeof COUNTRIES)[number];
export type ServiceFlow = (typeof SERVICES)[number];
export type RequirementStatus = (typeof STATUSES)[number];
export type Priority = (typeof PRIORITIES)[number];

export type CompanyProfile = {
  companyName: string;
  companyType: CompanyType;
  country: Country;
  services: ServiceFlow[];
};

export type UploadedDocument = {
  name: string;
  type: string;
  content: string;
};

export type Requirement = {
  id: string;
  domain: string;
  title: string;
  summary: string;
  expectedEvidence: string[];
  impactAreas: string[];
  priority: Priority;
  relevantFor: string[];
  serviceTriggers?: ServiceFlow[];
  sourceInstrument:
    | "PSD3 proposal"
    | "PSR proposal"
    | "PSD3/PSR provisional agreement"
    | "Instant Payments Regulation"
    | "EBA fraud opinion"
    | "EBA-ECB fraud report";
  sourceReference: string;
  sourceUrl: string;
};

export type EvidenceMatrixItem = {
  requirementId: string;
  domain: string;
  requirementTitle: string;
  regulatoryReference?: string;
  sourceUrl?: string;
  status: RequirementStatus;
  evidenceFound: string;
  sourceDocument?: string;
  evidenceExcerpt?: string;
  missingEvidence: string[];
  priority: Priority;
  confidence: number;
  recommendedTask: string;
};

export type RoadmapTask = {
  title: string;
  owner: string;
  priority: Priority;
  deadline: "30 days" | "60 days" | "90 days" | "180 days";
  evidenceRequired: string[];
  acceptanceCriteria: string;
  linkedRequirementIds: string[];
};

export type AnalysisSummary = {
  totalRequirements: number;
  covered: number;
  partiallyCovered: number;
  notEvidenced: number;
  needsHumanReview: number;
};

export type AnalysisResult = {
  runId: string;
  summary: AnalysisSummary;
  matrix: EvidenceMatrixItem[];
  roadmap: RoadmapTask[];
  disclaimer: string;
  diagnostics?: AnalysisDiagnostics;
};

export type AnalysisEngine = "openai" | "fallback";

export type PersistenceStatus = "saved" | "skipped" | "failed";

export type AnalysisDiagnostics = {
  engine: AnalysisEngine;
  model?: string;
  reasoningEffort?: string;
  generatedAt: string;
  warnings: string[];
  persistence: {
    status: PersistenceStatus;
    detail: string;
  };
  regulatorySources: Array<{
    label: string;
    url: string;
  }>;
};

export const EMPTY_COMPANY_PROFILE: CompanyProfile = {
  companyName: "",
  companyType: "Payment Institution",
  country: "France",
  services: []
};

export const DISCLAIMER =
  "This workspace provides AI-assisted PSD3/PSR readiness assessments. It is not legal advice and does not certify compliance.";
