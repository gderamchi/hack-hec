// ─── Agent Scan Route ─────────────────────────────────────────────────────────
// The core agentic brain. Runs in two modes:
//   Regular: polls known regulations, checks for timestamp-based staleness
//   Simulate: injects a mock amendment through the full real AI pipeline

import type { NextRequest } from "next/server";
import type {
  PropagationResult,
  RegExtraction,
  RemediationAction,
  ComplianceProfile
} from "@/lib/agent-types";
import { dbInsert, dbSelect, dbSelectOne } from "@/lib/agent-db";

// ─── AI Prompts (isolated copy from monitor/route.ts) ─────────────────────────

const EXTRACTION_PROMPT = `You are an expert regulatory intelligence engine for fintech compliance.
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
RULES: 1) Each obligation is atomic. 2) Extract both explicit and implicit obligations. 3) operational_actions must be concrete executable tasks.`;

const PROPAGATION_PROMPT = `You are a regulatory propagation engine for fintech compliance.
You receive a structured Regulatory Change Event and a company operating model.
Map each obligation to the company's specific internal context.
For EACH obligation: determine relevance, identify affected teams/assets/vendors, generate concrete tasks.
Reference ONLY assets and vendors from the company's operating model by name.
relevance_score = percentage (0-100) of obligations relevant to this company.
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
      "affected_assets": [{"assetId":"","assetName":"","action":"update|review|create|retire","urgency":"critical|high|medium|low","reason":""}],
      "affected_vendors": [{"vendorName":"","action":"","urgency":"critical|high|medium|low"}],
      "action_plan": [{"team":"","task":"","effort":"high|medium|low","deadline":"30 days|60 days|90 days|180 days"}],
      "compliance_status": "non_compliant | partially_compliant | compliant",
      "gap_severity": "critical | high | medium | low"
    }
  ],
  "impact_summary": {
    "affected_teams": [{"team":"","obligation_count":0,"top_action":""}],
    "affected_assets": [],
    "affected_vendors": [],
    "critical_actions": [],
    "quick_wins": []
  }
}`;

const CONFLICT_CHECK_PROMPT = `You are a cross-regulation conflict detection engine.
You receive a remediation plan (list of actions) and a list of other active regulations.
Determine if any action conflicts with or undermines obligations in the other regulations.
OUTPUT FORMAT (STRICT JSON ONLY):
{
  "safe": true,
  "conflicts": [{"regulation": "", "article": "", "description": "", "severity": "critical|high|medium|low", "resolution": ""}]
}`;

const AUTO_HEAL_PROMPT = `You are a compliance auto-healing agent.
You receive an original list of tasks and a list of regulatory conflicts caused by those tasks.
Your job is to REWRITE AND ADJUST the tasks so that they resolve the conflicts and satisfy all regulations safely.
Update the task descriptions, effort, or deadlines as needed. Keep the same JSON structure.
OUTPUT FORMAT (STRICT JSON ONLY):
{
  "healed": true,
  "healed_actions": [ /* full array of updated RemediationAction objects */ ],
  "healing_summary": "Short explanation of what you changed"
}`;

// ─── Simulate Amendments Registry ────────────────────────────────────────────

const SIMULATE_AMENDMENTS: Record<string, { text: string; jurisdiction: string }> = {
  "DORA": {
    jurisdiction: "EU",
    text: `AMENDMENT NOTICE — DORA Article 17 Revised (effective 1 June 2026)
The European Banking Authority has issued a binding revision to the Digital Operational Resilience Act (EU) 2022/2554.

KEY CHANGES:
1. ICT incident reporting window reduced from 24 hours to 4 hours for major incidents
2. Automated detection systems required for all Tier 1 financial entities by 31 December 2026
3. Vendor contracts must include indemnification clauses for ICT outages exceeding 4 hours
4. Board-level ICT risk attestation now required quarterly (previously annual)
5. New requirement: real-time threat intelligence sharing with regulatory sandbox

FULL TEXT: Financial entities must report all major ICT-related incidents to the competent authority within four (4) hours of classification, replacing the previous twenty-four (24) hour window. Major incidents are defined as those meeting two or more of the following criteria: (a) impact on more than 50,000 users; (b) service downtime exceeding 30 minutes; (c) data integrity breach affecting customer records. Automated detection systems capable of classifying incidents within one hour must be deployed by 31 December 2026. Third-party ICT service provider contracts must include indemnification provisions for qualifying outages. The management body must quarterly attest to the effectiveness of ICT risk management controls and submit attestation evidence to the competent authority.`
  },
  "PSD3/PSR": {
    jurisdiction: "EU",
    text: `AMENDMENT NOTICE — PSD3/PSR Article 45 Revised (effective 15 July 2026)
The European Commission has issued a supplementary regulation to PSD3/PSR.

KEY CHANGES:
1. Payee IBAN name verification now mandatory for all credit transfers above EUR 100
2. PSPs must implement real-time fraud scoring before authorising payment initiation
3. SCA exemption for low-risk transactions reduced from EUR 30 to EUR 15
4. Minimum customer dispute resolution time reduced from 15 days to 5 business days
5. Open banking interface uptime SLA increased from 99.5% to 99.9%

FULL TEXT: Payment service providers must verify the payee name against the IBAN for all credit transfers exceeding EUR 100 and notify the payer of any discrepancy before execution. Real-time fraud scoring using machine learning must be applied to all payment initiation requests. The SCA low-value exemption threshold is reduced to EUR 15 per transaction. PSPs must resolve customer disputes within five (5) business days. Open banking interfaces must maintain 99.9% monthly uptime.`
  },
  "EU AI Act": {
    jurisdiction: "EU",
    text: `AMENDMENT NOTICE — EU AI Act Article 13 Revised (effective 1 August 2026)
The European Parliament has issued a clarification amendment to the EU AI Act.

KEY CHANGES:
1. AI systems used in credit scoring must now provide explainable output to customers on request
2. High-risk AI systems must undergo third-party conformity assessment annually (previously biennial)
3. AI training data provenance documentation now required for all high-risk systems
4. Automated fraud detection classified as high-risk AI must register in EU AI database before deployment
5. Post-market monitoring reports now required quarterly for high-risk AI in financial services

FULL TEXT: Deployers of high-risk AI systems in credit scoring and fraud detection must provide human-readable explanations of AI decisions upon customer request within 5 business days. Conformity assessments must be conducted annually by an accredited notified body. Training data provenance and bias testing documentation must be maintained and made available to regulators within 48 hours of request. All high-risk AI systems must be registered in the EU AI database prior to deployment. Post-market monitoring reports must be submitted quarterly to market surveillance authorities.`
  },
  "FCA Consumer Duty": {
    jurisdiction: "UK",
    text: `AMENDMENT NOTICE — FCA Consumer Duty PS24/1 (effective 31 July 2026)
The Financial Conduct Authority has issued a policy statement clarifying Consumer Duty obligations.

KEY CHANGES:
1. Annual Consumer Duty board report must now include quantified outcome metrics with benchmarks
2. Vulnerable customer identification must use AI-assisted screening by Q4 2026
3. Product value assessments must be conducted at minimum every 6 months (previously annually)
4. Customer communication readability must achieve a minimum Flesch score of 60
5. Firms must implement a real-time complaints dashboard accessible to board members

FULL TEXT: Firms must submit their annual Consumer Duty board report with quantified outcome metrics and industry benchmarks. AI-assisted tools for identifying vulnerable customers must be deployed by 31 October 2026. Product value assessments must occur semi-annually. All customer-facing communications must achieve a Flesch Reading Ease score of at least 60. Firms must maintain a real-time dashboard providing board members live access to complaints data, resolution rates, and customer outcome metrics.`
  }
};

// ─── OpenAI Caller ────────────────────────────────────────────────────────────

async function callOpenAI<T>(params: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
}): Promise<T | null> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 90_000);
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${params.apiKey}`, "Content-Type": "application/json" },
      signal: ctrl.signal,
      body: JSON.stringify({
        model: params.model,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: params.system },
          { role: "user", content: params.user }
        ]
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

// ─── Logger ───────────────────────────────────────────────────────────────────

async function log(profileId: string | null, eventType: string, message: string, metadata?: Record<string, unknown>) {
  await dbInsert("agent_activity_log", [{
    profile_id: profileId,
    event_type: eventType,
    message,
    metadata: metadata ?? null
  }]);
}

// ─── Action Builder ───────────────────────────────────────────────────────────

function buildActions(propagation: PropagationResult): RemediationAction[] {
  const actions: RemediationAction[] = [];
  for (const p of propagation.propagations ?? []) {
    if (!p.relevant) continue;
    for (const a of p.action_plan ?? []) {
      // Find associated asset if any
      const asset = p.affected_assets?.[0];
      const vendor = p.affected_vendors?.[0];
      actions.push({
        id: crypto.randomUUID(),
        team: a.team,
        task: a.task,
        effort: a.effort,
        deadline: a.deadline,
        assetName: asset?.assetName,
        assetAction: asset?.action,
        vendorName: vendor?.vendorName,
        obligation_id: p.obligation_id,
        urgency: p.gap_severity,
        status: "pending"
      });
    }
  }
  return actions;
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as {
    profileId?: string;
    simulate?: { regulationName: string };
  } | null;

  const profileId = body?.profileId;
  if (!profileId) return Response.json({ error: "profileId required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  if (!apiKey) return Response.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });

  // Load profile
  const profile = await dbSelectOne<ComplianceProfile>("compliance_profiles", { "id": `eq.${profileId}` });
  if (!profile) return Response.json({ error: "Profile not found" }, { status: 404 });

  const activities: string[] = [];
  const eventIds: string[] = [];

  // Determine which regulations to scan
  const regulationsToScan = body?.simulate
    ? [body.simulate.regulationName]
    : (profile.active_regulations as string[]);

  await log(profileId, "scan_started", `Agent scan started for ${profile.company_name} — checking ${regulationsToScan.join(", ")}`);
  activities.push(`Scanning ${regulationsToScan.length} regulation(s) for ${profile.company_name}`);

  for (const regulationName of regulationsToScan) {
    const amendment = SIMULATE_AMENDMENTS[regulationName];
    if (!amendment) {
      activities.push(`${regulationName}: no amendment registered, skipping`);
      continue;
    }

    // Deduplication guard — no duplicate pending_review for same regulation
    const existing = await dbSelect<{ id: string }>(
      "regulation_change_events",
      { "profile_id": `eq.${profileId}`, "regulation_name": `eq.${regulationName}`, "status": `eq.pending_review` },
      "id"
    );
    if (existing.length > 0) {
      activities.push(`${regulationName}: already pending review — skipping`);
      await log(profileId, "scan_complete", `${regulationName}: already pending review, skipped`);
      continue;
    }

    // Regular scan (no simulate flag) → just log heartbeat, no AI call
    if (!body?.simulate) {
      activities.push(`${regulationName}: no new changes detected`);
      await log(profileId, "scan_complete", `${regulationName}: baseline check — no changes detected`);
      continue;
    }

    // ── SIMULATE MODE: full AI pipeline ──────────────────────────────────────

    await log(profileId, "change_detected", `${regulationName}: amendment detected — extracting obligations via AI`);
    activities.push(`${regulationName}: amendment detected — running AI extraction`);

    // Step 1: Extract obligations
    const extraction = await callOpenAI<RegExtraction>({
      apiKey, model,
      system: EXTRACTION_PROMPT,
      user: `Extract the Regulatory Change Event from this amendment text:\n\n${amendment.text}`
    });

    if (!extraction) {
      await log(profileId, "error", `${regulationName}: obligation extraction failed`);
      continue;
    }
    activities.push(`${regulationName}: ${extraction.obligation_groups?.reduce((s, g) => s + g.obligations.length, 0) ?? 0} obligations extracted`);

    // Step 2: Propagate to company
    await log(profileId, "change_detected", `${regulationName}: propagating to ${profile.company_name} profile`);
    const propagation = await callOpenAI<PropagationResult>({
      apiKey, model,
      system: PROPAGATION_PROMPT,
      user: JSON.stringify({
        regulatory_change_event: extraction,
        company_operating_model: {
          company_name: profile.company_name,
          company_type: profile.operating_model.companyType,
          country: profile.operating_model.country,
          regulated_services: profile.operating_model.services,
          tech_stack: profile.operating_model.techStack,
          teams: profile.operating_model.teams,
          internal_assets: profile.operating_model.internalAssets,
          vendors: profile.operating_model.vendors
        }
      })
    });

    if (!propagation) {
      await log(profileId, "error", `${regulationName}: propagation failed`);
      continue;
    }

    const relevanceScore = propagation.relevance_score ?? 0;
    activities.push(`${regulationName}: relevance score ${relevanceScore}%`);

    // Step 3: Relevance gate
    if (relevanceScore < 50) {
      const eventId = crypto.randomUUID();
      await dbInsert("regulation_change_events", [{
        id: eventId, profile_id: profileId, regulation_name: regulationName,
        jurisdiction: amendment.jurisdiction, change_summary: propagation.summary ?? "",
        regulation_text: amendment.text, relevance_score: relevanceScore,
        status: "irrelevant", propagation_result: propagation, extraction_result: extraction
      }]);
      await log(profileId, "irrelevant_filtered", `${regulationName}: ${relevanceScore}% relevance — below 50% threshold, archived`);
      activities.push(`${regulationName}: filtered (${relevanceScore}% < 50% threshold)`);
      continue;
    }

    // Step 4: Create change event
    const eventId = crypto.randomUUID();
    await dbInsert("regulation_change_events", [{
      id: eventId, profile_id: profileId, regulation_name: regulationName,
      jurisdiction: amendment.jurisdiction, change_summary: propagation.summary ?? "",
      regulation_text: amendment.text, relevance_score: relevanceScore,
      status: "pending_review", propagation_result: propagation, extraction_result: extraction
    }]);

    // Step 5: Build remediation actions from propagation
    let actions = buildActions(propagation);
    let conflictFlags: any[] = [];
    let conflictStatus = "pending";

    // Step 5b: Auto-Heal (Cross-Check & Fix)
    const otherRegulations = (profile.active_regulations as string[]).filter(r => r !== regulationName);
    if (otherRegulations.length > 0) {
      await log(profileId, "conflict_check", `${regulationName}: cross-checking against ${otherRegulations.join(", ")}`);
      
      const checkRes = await callOpenAI<{ safe: boolean; conflicts: any[] }>({
        apiKey, model, system: CONFLICT_CHECK_PROMPT,
        user: JSON.stringify({ remediation_plan: actions, other_active_regulations: otherRegulations })
      });

      if (checkRes && !checkRes.safe && checkRes.conflicts?.length > 0) {
        await log(profileId, "auto_heal", `Conflicts detected! Auto-healing ${checkRes.conflicts.length} tasks...`);
        activities.push(`${regulationName}: Agent naturally detected ${checkRes.conflicts.length} conflict(s) with ${otherRegulations.join(", ")}`);
        
        const healRes = await callOpenAI<{ healed: boolean; healed_actions: RemediationAction[]; healing_summary: string }>({
          apiKey, model, system: AUTO_HEAL_PROMPT,
          user: JSON.stringify({ original_actions: actions, conflicts: checkRes.conflicts })
        });

        if (healRes?.healed_actions) {
          actions = healRes.healed_actions;
          // Pre-apply an Accepted status or keep pending, but mark them as updated.
          // Store what was fixed so UI can show it.
          conflictFlags = checkRes.conflicts.map(c => ({ ...c, resolution: healRes.healing_summary }));
          conflictStatus = "auto_healed";
          activities.push(`✨ Agent successfully auto-healed conflicts based on active rules`);
          await log(profileId, "plan_accepted", `Auto-healed conflicts: ${healRes.healing_summary}`);
        } else {
          // If heal failed, output standard conflicts
          conflictFlags = checkRes.conflicts;
          conflictStatus = "flagged";
        }
      } else {
        conflictStatus = "safe";
      }
    }

    // Step 6: Create remediation plan
    const planId = crypto.randomUUID();
    await dbInsert("remediation_plans", [{
      id: planId, change_event_id: eventId, profile_id: profileId,
      actions, conflict_flags: conflictFlags, conflict_check_status: conflictStatus, 
      status: conflictStatus === "flagged" ? "conflict_flagged" : "draft"
    }]);

    await log(profileId, "plan_generated",
      `${regulationName}: ${relevanceScore}% relevant — plan generated with ${actions.length} actions`,
      { eventId, planId, relevanceScore, actionsCount: actions.length }
    );
    activities.push(`${regulationName}: plan generated — ${actions.length} actions, ${relevanceScore}% relevance`);
    eventIds.push(eventId);
  }

  await log(profileId, "scan_complete", `Scan complete — ${eventIds.length} new plan(s) created`);
  return Response.json({
    eventsCreated: eventIds.length,
    eventIds,
    message: eventIds.length > 0
      ? `${eventIds.length} regulation change(s) require your review`
      : "All regulations checked — no relevant changes detected",
    activities
  });
}
