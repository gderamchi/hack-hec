// Complee — Policy Coverage Analyzer.
// Receives extracted text from an uploaded policy + the list of substeps the
// regulator expects for the current requirement. Calls Lovable AI Gateway
// (Gemini 2.5 Pro for accuracy) with a tool-calling schema so the response is
// always structured JSON. Returns per-substep coverage, evidence quotes, gap
// explanations, and suggested additions the FinTech can append.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SubstepInput {
  id: string;
  title: string;
  detail: string;
}

interface AnalyzeRequest {
  documentText: string;
  documentName: string;
  requirementTitle: string;
  authority: string;
  country: string;
  regulationReference: string;
  substeps: SubstepInput[];
}

interface CoverageResult {
  substepId: string;
  substepTitle: string;
  status: "covered" | "partial" | "missing";
  evidenceQuote: string;
  gapExplanation: string;
  suggestedAddition: string;
}

const tool = {
  type: "function",
  function: {
    name: "report_policy_coverage",
    description:
      "Report which substeps of the regulatory requirement are covered, partially covered, or missing in the uploaded policy document.",
    parameters: {
      type: "object",
      properties: {
        overallSummary: {
          type: "string",
          description:
            "2-3 sentence summary describing how well the uploaded policy covers the requirement overall, in plain English.",
        },
        coverageScore: {
          type: "number",
          description: "Number between 0 and 100 reflecting overall coverage.",
        },
        results: {
          type: "array",
          items: {
            type: "object",
            properties: {
              substepId: { type: "string" },
              substepTitle: { type: "string" },
              status: { type: "string", enum: ["covered", "partial", "missing"] },
              evidenceQuote: {
                type: "string",
                description:
                  "Verbatim short quote from the document that demonstrates coverage. Empty string if missing.",
              },
              gapExplanation: {
                type: "string",
                description:
                  "Plain-English explanation of what is missing or weak. Empty string if fully covered.",
              },
              suggestedAddition: {
                type: "string",
                description:
                  "Concrete paragraph (50-120 words) that could be appended as an addendum to close the gap. Empty string if covered.",
              },
            },
            required: [
              "substepId",
              "substepTitle",
              "status",
              "evidenceQuote",
              "gapExplanation",
              "suggestedAddition",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["overallSummary", "coverageScore", "results"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as AnalyzeRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    if (!body.documentText || body.documentText.trim().length < 50) {
      return new Response(
        JSON.stringify({
          error:
            "The uploaded document does not contain enough extractable text. If it is scanned, please run OCR first.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Cap text to keep prompt size reasonable. Gemini 2.5 Pro handles long
    // context but huge policies still bloat latency/cost.
    const MAX_CHARS = 80_000;
    const truncated = body.documentText.length > MAX_CHARS;
    const text = truncated ? body.documentText.slice(0, MAX_CHARS) : body.documentText;

    const systemPrompt = `You are Complee's compliance analyst for European fintech licensing (EMI / PI / AISP / PISP). You receive an uploaded policy document from a fintech and a list of substeps that the regulator expects for a specific requirement. Your job is to evaluate, substep by substep, whether the document already covers what the regulator wants.

Rules:
- Be strict but fair. "Covered" means the document clearly addresses the substep with concrete language. "Partial" means the topic is touched but missing detail (process owners, frequency, controls, escalation, etc.). "Missing" means it is not addressed.
- Evidence quotes must be verbatim from the document (max ~25 words). Use the empty string if the substep is missing.
- Gap explanations must be concrete and actionable. Avoid generic phrases like "needs more detail".
- Suggested additions must be production-grade prose the fintech could paste straight into the policy. Match a formal compliance tone.
- Always return one entry per substep, in the same order, using the provided substepId values.
- Never invent regulator citations.`;

    const userPrompt = `Requirement: ${body.requirementTitle}
Regulator: ${body.authority} (${body.country})
Regulation: ${body.regulationReference}

Substeps the regulator expects:
${body.substeps
  .map((s, i) => `${i + 1}. [${s.id}] ${s.title} — ${s.detail}`)
  .join("\n")}

Uploaded document: "${body.documentName}"
${truncated ? "(Note: document was truncated for length. Base your analysis on the excerpt below.)\n" : ""}
--- DOCUMENT START ---
${text}
--- DOCUMENT END ---

For each substep, decide whether the document covers it, and provide the structured fields described in the tool schema.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [tool],
        tool_choice: { type: "function", function: { name: "report_policy_coverage" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Add funds in Settings → Workspace → Usage.",
          }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const completion = await response.json();
    const toolCall = completion?.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(completion).slice(0, 500));
      return new Response(
        JSON.stringify({ error: "AI did not return a structured analysis. Please retry." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: {
      overallSummary: string;
      coverageScore: number;
      results: CoverageResult[];
    };
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch (e) {
      console.error("Failed to parse tool args:", e);
      return new Response(
        JSON.stringify({ error: "AI returned malformed analysis. Please retry." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Pad/align results to substep order to be defensive against AI omissions.
    const byId = new Map(parsed.results.map((r) => [r.substepId, r]));
    const aligned: CoverageResult[] = body.substeps.map((s) => {
      const found = byId.get(s.id);
      if (found) return found;
      return {
        substepId: s.id,
        substepTitle: s.title,
        status: "missing",
        evidenceQuote: "",
        gapExplanation: "Not addressed in the uploaded document.",
        suggestedAddition: "",
      };
    });

    return new Response(
      JSON.stringify({
        overallSummary: parsed.overallSummary,
        coverageScore: Math.max(0, Math.min(100, Math.round(parsed.coverageScore))),
        results: aligned,
        truncated,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("analyze-policy error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
