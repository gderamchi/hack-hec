// Complee — AI Assistant chat endpoint.
// Streams answers from Lovable AI Gateway. The frontend passes the current
// step context (requirement title, regulator, substeps, summary) so answers
// stay grounded in what the user is doing right now.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface StepContext {
  requirementTitle?: string;
  authority?: string;
  regulationReference?: string;
  country?: string;
  summary?: string;
  substeps?: { title: string; detail: string }[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as {
      messages: ChatMessage[];
      stepContext?: StepContext;
    };

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const ctx = body.stepContext;
    const contextBlock = ctx
      ? `\n\nThe user is currently working on this regulatory step:
- Title: ${ctx.requirementTitle ?? "n/a"}
- Authority: ${ctx.authority ?? "n/a"} (${ctx.country ?? "n/a"})
- Regulation: ${ctx.regulationReference ?? "n/a"}
- Goal: ${ctx.summary ?? "n/a"}
- Substeps:
${(ctx.substeps ?? []).map((s, i) => `  ${i + 1}. ${s.title} — ${s.detail}`).join("\n")}

Tailor your answer to this specific step. If the user asks something unrelated to compliance / fintech licensing, politely steer them back.`
      : "";

    const systemPrompt = `You are Complee's in-app AI compliance assistant for European fintechs (EMI / PI / AISP / PISP licensing).
Be concise (3-6 sentences typically), practical, and concrete. Use markdown for short lists when it helps.
Always:
- Explain *why* a requirement exists, not only what to do.
- Reference the relevant regulator (FCA, BaFin, ACPR, DNB, Banco de España) and rule when useful.
- Prefer plain English over legalese.
- If a question is ambiguous, ask one clarifying question.
- Never invent regulation references.${contextBlock}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: systemPrompt }, ...body.messages],
        stream: true,
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

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("assistant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
