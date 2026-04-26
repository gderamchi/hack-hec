// ─── Conflict Check Route ─────────────────────────────────────────────────────
// Runs a real OpenAI call to detect cross-regulation conflicts in a remediation plan.
// This is the compliance safety gate — MUST pass before a plan can be accepted.

import type { NextRequest } from "next/server";
import type { ConflictCheckRequest, ConflictCheckResponse, ConflictFlag, RemediationPlan } from "@/lib/agent-types";
import { dbSelectOne, dbUpdate } from "@/lib/agent-db";

const CONFLICT_CHECK_PROMPT = `You are a cross-regulation conflict detection engine for fintech compliance.

You receive:
1. A remediation plan for a specific regulation change (list of actions)
2. A list of other regulations the company actively complies with

Your task: determine whether any action in the remediation plan conflicts with or undermines obligations in the other active regulations.

A conflict exists when:
- An action MODIFIES a document/system that is ALSO required by another regulation
- An action REMOVES or CHANGES a control that serves MULTIPLE regulations
- An action introduces a new process that CONTRADICTS an existing obligation

For each conflict found, provide:
- Which other regulation is affected
- Which article or obligation
- What the conflict is
- Severity (critical/high/medium/low)
- How to resolve it while satisfying both regulations

If no conflicts: return empty conflicts array and safe: true.

OUTPUT FORMAT (STRICT JSON ONLY):
{
  "safe": true,
  "conflicts": [
    {
      "regulation": "",
      "article": "",
      "description": "",
      "severity": "critical | high | medium | low",
      "resolution": ""
    }
  ],
  "summary": ""
}`;

async function callOpenAI<T>(apiKey: string, model: string, system: string, user: string): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60_000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: system }, { role: "user", content: user }]
      })
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const payload = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) return null;
    const cleaned = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned) as T;
  } catch { return null; }
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as ConflictCheckRequest | null;
  if (!body?.planId) return Response.json({ error: "planId required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  const plan = await dbSelectOne<RemediationPlan>("remediation_plans", { "id": `eq.${body.planId}` });
  if (!plan) return Response.json({ error: "Plan not found" }, { status: 404 });

  // Other regulations = active regulations minus the one being remediated
  const otherRegulations = (body.activeRegulations ?? []).filter(r => r !== body.regulationName);

  if (otherRegulations.length === 0) {
    // Nothing to conflict with — safe by default
    const result: ConflictCheckResponse = { safe: true, conflicts: [], summary: "No other active regulations to check against." };
    await dbUpdate("remediation_plans", { "id": `eq.${body.planId}` }, {
      conflict_check_status: "safe", conflict_flags: []
    });
    return Response.json(result);
  }

  const userPrompt = JSON.stringify({
    remediation_plan: {
      regulation_being_remediated: body.regulationName,
      actions: body.actions.map(a => ({
        team: a.team,
        task: a.task,
        asset_affected: a.assetName ?? null,
        asset_action: a.assetAction ?? null,
        vendor_affected: a.vendorName ?? null
      }))
    },
    other_active_regulations: otherRegulations,
    context: "Check if any action in this remediation plan conflicts with or undermines the other active regulations listed."
  });

  const result = await callOpenAI<ConflictCheckResponse>(apiKey, model, CONFLICT_CHECK_PROMPT, userPrompt);

  if (!result) {
    return Response.json({ error: "Conflict check failed" }, { status: 502 });
  }

  const conflicts = result.conflicts as ConflictFlag[] ?? [];
  const safe = conflicts.length === 0;

  // Persist result to plan
  await dbUpdate("remediation_plans", { "id": `eq.${body.planId}` }, {
    conflict_check_status: safe ? "safe" : "flagged",
    conflict_flags: conflicts,
    status: !safe ? "conflict_flagged" : "draft"
  });

  return Response.json({
    safe,
    conflicts,
    summary: result.summary ?? (safe ? "No conflicts found." : `${conflicts.length} conflict(s) detected.`)
  } satisfies ConflictCheckResponse);
}
