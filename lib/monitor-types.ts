// ─── Regulatory Change Propagation Engine ────────────────────────────────────
// All types for the monitoring branch intelligence layer.
// Does NOT modify lib/types.ts.

// ─── Enums / Unions ───────────────────────────────────────────────────────────

export type ComplianceStatus = "non_compliant" | "partially_compliant" | "compliant";
export type RiskImpact = "high_operational_and_regulatory" | "medium_operational_and_regulatory" | "low_operational_and_regulatory";
export type AutomationPotential = "high" | "medium" | "low";
export type ChangeType = "new_requirement" | "modification" | "clarification" | "enforcement_update";
export type ObligationCategory = "authentication" | "monitoring" | "reporting" | "governance" | "risk_management";
export type ControlType = "preventive" | "detective" | "corrective";
export type RiskLevel = "low" | "medium" | "high";
export type GapSeverity = "critical" | "high" | "medium" | "low";
export type InternalAssetType = "policy" | "runbook" | "contract" | "system" | "process";
export type AssetAction = "update" | "review" | "create" | "retire";
export type TeamName =
  | "Engineering"
  | "Fraud & Financial Crime"
  | "Compliance"
  | "Legal"
  | "Product"
  | "Operations"
  | "Finance & Treasury"
  | "Risk";

// ─── Constants ────────────────────────────────────────────────────────────────

export const ALL_TEAMS: TeamName[] = [
  "Engineering",
  "Fraud & Financial Crime",
  "Compliance",
  "Legal",
  "Product",
  "Operations",
  "Finance & Treasury",
  "Risk"
];

export const MONITOR_COMPANY_TYPES = [
  "Payment Institution",
  "Electronic Money Institution",
  "Neobank",
  "Open Banking Provider",
  "Payment Orchestrator",
  "Crypto-asset Service Provider",
  "Technical Service Provider",
  "Online Platform",
  "Digital Lending Platform"
] as const;

export const MONITOR_COUNTRIES = [
  "United Kingdom",
  "France",
  "Germany",
  "Netherlands",
  "Ireland",
  "Spain",
  "Italy",
  "Other EU",
  "Other"
] as const;

export const MONITOR_SERVICES = [
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
  "AI-based credit scoring",
  "AI-based fraud detection",
  "Customer onboarding / KYC"
] as const;

export const ASSET_TYPE_LABELS: Record<InternalAssetType, string> = {
  policy: "Policy",
  runbook: "Runbook",
  contract: "Contract",
  system: "System",
  process: "Process"
};

// ─── Operating Model ──────────────────────────────────────────────────────────

export type InternalAsset = {
  id: string;
  name: string;
  type: InternalAssetType;
};

export type OperatingModel = {
  companyName: string;
  companyType: string;
  country: string;
  services: string[];
  techStack: string[];
  teams: TeamName[];
  internalAssets: InternalAsset[];
  vendors: string[];
};

export const DEFAULT_OPERATING_MODEL: OperatingModel = {
  companyName: "",
  companyType: "Payment Institution",
  country: "United Kingdom",
  services: [],
  techStack: [],
  teams: ["Engineering", "Compliance", "Product"],
  internalAssets: [],
  vendors: []
};

// ─── V3 Regulatory Change Event ───────────────────────────────────────────────

export type Obligation = {
  obligation_id: string;
  description: string;
  applies_to: string[];
  risk_level: RiskLevel;
  control_type: ControlType;
  system_impacted: string[];
  depends_on: string[];
  operational_actions: string[];
  penalty_if_non_compliant: string;
};

export type ObligationGroup = {
  group_name: string;
  category: ObligationCategory;
  obligations: Obligation[];
};

export type RegulatoryChangeEvent = {
  regulation_name: string;
  jurisdiction: string;
  effective_date: string;
  change_type: ChangeType;
  summary: string;
  affected_entities: string[];
  obligation_groups: ObligationGroup[];
  triggers: string[];
  keywords: string[];
  source_reference: string;
};

// ─── Propagation ─────────────────────────────────────────────────────────────

export type AssetImpact = {
  assetId: string;
  assetName: string;
  action: AssetAction;
  urgency: GapSeverity;
  reason: string;
};

export type VendorImpact = {
  vendorName: string;
  action: string;
  urgency: GapSeverity;
};

export type TeamAction = {
  team: TeamName;
  task: string;
  effort: "high" | "medium" | "low";
  deadline: "30 days" | "60 days" | "90 days" | "180 days";
};

export type ObligationPropagation = {
  obligation_id: string;
  obligation_description: string;
  relevant: boolean;
  relevance_reason: string;
  affected_teams: TeamName[];
  affected_assets: AssetImpact[];
  affected_vendors: VendorImpact[];
  action_plan: TeamAction[];
  compliance_status: ComplianceStatus;
  gap_severity: GapSeverity;
};

export type TeamImpactSummary = {
  team: TeamName;
  obligation_count: number;
  top_action: string;
};

export type PropagationResult = {
  regulation_name: string;
  jurisdiction: string;
  change_type: string;
  summary: string;
  relevance_score: number;
  total_obligations: number;
  relevant_obligations: number;
  propagations: ObligationPropagation[];
  impact_summary: {
    affected_teams: TeamImpactSummary[];
    affected_assets: AssetImpact[];
    affected_vendors: VendorImpact[];
    critical_actions: TeamAction[];
    quick_wins: string[];
  };
};

// ─── Legacy Gap Analysis (kept for compatibility) ─────────────────────────────

export type EntityProfile = {
  integrations: string[];
  infrastructure: string[];
  current_capabilities: {
    siem: boolean;
    incident_reporting: "manual" | "automated" | "partial";
    vendor_management: "none" | "informal" | "formal" | "unknown";
    monitoring: "none" | "partial" | "full" | "unknown";
  };
};

export type GapItem = {
  obligation_id: string;
  obligation: string;
  compliance_status: ComplianceStatus;
  risk_impact: RiskImpact;
  automation_potential: AutomationPotential;
  automation_rationale: string;
  current_state: string;
  gap_severity: GapSeverity;
  gap_description: string;
  recommended_actions: string[];
  effort: "high" | "medium" | "low";
  priority: number;
};

export type GapSummaryType = {
  total_gaps: number;
  compliance_breakdown: { non_compliant: number; partially_compliant: number; compliant: number };
  risk_impact_breakdown: {
    high_operational_and_regulatory: number;
    medium_operational_and_regulatory: number;
    low_operational_and_regulatory: number;
  };
  automation_breakdown: { high: number; medium: number; low: number };
  critical: number;
  high: number;
  medium: number;
  quick_wins: string[];
  highest_risk_area: string;
};

export type GapAnalysisResult = {
  entity_profile: EntityProfile;
  gap_analysis: GapItem[];
  summary: GapSummaryType;
};

// ─── API ──────────────────────────────────────────────────────────────────────

export type MonitorRequest = {
  regulationText: string;
  entityProfile?: EntityProfile;
  operatingModel?: OperatingModel;
};

export type MonitorResponse =
  | { mode: "extraction"; data: RegulatoryChangeEvent }
  | { mode: "propagation"; extraction: RegulatoryChangeEvent; propagation: PropagationResult }
  | { mode: "error"; error: string };
