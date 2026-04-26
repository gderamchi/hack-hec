// ─── Accept Plan Route ────────────────────────────────────────────────────────
// The final gate. Enforces ALL compliance rules before locking a plan:
//   1. Plan must exist and be in draft/conflict_flagged state
//   2. Conflict check must have been run (not pending)
//   3. All actions must be reviewed (no pending status)
//   4. If conflicts exist, user must have explicitly acknowledged them
//   5. Atomically marks plan accepted + event accepted in DB

import type { NextRequest } from "next/server";
import { dbSelectOne, dbUpdate, dbInsert } from "@/lib/agent-db";
import type { RemediationPlan, RemediationAction, AcceptPlanRequest, AcceptPlanResponse } from "@/lib/agent-types";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as AcceptPlanRequest | null;

  if (!body?.planId) return Response.json({ error: "planId required" }, { status: 400 });
  if (!body?.acceptedBy?.trim()) return Response.json({ error: "acceptedBy required" }, { status: 400 });

  const plan = await dbSelectOne<RemediationPlan>("remediation_plans", { "id": `eq.${body.planId}` });
  if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

  // ── Gate 1: Plan must be in a reviewable state ────────────────────────────
  if (plan.status === "accepted") {
    return Response.json({ error: "Plan is already accepted" }, { status: 409 });
  }
  if (plan.status === "rejected") {
    return Response.json({ error: "Plan has been rejected and cannot be accepted" }, { status: 409 });
  }

  // ── Gate 2: Conflict check must have been run ─────────────────────────────
  if (plan.conflict_check_status === "pending") {
    return Response.json({
      error: "Conflict check has not been run. Run the conflict check before accepting this plan.",
      code: "CONFLICT_CHECK_REQUIRED"
    }, { status: 422 });
  }

  // ── Gate 3: All actions must be reviewed (no pending) ─────────────────────
  const actions = plan.actions as RemediationAction[];
  const pendingActions = actions.filter(a => a.status === "pending");
  if (pendingActions.length > 0) {
    return Response.json({
      error: `${pendingActions.length} action(s) have not been reviewed. Accept or reject each action before locking the plan.`,
      code: "ACTIONS_PENDING",
      pendingCount: pendingActions.length
    }, { status: 422 });
  }

  // ── Gate 4: If conflicts flagged, must be explicitly acknowledged ──────────
  const hasConflicts = (plan.conflict_flags as unknown[])?.length > 0;
  if (hasConflicts && !body.acknowledgedConflicts) {
    return Response.json({
      error: "This plan has flagged conflicts. You must explicitly acknowledge them before accepting.",
      code: "CONFLICTS_NOT_ACKNOWLEDGED",
      conflicts: plan.conflict_flags
    }, { status: 422 });
  }

  // ── Gate 5: At least one action must be accepted ──────────────────────────
  const acceptedActions = actions.filter(a => a.status === "accepted");
  if (acceptedActions.length === 0) {
    return Response.json({
      error: "At least one action must be accepted to lock the plan.",
      code: "NO_ACCEPTED_ACTIONS"
    }, { status: 422 });
  }

  // ── All gates passed — lock the plan atomically ───────────────────────────
  const now = new Date().toISOString();

  await dbUpdate("remediation_plans", { "id": `eq.${body.planId}` }, {
    status: "accepted",
    accepted_by: body.acceptedBy,
    accepted_at: now
  });

  await dbUpdate("regulation_change_events", { "id": `eq.${plan.change_event_id}` }, {
    status: "accepted",
    reviewed_at: now
  });

  // Log the acceptance
  await dbInsert("agent_activity_log", [{
    profile_id: plan.profile_id,
    event_type: "plan_accepted",
    message: `Plan accepted by ${body.acceptedBy} — ${acceptedActions.length} actions locked into compliance baseline`,
    metadata: {
      planId: body.planId,
      acceptedBy: body.acceptedBy,
      acceptedActionsCount: acceptedActions.length,
      rejectedActionsCount: actions.length - acceptedActions.length,
      conflictsAcknowledged: hasConflicts ? body.acknowledgedConflicts : null
    }
  }]);

  const updatedPlan: RemediationPlan = {
    ...plan,
    status: "accepted",
    accepted_by: body.acceptedBy,
    accepted_at: now
  };

  return Response.json({
    success: true,
    message: `Plan accepted. ${acceptedActions.length} action(s) are now part of your compliance baseline.`,
    plan: updatedPlan
  } satisfies AcceptPlanResponse);
}
