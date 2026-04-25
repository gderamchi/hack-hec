import { PSD3_PSR_REQUIREMENTS } from "@/data/psd3-psr-requirements";
import {
  DISCLAIMER,
  type AnalysisResult,
  type CompanyProfile,
  type EvidenceMatrixItem,
  type Priority,
  type Requirement,
  type RequirementStatus,
  type RoadmapTask,
  type UploadedDocument
} from "@/lib/types";

type KeywordRule = {
  keywords: string[];
  strongKeywords?: string[];
  task: string;
  owner: string;
};

type EvidenceHit = {
  sourceDocument: string;
  excerpt: string;
  matchedKeyword: string;
};

const RULES: Record<string, KeywordRule> = {
  "PSR-PAYEE-001": {
    keywords: [
      "payee verification",
      "payee-name",
      "payee name",
      "beneficiary name check",
      "beneficiary name verification",
      "iban-name",
      "iban matching",
      "confirmation of payee",
      "match result",
      "close match",
      "name mismatch"
    ],
    strongKeywords: ["match result", "close match", "mismatch warning", "beneficiary verification"],
    task: "Add payee-name verification before transfer execution",
    owner: "Product + Engineering"
  },
  "PSR-FRAUD-001": {
    keywords: ["fraud policy", "fraud engine", "fraud operations", "case management"],
    strongKeywords: ["risk score", "manual review", "control register"],
    task: "Strengthen fraud-control evidence pack and warning triggers",
    owner: "Fraud Operations"
  },
  "PSR-TXN-001": {
    keywords: ["transaction monitoring", "risk score", "velocity", "alert"],
    strongKeywords: ["threshold", "rules", "false positive"],
    task: "Document transaction monitoring thresholds and alert review evidence",
    owner: "Fraud Data"
  },
  "PSR-WARN-001": {
    keywords: ["customer warning", "scam warning", "warning flow", "risk warning", "impersonation warning"],
    strongKeywords: ["mismatch warning", "warning shown", "warning audit", "dynamic warning"],
    task: "Create customer warning flow for suspected payment fraud",
    owner: "Product + Fraud"
  },
  "PSR-APPFRAUD-001": {
    keywords: ["authorised push payment", "authorized push payment", "app fraud", "impersonation", "social engineering"],
    strongKeywords: ["liability assessment", "impersonation scenario", "consumer was manipulated", "deception"],
    task: "Define APP fraud liability and reimbursement decision flow",
    owner: "Compliance + Fraud"
  },
  "PSR-LIAB-001": {
    keywords: ["unauthorized payment", "unauthorised payment", "refund", "reimbursement", "liability", "incorrectly executed"],
    strongKeywords: ["reimbursement workflow", "liability decision", "refund decision", "refusal justification"],
    task: "Define customer reimbursement workflow for payment fraud and errors",
    owner: "Compliance + Customer Support"
  },
  "PSR-TRANS-001": {
    keywords: ["payment status", "confirmation receipt", "support reference", "acknowledgement email", "fees", "currency conversion"],
    strongKeywords: ["risk disclosure", "dispute options", "fee disclosure", "estimated time"],
    task: "Create customer transparency copy for risk, status and dispute outcomes",
    owner: "Product Operations"
  },
  "PSR-INC-001": {
    keywords: ["escalated", "incident channel", "fraud ticket", "triage", "severe cases"],
    strongKeywords: ["severity", "sla", "post-incident", "incident review"],
    task: "Formalize fraud incident severity, SLA and post-incident review process",
    owner: "Fraud Operations"
  },
  "PSD3-SCA-001": {
    keywords: ["strong customer authentication", "sca", "mfa", "2fa", "biometric"],
    strongKeywords: ["step-up", "authentication events", "one-time passcode"],
    task: "Complete SCA evidence for payment and account access journeys",
    owner: "Security Engineering"
  },
  "PSD3-SCA-002": {
    keywords: ["exemption", "fallback", "failed authentication", "retry"],
    strongKeywords: ["risk acceptance", "fallback procedure", "exemption policy"],
    task: "Clarify SCA fallback and exemption logic",
    owner: "Security + Compliance"
  },
  "PSD3-SCA-003": {
    keywords: ["accessibility", "older users", "disabilities", "no smartphone", "low digital skills"],
    strongKeywords: ["accessible sca", "non-smartphone", "customer support fallback", "accessibility testing"],
    task: "Add accessible SCA options and test evidence",
    owner: "Product + Security"
  },
  "PSD3-OB-001": {
    keywords: ["dedicated interface", "api latency", "success rate", "connector availability", "third-party access"],
    strongKeywords: ["availability target", "monitoring dashboard", "status updates", "interface conformance"],
    task: "Add open banking dedicated-interface availability evidence",
    owner: "Platform Engineering"
  },
  "PSD3-OB-002": {
    keywords: ["permission dashboard", "active consent list", "revoke access", "manage permissions"],
    strongKeywords: ["user dashboard", "customer-facing dashboard"],
    task: "Build user permission dashboard for open banking consents",
    owner: "Product + Engineering"
  },
  "PSD3-OB-003": {
    keywords: ["consent creation", "consent status", "granted scopes", "expiry date", "consent revocation"],
    strongKeywords: ["consent audit", "scope model", "consent renewal", "revocation audit"],
    task: "Complete open banking consent lifecycle evidence",
    owner: "Open Banking Product"
  },
  "PSR-DATA-001": {
    keywords: ["data protection impact assessment", "dpia", "information sharing", "fraud data", "personal data"],
    strongKeywords: ["data minimisation", "supervisory authority", "sharing arrangement", "gdpr"],
    task: "Document fraud data-sharing governance and DPIA evidence",
    owner: "Legal + Fraud Data"
  },
  "PSD3-LIC-001": {
    keywords: ["electronic money institution", "regulated", "outsourcing", "governance"],
    strongKeywords: ["operational readiness register", "regulated service scope", "control inventory"],
    task: "Create operational readiness register for regulated payment services",
    owner: "Compliance Leadership"
  },
  "PSD3-SAFE-001": {
    keywords: ["safeguarding", "customer funds", "segregated account", "reconciliation"],
    strongKeywords: ["concentration risk", "safeguarding policy", "daily reconciliation", "board oversight"],
    task: "Evidence safeguarding and reconciliation controls for customer funds",
    owner: "Finance + Compliance"
  },
  "PSR-CASH-001": {
    keywords: ["cash withdrawal", "atm", "merchant withdrawal", "cash access"],
    strongKeywords: ["withdrawal fee", "withdrawal receipt", "cash disclosure"],
    task: "Document cash withdrawal disclosures and support handling",
    owner: "Product Operations"
  },
  "PSR-INSTANT-001": {
    keywords: ["instant payment", "instant credit transfer", "beneficiary verification", "receive instant"],
    strongKeywords: ["fee parity", "instant reachability", "send and receive", "verification of beneficiary"],
    task: "Evidence instant-payment reachability and beneficiary verification",
    owner: "Payments Engineering"
  },
  "PSR-AUDIT-001": {
    keywords: ["audit events", "authentication events", "logs", "ticket notes", "decision history"],
    strongKeywords: ["retention policy", "audit log schema", "export workflow"],
    task: "Define audit retention and review workflow for payment decisions",
    owner: "Engineering + Compliance"
  },
  "PSR-LIMIT-001": {
    keywords: ["spending limit", "payment limit", "blocking measure", "block payment", "freeze card"],
    strongKeywords: ["customer limit", "fraud block", "instrument blocking", "limit configuration"],
    task: "Add customer spending limits and payment blocking controls",
    owner: "Product + Fraud"
  },
  "PSR-SUSPICIOUS-001": {
    keywords: ["suspicious transaction", "freeze transaction", "incoming transaction hold", "receiving psp"],
    strongKeywords: ["freeze workflow", "release approval", "incoming hold", "suspicious incoming"],
    task: "Define receiving-PSP suspicious transaction freeze workflow",
    owner: "Fraud Operations"
  },
  "PSR-IMPERSONATION-001": {
    keywords: ["impersonation fraud", "psp employee", "spoofing", "police report", "social engineering"],
    strongKeywords: ["full refund", "police report", "psp notification", "impersonation reimbursement"],
    task: "Implement PSP impersonation fraud refund process",
    owner: "Compliance + Fraud"
  },
  "PSR-UNAUTH-001": {
    keywords: ["unauthorised transaction", "unauthorized transaction", "altered transaction", "fraudster initiated"],
    strongKeywords: ["full fraudulent amount", "fraudster changed", "fraudster initiated", "unauthorised classification"],
    task: "Classify fraudster-initiated or altered transactions as unauthorised",
    owner: "Compliance + Support"
  },
  "PSR-HUMAN-001": {
    keywords: ["human support", "support agent", "phone support", "manual support", "chatbot handoff"],
    strongKeywords: ["not only chatbot", "human escalation", "live agent", "support hours"],
    task: "Add human support access and chatbot handoff evidence",
    owner: "Customer Support"
  },
  "PSR-ADR-001": {
    keywords: ["alternative dispute resolution", "adr", "ombudsman", "consumer dispute"],
    strongKeywords: ["adr procedure", "dispute body", "consumer chooses", "case handoff"],
    task: "Document alternative dispute resolution participation",
    owner: "Legal + Compliance"
  },
  "PSR-FEE-001": {
    keywords: ["fee disclosure", "currency conversion", "charges", "fixed fee", "exchange rate"],
    strongKeywords: ["before initiation", "pre-payment", "pre initiation", "charge calculation"],
    task: "Evidence pre-initiation fee and FX disclosures",
    owner: "Product + Compliance"
  },
  "PSR-CASH-002": {
    keywords: ["retail cash withdrawal", "cash without purchase", "cash withdrawal without purchase"],
    strongKeywords: ["minimum withdrawal", "maximum withdrawal", "no purchase", "retail store withdrawal"],
    task: "Define retail cash withdrawal without-purchase flow",
    owner: "Product Operations"
  },
  "PSR-ATM-001": {
    keywords: ["atm fee", "atm exchange rate", "cash withdrawal fee", "cash disclosure"],
    strongKeywords: ["before withdrawal", "fee pre-disclosure", "exchange-rate display", "atm receipt"],
    task: "Display ATM fees and exchange rates before withdrawal",
    owner: "Product + Compliance"
  },
  "PSR-OB-004": {
    keywords: ["prohibited obstacle", "open banking obstacle", "third-party provider access", "non-discrimination"],
    strongKeywords: ["obstacle assessment", "access denial", "aspsp interface", "data access test"],
    task: "Remove prohibited obstacles to open banking data access",
    owner: "Platform Engineering"
  },
  "PSD3-ACCOUNT-001": {
    keywords: ["payment account access", "non-discriminatory account", "payment institution account", "refusal criteria"],
    strongKeywords: ["objective onboarding", "account access sla", "non-discriminatory basis", "restriction audit"],
    task: "Document non-discriminatory account access for payment institutions",
    owner: "Banking Operations"
  },
  "PSR-MOBILE-001": {
    keywords: ["frand", "mobile device", "front-end service provider", "payment data storage", "electronic service"],
    strongKeywords: ["fair reasonable and non-discriminatory", "vendor restriction", "front-end access"],
    task: "Evidence FRAND access for mobile payment front ends",
    owner: "Product + Legal"
  },
  "PSD3-AUTH-001": {
    keywords: ["authorisation application", "authorization application", "own-funds", "initial capital", "budget forecast"],
    strongKeywords: ["prudential", "capital requirement", "business plan", "service-by-service risk"],
    task: "Complete PSD3 authorisation and prudential evidence pack",
    owner: "Compliance Leadership"
  },
  "PSD3-TRANSITION-001": {
    keywords: ["transition", "re-authorisation", "reauthorisation", "existing licence", "existing license"],
    strongKeywords: ["transitional deadline", "licence inventory", "application timeline", "gap assessment"],
    task: "Plan PSD3 re-authorisation for existing licensed activities",
    owner: "Legal + Compliance"
  },
  "PSD3-PASSPORT-001": {
    keywords: ["passporting", "freedom to provide services", "right of establishment", "branch", "agent register"],
    strongKeywords: ["host member state", "competent authority", "services notification", "branch register"],
    task: "Maintain passporting and cross-border services evidence",
    owner: "Compliance Operations"
  },
  "PSR-PLATFORM-001": {
    keywords: ["fraudulent content", "online platform", "takedown", "digital services act", "platform liability"],
    strongKeywords: ["platform notification", "remove fraudulent content", "recovery workflow", "dsa escalation"],
    task: "Create platform fraud-content notification and recovery workflow",
    owner: "Fraud + Legal"
  },
  "PSR-ADS-001": {
    keywords: ["financial services advertising", "advertiser authorisation", "advertiser authorization", "platform submission"],
    strongKeywords: ["legal authorisation", "country approval", "marketing legal review", "exemption evidence"],
    task: "Evidence authorisation for financial services advertising",
    owner: "Marketing + Legal"
  },
  "PSR-EDU-001": {
    keywords: ["fraud education", "awareness", "scam guidance", "avoid fraud", "customer education"],
    strongKeywords: ["impersonation scam", "campaign", "in-product awareness", "effectiveness"],
    task: "Launch and evidence customer fraud education measures",
    owner: "Fraud + Customer Support"
  },
  "PSR-FRAUD-REPORT-001": {
    keywords: ["fraud reporting", "fraud statistics", "fraud data", "payment instrument taxonomy"],
    strongKeywords: ["semi-annual reporting", "competent authority", "fraud trend", "reporting workflow"],
    task: "Build fraud data reporting and trend review evidence",
    owner: "Fraud Data + Compliance"
  }
};

const DOCUMENT_GAP_HINTS: Record<string, string[]> = {
  "PSR-PAYEE-001": [
    "No payee-name verification or IBAN-name matching flow was found.",
    "No customer copy for beneficiary mismatch cases was found.",
    "No match, close-match and mismatch test cases were found."
  ],
  "PSR-WARN-001": [
    "No customer warning flow was found for suspected payment fraud.",
    "No scam warning trigger conditions were found.",
    "No audit event proving a warning was shown was found."
  ],
  "PSR-APPFRAUD-001": [
    "No APP fraud or impersonation decision tree was found.",
    "No liability assessment criteria for manipulated authorised payments were found.",
    "No customer outcome template for impersonation fraud was found."
  ],
  "PSD3-SCA-002": [
    "SCA is mentioned, but exemption criteria are unclear.",
    "Fallback ownership and risk acceptance criteria are missing.",
    "Failed authentication handling is only partially described."
  ],
  "PSD3-SCA-003": [
    "No accessible SCA alternative was found for users without smartphone access.",
    "No evidence was found for disabled, older or low-digital-skill users.",
    "No support fallback path for SCA accessibility was found."
  ],
  "PSD3-OB-002": [
    "Open banking consent exists, but no user permission dashboard was found.",
    "No active consent list or self-service revoke action was found."
  ],
  "PSR-LIAB-001": [
    "Fraud tickets are described, but reimbursement and liability decisions are not defined.",
    "No customer communication template for reimbursement outcomes was found."
  ]
};

export function runFallbackAnalysis(
  companyProfile: CompanyProfile,
  documents: UploadedDocument[]
): AnalysisResult {
  const relevantRequirements = PSD3_PSR_REQUIREMENTS.filter((requirement) =>
    isRelevantRequirement(requirement, companyProfile)
  );
  const matrix = relevantRequirements.map((requirement) =>
    analyzeRequirement(requirement, documents)
  );
  const summary = summarize(matrix);

  return {
    runId: createRunId(),
    summary,
    matrix,
    roadmap: createRoadmap(matrix),
    disclaimer: DISCLAIMER
  };
}

function analyzeRequirement(
  requirement: Requirement,
  documents: UploadedDocument[]
): EvidenceMatrixItem {
  const rule = RULES[requirement.id];
  const hit = findEvidence(documents, rule?.keywords ?? [requirement.title]);
  const strongHit = findEvidence(documents, rule?.strongKeywords ?? []);
  const status = inferStatus(requirement.id, hit, strongHit);
  const missingEvidence = missingForRequirement(requirement, status, Boolean(strongHit));

  return {
    requirementId: requirement.id,
    domain: requirement.domain,
    requirementTitle: requirement.title,
    regulatoryReference: `${requirement.sourceInstrument}: ${requirement.sourceReference}`,
    sourceUrl: requirement.sourceUrl,
    status,
    evidenceFound: hit
      ? `Evidence found in ${hit.sourceDocument}: ${hit.excerpt}`
      : "Not evidenced in the uploaded documents",
    sourceDocument: hit?.sourceDocument,
    evidenceExcerpt: hit?.excerpt,
    missingEvidence,
    priority: requirement.priority,
    confidence: confidenceFor(status, Boolean(hit), Boolean(strongHit)),
    recommendedTask: rule?.task ?? `Create evidence pack for ${requirement.title}`
  };
}

function inferStatus(
  requirementId: string,
  hit: EvidenceHit | undefined,
  strongHit: EvidenceHit | undefined
): RequirementStatus {
  if (!hit) {
    return "Not evidenced";
  }

  if (requirementId === "PSR-PAYEE-001") return "Partially covered";
  if (requirementId === "PSR-FRAUD-001") return "Partially covered";
  if (requirementId === "PSD3-SCA-001") return "Partially covered";
  if (requirementId === "PSD3-SCA-002") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSD3-SCA-003") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSD3-OB-001") return "Partially covered";
  if (requirementId === "PSD3-OB-002") return "Partially covered";
  if (requirementId === "PSD3-OB-003") return "Partially covered";
  if (requirementId === "PSR-LIAB-001") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSR-APPFRAUD-001") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSR-DATA-001") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSD3-LIC-001") return strongHit ? "Partially covered" : "Needs human review";
  if (requirementId === "PSD3-SAFE-001") return strongHit ? "Covered" : "Partially covered";
  if (requirementId === "PSR-AUDIT-001") return strongHit ? "Covered" : "Partially covered";
  if (requirementId === "PSR-TRANS-001") return strongHit ? "Covered" : "Partially covered";
  if (requirementId === "PSR-INC-001") return strongHit ? "Covered" : "Partially covered";
  if (requirementId === "PSR-CASH-001") return strongHit ? "Covered" : "Partially covered";
  if (requirementId === "PSR-INSTANT-001") return strongHit ? "Covered" : "Partially covered";

  return strongHit ? "Covered" : "Partially covered";
}

function missingForRequirement(
  requirement: Requirement,
  status: RequirementStatus,
  hasStrongHit: boolean
): string[] {
  if (status === "Covered") {
    return [];
  }

  const specificHints = DOCUMENT_GAP_HINTS[requirement.id];
  if (specificHints) {
    return specificHints;
  }

  if (status === "Not evidenced") {
    return requirement.expectedEvidence;
  }

  return hasStrongHit
    ? requirement.expectedEvidence.slice(2)
    : requirement.expectedEvidence.slice(1);
}

function findEvidence(
  documents: UploadedDocument[],
  keywords: string[]
): EvidenceHit | undefined {
  for (const document of documents) {
    const lowerContent = document.content.toLowerCase();
    for (const keyword of keywords) {
      if (!keyword) continue;
      const index = lowerContent.indexOf(keyword.toLowerCase());
      if (index !== -1) {
        return {
          sourceDocument: document.name,
          excerpt: createExcerpt(document.content, index),
          matchedKeyword: keyword
        };
      }
    }
  }

  return undefined;
}

function isRelevantRequirement(
  requirement: Requirement,
  companyProfile: CompanyProfile
): boolean {
  if (requirement.relevantFor.includes(companyProfile.companyType)) {
    return true;
  }

  return (
    requirement.serviceTriggers?.some((service) =>
      companyProfile.services.includes(service)
    ) ?? false
  );
}

function createExcerpt(content: string, index: number): string {
  const start = Math.max(0, index - 110);
  const end = Math.min(content.length, index + 220);
  return content
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function summarize(matrix: EvidenceMatrixItem[]) {
  return {
    totalRequirements: matrix.length,
    covered: matrix.filter((item) => item.status === "Covered").length,
    partiallyCovered: matrix.filter((item) => item.status === "Partially covered").length,
    notEvidenced: matrix.filter((item) => item.status === "Not evidenced").length,
    needsHumanReview: matrix.filter((item) => item.status === "Needs human review").length
  };
}

function createRoadmap(matrix: EvidenceMatrixItem[]): RoadmapTask[] {
  const candidates = matrix
    .filter((item) => item.status !== "Covered")
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, 8);

  return candidates.map((item) => ({
    title: item.recommendedTask,
    owner: RULES[item.requirementId]?.owner ?? ownerForDomain(item.domain),
    priority: item.priority,
    deadline: deadlineForPriority(item.priority),
    evidenceRequired:
      item.missingEvidence.length > 0
        ? item.missingEvidence.slice(0, 3)
        : ["updated control evidence", "implementation test evidence"],
    acceptanceCriteria: acceptanceCriteriaFor(item),
    linkedRequirementIds: [item.requirementId]
  }));
}

function acceptanceCriteriaFor(item: EvidenceMatrixItem): string {
  if (item.requirementId === "PSR-PAYEE-001") {
    return "Transfer flow blocks or warns on mismatch cases and stores match, close-match and mismatch evidence.";
  }

  if (item.requirementId === "PSR-WARN-001") {
    return "Customers see risk-specific warning copy before execution and the warning event is retained for audit.";
  }

  if (item.requirementId === "PSD3-OB-002") {
    return "Users can view active consents, understand granted scopes and revoke access from a self-service dashboard.";
  }

  if (item.requirementId === "PSD3-SCA-002") {
    return "Compliance and engineering approve documented fallback, exemption and failed-authentication rules.";
  }

  if (item.requirementId === "PSD3-SCA-003") {
    return "At least one accessible SCA method is tested and available without smartphone dependency.";
  }

  if (item.requirementId === "PSR-LIAB-001") {
    return "Support and compliance can follow a documented reimbursement decision workflow with customer outcome templates.";
  }

  if (item.requirementId === "PSR-APPFRAUD-001") {
    return "Fraud and compliance can evidence APP fraud liability decisions, customer notices and reimbursement outcomes.";
  }

  return `Evidence package is updated and reviewed for ${item.requirementTitle}.`;
}

function priorityRank(priority: Priority): number {
  return {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  }[priority];
}

function deadlineForPriority(priority: Priority): RoadmapTask["deadline"] {
  if (priority === "Critical") return "30 days";
  if (priority === "High") return "60 days";
  if (priority === "Medium") return "90 days";
  return "180 days";
}

function ownerForDomain(domain: string): string {
  if (domain.includes("Fraud")) return "Fraud Operations";
  if (domain.includes("SCA")) return "Security Engineering";
  if (domain.includes("Open Banking")) return "Open Banking Product";
  if (domain.includes("API")) return "Platform Engineering";
  if (domain.includes("Liability")) return "Compliance + Support";
  return "Compliance";
}

function confidenceFor(
  status: RequirementStatus,
  hasHit: boolean,
  hasStrongHit: boolean
): number {
  if (status === "Covered") return hasStrongHit ? 0.9 : 0.82;
  if (status === "Partially covered") return hasStrongHit ? 0.78 : 0.68;
  if (status === "Needs human review") return hasHit ? 0.52 : 0.42;
  return 0.86;
}

function createRunId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `run_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}
