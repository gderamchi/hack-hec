import type { NextRequest } from "next/server";
import { dbSelect } from "@/lib/agent-db";
import type { RemediationPlan, RegChangeEvent, PlanWithEvent, AgentActivity } from "@/lib/agent-types";

export const dynamic = "force-dynamic";

// GET /api/agent/plans?profileId=xxx
export async function GET(request: NextRequest) {
  const profileId = request.nextUrl.searchParams.get("profileId");
  if (!profileId) return Response.json({ error: "profileId required" }, { status: 400 });

  try {
    // Fetch all change events for this profile
    const events = await dbSelect<RegChangeEvent>(
      "regulation_change_events",
      { "profile_id": `eq.${profileId}` },
      "*",
      "detected_at.desc"
    );

    // Fetch all plans for this profile
    const plans = await dbSelect<RemediationPlan>(
      "remediation_plans",
      { "profile_id": `eq.${profileId}` },
      "*",
      "created_at.desc"
    );

    // Join plans with their events
    const eventMap = new Map(events.map(e => [e.id, e]));
    const plansWithEvents: PlanWithEvent[] = plans
      .map(p => ({ ...p, event: eventMap.get(p.change_event_id)! }))
      .filter(p => !!p.event);

    const pendingCount = plansWithEvents.filter(p => p.status === "draft" || p.status === "conflict_flagged").length;

    // Activity log (latest 50)
    const activities = await dbSelect<AgentActivity>(
      "agent_activity_log",
      { "profile_id": `eq.${profileId}` },
      "*",
      "created_at.desc",
      50
    );

    return Response.json({ plans: plansWithEvents, pendingCount, activities: activities.reverse() });
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
