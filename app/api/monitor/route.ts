import type {
  OperatingModel,
  MonitorRequest,
  PropagationResult,
  RegulatoryChangeEvent
} from "@/lib/monitor-types";

// ─── V3 Extraction Prompt ────────────────────────────────────────────────────

const V3_EXTRACTION_PROMPT = `You are an expert regulatory intelligence engine for fintech compliance (PSD3, DORA, EU AI Act, FCA).

Convert the regulation text into a structured Regulatory Change Event.

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no comments):

{
  "regulation_name": "",
  "jurisdiction": "",
  "effective_date": "",
  "change_type": "new_requirement | modification | clarification | enforcement_update",
  "summary": "",
  "affected_entities": [],
  "obligation_groups": [
    {
      "group_name": "",
      "category": "authentication | monitoring | reporting | governance | risk_management",
      "obligations": [
        {
          "obligation_id": "",
          "description": "",
          "applies_to": [],
          "risk_level": "low | medium | high",
          "control_type": "preventive | detective | corrective",
          "system_impacted": [],
          "depends_on": [],
          "operational_actions": [],
          "penalty_if_non_compliant": ""
        }
      ]
    }
  ],
  "triggers": [],
  "keywords": [],
  "source_reference": ""
}

RULES:
1. Each obligation must be atomic (one rule per entry).
2. Extract BOTH explicit and implicit obligations.
3. depends_on: capture obligation_id dependencies.
4. operational_actions: concrete executable tasks (e.g. "configure SCA rules").
5. system_impacted: implementable system names (e.g. siem_platform, not abstract terms).
6. Infer regulation_name and jurisdiction from context.
7. Extract multiple triggers.`;

// ─── Propagation Prompt ───────────────────────────────────────────────────────

const PROPAGATION_PROMPT = `You are a regulatory propagation engine for fintech compliance.

You receive:
1. A structured Regulatory Change Event (obligation groups with obligations)
2. A company's operating model (services, tech stack, teams, internal assets, vendors)

Your task: map each obligation to the company's specific internal context.

For EACH obligation:
- Determine if it is relevant (based on company type, services, tech stack)
- Identify which of THEIR SPECIFIC named teams are affected
- Identify which of THEIR SPECIFIC named assets need updating, reviewing, or creating
- Identify which of THEIR SPECIFIC named vendors are implicated
- Generate concrete, actionable tasks for each affected team

IMPORTANT:
- Reference ONLY assets and vendors from the company's operating model (by name)
- If an asset doesn't exist but should, recommend creating it (action: "create")
- Be specific — not generic. "Update your Incident Response Runbook" not "Update documentation"
- Always reflect the actual company's tech stack in system-level tasks
- relevance_score = percentage of obligations relevant to this company (0-100)

OUTPUT FORMAT (STRICT JSON ONLY):

{
  "regulation_name": "",
  "jurisdiction": "",
  "change_type": "",
  "summary": "",
  "relevance_score": 0,
  "total_obligations": 0,
  "relevant_obligations": 0,
  "propagations": [
    {
      "obligation_id": "",
      "obligation_description": "",
      "relevant": true,
      "relevance_reason": "",
      "affected_teams": [],
      "affected_assets": [
        {
          "assetId": "",
          "assetName": "",
          "action": "update | review | create | retire",
          "urgency": "critical | high | medium | low",
          "reason": ""
        }
      ],
      "affected_vendors": [
        {
          "vendorName": "",
          "action": "",
          "urgency": "critical | high | medium | low"
        }
      ],
      "action_plan": [
        {
          "team": "",
          "task": "",
          "effort": "high | medium | low",
          "deadline": "30 days | 60 days | 90 days | 180 days"
        }
      ],
      "compliance_status": "non_compliant | partially_compliant | compliant",
      "gap_severity": "critical | high | medium | low"
    }
  ],
  "impact_summary": {
    "affected_teams": [
      { "team": "", "obligation_count": 0, "top_action": "" }
    ],
    "affected_assets": [],
    "affected_vendors": [],
    "critical_actions": [],
    "quick_wins": []
  }
}`;

// ─── API Handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as MonitorRequest | null;

  if (!body?.regulationText?.trim()) {
    return Response.json({ mode: "error", error: "regulationText is required." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  if (!apiKey) {
    return Response.json({ mode: "error", error: "OPENAI_API_KEY is not configured." }, { status: 500 });
  }

  // ── Step 1: Extract Regulatory Change Event ──────────────────────────────
  const extraction = await callOpenAI<RegulatoryChangeEvent>({
    apiKey,
    model,
    system: V3_EXTRACTION_PROMPT,
    user: `Extract the Regulatory Change Event from this text:\n\n${body.regulationText}`
  });

  if (!extraction) {
    return Response.json({ mode: "error", error: "Regulatory extraction failed. Check server logs." }, { status: 502 });
  }

  // ── Step 2 (optional): Propagation ───────────────────────────────────────
  if (body.operatingModel) {
    const propagation = await callOpenAI<PropagationResult>({
      apiKey,
      model,
      system: PROPAGATION_PROMPT,
      user: buildPropagationInput(extraction, body.operatingModel)
    });

    if (propagation) {
      return Response.json({ mode: "propagation", extraction, propagation });
    }
    // Fallback to extraction only if propagation fails
  }

  return Response.json({ mode: "extraction", data: extraction });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildPropagationInput(
  extraction: RegulatoryChangeEvent,
  model: OperatingModel
): string {
  return JSON.stringify({
    regulatory_change_event: {
      regulation_name: extraction.regulation_name,
      jurisdiction: extraction.jurisdiction,
      change_type: extraction.change_type,
      summary: extraction.summary,
      affected_entities: extraction.affected_entities,
      obligation_groups: extraction.obligation_groups,
      triggers: extraction.triggers
    },
    company_operating_model: {
      company_name: model.companyName,
      company_type: model.companyType,
      country: model.country,
      regulated_services: model.services,
      tech_stack: model.techStack,
      teams: model.teams,
      internal_assets: model.internalAssets.map(a => ({ id: a.id, name: a.name, type: a.type })),
      vendors: model.vendors
    }
  });
}

async function callOpenAI<T>({
  apiKey,
  model,
  system,
  user
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user }
        ]
      })
    });

    clearTimeout(timeout);
    if (!response.ok) return null;

    const payload = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const text = payload.choices?.[0]?.message?.content?.trim();
    if (!text) return null;

    const cleaned = text
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    return JSON.parse(cleaned) as T;
  } catch {
    return null;
  }
}
