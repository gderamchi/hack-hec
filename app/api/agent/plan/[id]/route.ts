import type { NextRequest } from "next/server";
import { dbSelect, dbSelectOne, dbUpdate } from "@/lib/agent-db";
import type { RemediationPlan, RegChangeEvent, RemediationAction } from "@/lib/agent-types";

type Params = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

// GET /api/agent/plan/[id]
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const plan = await dbSelectOne<RemediationPlan>("remediation_plans", { "id": `eq.${id}` });
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

    const event = await dbSelectOne<RegChangeEvent>(
      "regulation_change_events",
      { "id": `eq.${plan.change_event_id}` }
    );

    return Response.json({ plan: { ...plan, event } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

// PATCH /api/agent/plan/[id] — update individual action statuses
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await request.json() as { actions: RemediationAction[] };
    if (!Array.isArray(body.actions)) {
      return Response.json({ error: "actions array required" }, { status: 400 });
    }

    const plan = await dbSelectOne<RemediationPlan>("remediation_plans", { "id": `eq.${id}` });
    if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });
    if (plan.status === "accepted" || plan.status === "rejected") {
      return Response.json({ error: "Plan is already finalised" }, { status: 409 });
    }

    // Validate: submitted actions must match plan's action IDs
    const planActionIds = new Set((plan.actions as RemediationAction[]).map(a => a.id));
    for (const a of body.actions) {
      if (!planActionIds.has(a.id)) {
        return Response.json({ error: `Action ID ${a.id} not found in this plan` }, { status: 400 });
      }
    }

    // Merge status updates
    const updatedActions: RemediationAction[] = (plan.actions as RemediationAction[]).map(existing => {
      const update = body.actions.find(a => a.id === existing.id);
      return update ? { ...existing, status: update.status } : existing;
    });

    await dbUpdate("remediation_plans", { "id": `eq.${id}` }, { actions: updatedActions });

    const event = await dbSelectOne<RegChangeEvent>(
      "regulation_change_events",
      { "id": `eq.${plan.change_event_id}` }
    );

    return Response.json({ plan: { ...plan, actions: updatedActions, event } });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}

// GET /api/agent/plan — list all (alias)
export async function HEAD(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const plan = await dbSelectOne<RemediationPlan>("remediation_plans", { "id": `eq.${id}` });
  return plan
    ? new Response(null, { status: 200 })
    : new Response(null, { status: 404 });
}
