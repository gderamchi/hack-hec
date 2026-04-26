import {
  DEFAULT_OPENAI_MODEL,
  DEFAULT_OPENAI_REASONING_EFFORT
} from "@/lib/app-config";
import { getRelevantRequirements } from "@/lib/requirement-scope";
import { analysisResultSchema } from "@/lib/schemas";
import {
  DISCLAIMER,
  type AnalysisResult,
  type CompanyProfile,
  type UploadedDocument
} from "@/lib/types";

type AnalyzeInput = {
  companyProfile: CompanyProfile;
  documents: UploadedDocument[];
};

export type AiAnalysisOutcome = {
  result: AnalysisResult | null;
  model: string;
  reasoningEffort: string;
  warnings: string[];
};

export async function analyzeWithOpenAI(
  input: AnalyzeInput
): Promise<AiAnalysisOutcome> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL;
  const reasoningEffort =
    process.env.OPENAI_REASONING_EFFORT ?? DEFAULT_OPENAI_REASONING_EFFORT;
  const warnings: string[] = [];

  if (!apiKey) {
    return {
      result: null,
      model,
      reasoningEffort,
      warnings: ["OPENAI_API_KEY is missing; used deterministic fallback analyzer."]
    };
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 75_000);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        signal: controller.signal,
        body: JSON.stringify({
          model,
          reasoning: {
            effort: reasoningEffort
          },
          input: [
            {
              role: "system",
              content:
                "You are a fintech compliance readiness analyst for payment product, compliance and engineering teams. You handle PSD3/PSR evidence checks and cross-border European expansion packs. Return strict JSON only. Never say compliant or non-compliant. Never certify compliance. Every positive claim must cite a source document and excerpt. If there is no evidence, say Not evidenced in the uploaded documents. Generate practical backlog tasks, not generic legal advice. Use the regulatory source references included in each requirement."
            },
            {
              role: "user",
              content: JSON.stringify({
                instructions:
                  "Analyze the company and documents against the provided requirement base. Return exactly the AnalysisResult shape with runId, summary, matrix, roadmap and disclaimer. Use statuses only: Covered, Partially covered, Not evidenced, Needs human review. Cross-border requirements must still be evidence-gated; never mark a row Covered from regulatory expectation alone.",
                disclaimer: DISCLAIMER,
                companyProfile: input.companyProfile,
                documents: input.documents,
                requirementBase: getRelevantRequirements(input.companyProfile)
              })
            }
          ],
          text: {
            format: {
              type: "json_schema",
              name: "psd3_psr_analysis_result",
              strict: true,
              schema: ANALYSIS_RESULT_JSON_SCHEMA
            }
          }
        })
      });
      clearTimeout(timeout);

      if (!response.ok) {
        warnings.push(`OpenAI attempt ${attempt + 1} failed with HTTP ${response.status}.`);
        continue;
      }

      const payload = await response.json();
      const parsed = normalizeOpenAiResult(parseResponsePayload(payload));
      const validated = analysisResultSchema.safeParse(parsed);
      if (validated.success) {
        return {
          result: {
            ...validated.data,
            disclaimer: DISCLAIMER
          },
          model,
          reasoningEffort,
          warnings
        };
      }
      warnings.push(`OpenAI attempt ${attempt + 1} returned JSON that did not match the app schema.`);
    } catch (error) {
      const message =
        error instanceof Error && error.name === "AbortError"
          ? "timed out"
          : "failed before a valid JSON result was returned";
      warnings.push(`OpenAI attempt ${attempt + 1} ${message}.`);
      continue;
    }
  }

  return {
    result: null,
    model,
    reasoningEffort,
    warnings: warnings.length
      ? warnings
      : ["OpenAI did not return a usable result; used deterministic fallback analyzer."]
  };
}

function parseResponsePayload(payload: unknown): unknown {
  const maybePayload = payload as {
    output_text?: string;
    output?: Array<{
      content?: Array<{
        text?: string;
        type?: string;
      }>;
    }>;
  };

  const text =
    maybePayload.output_text ??
    maybePayload.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n");

  if (!text) {
    return {};
  }

  const normalized = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  return JSON.parse(normalized);
}

function normalizeOpenAiResult(value: unknown): unknown {
  if (!value || typeof value !== "object") {
    return value;
  }

  const result = value as Record<string, unknown>;
  return {
    ...result,
    matrix: Array.isArray(result.matrix)
      ? result.matrix.map((item) => {
          if (!item || typeof item !== "object") {
            return item;
          }
          const matrixItem = item as Record<string, unknown>;
          return {
            ...matrixItem,
            sourceDocument:
              typeof matrixItem.sourceDocument === "string"
                ? matrixItem.sourceDocument
                : undefined,
            evidenceExcerpt:
              typeof matrixItem.evidenceExcerpt === "string"
                ? matrixItem.evidenceExcerpt
                : undefined,
            regulatoryReference:
              typeof matrixItem.regulatoryReference === "string"
                ? matrixItem.regulatoryReference
                : undefined,
            sourceUrl:
              typeof matrixItem.sourceUrl === "string" ? matrixItem.sourceUrl : undefined
          };
        })
      : result.matrix
  };
}

const ANALYSIS_RESULT_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["runId", "summary", "matrix", "roadmap", "disclaimer"],
  properties: {
    runId: { type: "string" },
    summary: {
      type: "object",
      additionalProperties: false,
      required: [
        "totalRequirements",
        "covered",
        "partiallyCovered",
        "notEvidenced",
        "needsHumanReview"
      ],
      properties: {
        totalRequirements: { type: "integer", minimum: 0 },
        covered: { type: "integer", minimum: 0 },
        partiallyCovered: { type: "integer", minimum: 0 },
        notEvidenced: { type: "integer", minimum: 0 },
        needsHumanReview: { type: "integer", minimum: 0 }
      }
    },
    matrix: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "requirementId",
          "domain",
          "requirementTitle",
          "regulatoryReference",
          "sourceUrl",
          "status",
          "evidenceFound",
          "sourceDocument",
          "evidenceExcerpt",
          "missingEvidence",
          "priority",
          "confidence",
          "recommendedTask"
        ],
        properties: {
          requirementId: { type: "string" },
          domain: { type: "string" },
          requirementTitle: { type: "string" },
          regulatoryReference: { type: ["string", "null"] },
          sourceUrl: { type: ["string", "null"] },
          status: {
            type: "string",
            enum: ["Covered", "Partially covered", "Not evidenced", "Needs human review"]
          },
          evidenceFound: { type: "string" },
          sourceDocument: { type: ["string", "null"] },
          evidenceExcerpt: { type: ["string", "null"] },
          missingEvidence: {
            type: "array",
            items: { type: "string" }
          },
          priority: {
            type: "string",
            enum: ["Low", "Medium", "High", "Critical"]
          },
          confidence: { type: "number", minimum: 0, maximum: 1 },
          recommendedTask: { type: "string" }
        }
      }
    },
    roadmap: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "owner",
          "priority",
          "deadline",
          "evidenceRequired",
          "acceptanceCriteria",
          "linkedRequirementIds"
        ],
        properties: {
          title: { type: "string" },
          owner: { type: "string" },
          priority: {
            type: "string",
            enum: ["Low", "Medium", "High", "Critical"]
          },
          deadline: {
            type: "string",
            enum: ["30 days", "60 days", "90 days", "180 days"]
          },
          evidenceRequired: {
            type: "array",
            items: { type: "string" }
          },
          acceptanceCriteria: { type: "string" },
          linkedRequirementIds: {
            type: "array",
            items: { type: "string" }
          }
        }
      }
    },
    disclaimer: { type: "string" }
  }
} as const;
