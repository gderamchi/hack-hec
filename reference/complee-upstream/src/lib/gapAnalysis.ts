// Complee — gap-analysis logic
import type {
  AssessmentResult,
  AssessmentResultRow,
  CompanyProfile,
  Requirement,
  RequirementStatus,
} from "@/data/requirements";

const UK_SPECIFIC = ["CASS 15", "Consumer Duty", "SM&CR", "FOS", "PRA"];
const EU_HARMONISED = ["aml_kyc", "fraud_prevention", "data_protection"];
const ALWAYS_LOCAL = ["governance", "reporting", "complaints", "wind_down"];

const EU_COUNTRIES = ["FR", "DE", "NL", "ES"] as const;

export function classifyRequirement(
  req: Requirement,
  homeCountry: string,
  targetCountry: string,
): RequirementStatus {
  const homeIsEU = (EU_COUNTRIES as readonly string[]).includes(homeCountry);
  const targetIsUK = targetCountry === "GB";

  if (
    targetIsUK &&
    UK_SPECIFIC.some(
      (k) => req.regulation_reference?.includes(k) || req.title?.includes(k),
    )
  ) {
    return "missing";
  }

  if (homeIsEU && !targetIsUK && EU_HARMONISED.includes(req.category as string)) {
    return "covered";
  }

  if (ALWAYS_LOCAL.includes(req.category as string)) {
    return "partial";
  }

  return "partial";
}

export function confidenceFor(status: RequirementStatus): number {
  if (status === "covered") return 94;
  if (status === "partial") return 72;
  return 46;
}

export function remediationFor(status: RequirementStatus): string {
  if (status === "covered") {
    return "Existing framework appears reusable with minor localisation checks.";
  }
  if (status === "partial") {
    return "Adapt existing controls to the target regulator's local rulebook and evidence expectations.";
  }
  return "Create a new control, policy, owner, and evidence trail for this target-market requirement.";
}

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function runGapAnalysis(
  profile: CompanyProfile,
  requirements: Requirement[],
): AssessmentResult {
  const filtered = requirements.filter((r) => r.country === profile.targetCountry);

  const rows: AssessmentResultRow[] = filtered.map((req) => {
    const status = classifyRequirement(req, profile.homeCountry, profile.targetCountry);
    return {
      requirement: req,
      status,
      confidence: confidenceFor(status),
      evidenceExcerpt: req.evidence_quote ?? "",
      recommendedAction: remediationFor(status),
    };
  });

  rows.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.requirement.priority] ?? 99;
    const pb = PRIORITY_ORDER[b.requirement.priority] ?? 99;
    return pa - pb;
  });

  const covered = rows.filter((r) => r.status === "covered").length;
  const partial = rows.filter((r) => r.status === "partial").length;
  const missing = rows.filter((r) => r.status === "missing").length;
  const total = rows.length;
  const readinessScore =
    total === 0 ? 0 : Math.round(((covered + partial * 0.5) / total) * 100);

  return {
    generatedAt: new Date().toISOString(),
    homeCountry: profile.homeCountry,
    targetCountry: profile.targetCountry,
    totalRequirements: total,
    covered,
    partial,
    missing,
    readinessScore,
    rows,
  };
}

// Map category → team for the execution roadmap.
const TEAM_BY_CATEGORY: Record<string, "Compliance" | "Operations" | "Engineering"> = {
  capital_requirements: "Compliance",
  governance: "Compliance",
  complaints: "Compliance",
  wind_down: "Compliance",
  aml_kyc: "Compliance",
  fraud_prevention: "Compliance",
  consumer_protection: "Compliance",
  safeguarding: "Operations",
  reporting: "Operations",
  operational_resilience: "Engineering",
  outsourcing: "Engineering",
  data_protection: "Engineering",
};

export function teamForCategory(
  category: string,
): "Compliance" | "Operations" | "Engineering" | null {
  return TEAM_BY_CATEGORY[category] ?? null;
}
