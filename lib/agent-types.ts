// ─── Compliance Agent Type System ─────────────────────────────────────────────
// Isolated from monitor-types.ts and types.ts.

import type {
  OperatingModel,
  PropagationResult,
  RegulatoryChangeEvent as RegExtraction,
  TeamName,
  AssetAction,
  GapSeverity
} from "./monitor-types";

export type { OperatingModel, PropagationResult, RegExtraction, TeamName, AssetAction, GapSeverity };

// ─── Profile ──────────────────────────────────────────────────────────────────

export type ComplianceProfile = {
  id: string;
  company_name: string;
  operating_model: OperatingModel;
  active_regulations: string[];
  created_at: string;
  updated_at: string;
};

// ─── Change Events ────────────────────────────────────────────────────────────

export type RegChangeStatus =
  | "detected"       // initial, relevance not yet checked
  | "irrelevant"     // relevance < 50%, silently archived
  | "pending_review" // relevant, plan generated, awaiting compliance lead
  | "accepted"       // plan accepted, in compliance baseline
  | "rejected";      // plan rejected

export type RegChangeEvent = {
  id: string;
  profile_id: string;
  regulation_name: string;
  jurisdiction: string;
  change_summary: string;
  regulation_text: string;
  relevance_score: number;
  status: RegChangeStatus;
  propagation_result: PropagationResult | null;
  extraction_result: RegExtraction | null;
  detected_at: string;
  reviewed_at: string | null;
};

// ─── Remediation ──────────────────────────────────────────────────────────────

export type ActionStatus = "pending" | "accepted" | "rejected";

export type RemediationAction = {
  id: string;
  team: TeamName;
  task: string;
  effort: "high" | "medium" | "low";
  deadline: "30 days" | "60 days" | "90 days" | "180 days";
  assetName?: string;
  assetAction?: AssetAction;
  vendorName?: string;
  obligation_id: string;
  urgency: GapSeverity;
  status: ActionStatus;
};

export type ConflictFlag = {
  regulation: string;
  article: string;
  description: string;
  severity: "critical" | "high" | "medium" | "low";
  resolution: string;
};

export type PlanStatus = "draft" | "conflict_flagged" | "accepted" | "rejected";
export type ConflictCheckStatus = "pending" | "safe" | "flagged" | "auto_healed";

export type RemediationPlan = {
  id: string;
  change_event_id: string;
  profile_id: string;
  actions: RemediationAction[];
  conflict_flags: ConflictFlag[];
  conflict_check_status: ConflictCheckStatus;
  status: PlanStatus;
  accepted_by: string | null;
  accepted_at: string | null;
  created_at: string;
};

export type PlanWithEvent = RemediationPlan & { event: RegChangeEvent };

// ─── Activity Log ─────────────────────────────────────────────────────────────

export type ActivityType =
  | "scan_started"
  | "scan_complete"
  | "change_detected"
  | "irrelevant_filtered"
  | "plan_generated"
  | "conflict_safe"
  | "conflict_flagged"
  | "plan_accepted"
  | "plan_rejected"
  | "error";

export type AgentActivity = {
  id: string;
  profile_id: string | null;
  event_type: ActivityType;
  message: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

// ─── API Shapes ───────────────────────────────────────────────────────────────

export type SimulatePayload = {
  regulationName: string;
  text: string;
};

export type ScanRequest = {
  profileId: string;
  simulate?: SimulatePayload;
};

export type ScanResponse = {
  eventsCreated: number;
  eventIds: string[];
  message: string;
  activities: string[];
};

export type ConflictCheckRequest = {
  planId: string;
  regulationName: string;
  actions: RemediationAction[];
  activeRegulations: string[];
};

export type ConflictCheckResponse = {
  safe: boolean;
  conflicts: ConflictFlag[];
  summary: string;
};

export type AcceptPlanRequest = {
  planId: string;
  acceptedBy: string;
  acknowledgedConflicts: boolean;
};

export type AcceptPlanResponse = {
  success: boolean;
  message: string;
  plan?: RemediationPlan;
};
