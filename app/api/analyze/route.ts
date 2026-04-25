import { evaluateRequiredDocuments } from "@/data/document-requirements";
import { analyzeWithOpenAI } from "@/lib/ai-analyzer";
import { REGULATORY_SOURCE_SUMMARY } from "@/lib/app-config";
import { applyEvidenceGate } from "@/lib/evidence-gate";
import { runFallbackAnalysis } from "@/lib/fallback-analyzer";
import { persistAnalysisRun } from "@/lib/persistence";
import { analyzeRequestSchema, analysisResultSchema } from "@/lib/schemas";
import { DISCLAIMER, type AnalysisDiagnostics, type AnalysisResult } from "@/lib/types";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = analyzeRequestSchema.safeParse(body);

  if (!parsed.success) {
    return Response.json(
      {
        error: "Invalid analysis request",
        details: parsed.error.flatten()
      },
      { status: 400 }
    );
  }

  const documentCheck = evaluateRequiredDocuments(
    parsed.data.companyProfile,
    parsed.data.documents
  );

  if (documentCheck.missing.length > 0) {
    return Response.json(
      {
        error: "Missing required documents for selected services",
        missingRequiredDocuments: documentCheck.missing.map((document) => ({
          id: document.id,
          title: document.title,
          description: document.description,
          requirementIds: document.requirementIds
        }))
      },
      { status: 400 }
    );
  }

  const fallbackBaseline = runFallbackAnalysis(parsed.data.companyProfile, parsed.data.documents);
  const aiOutcome = await analyzeWithOpenAI(parsed.data);
  const completedAiResult = aiOutcome.result
    ? completeMatrixWithBaseline(aiOutcome.result, fallbackBaseline)
    : null;
  const usedFallback = !completedAiResult;
  const result = completedAiResult?.result ?? fallbackBaseline;
  const gated = applyEvidenceGate({
    companyProfile: parsed.data.companyProfile,
    documents: parsed.data.documents,
    result
  });
  const normalizedResult = normalizeResult({
    ...gated.result,
    disclaimer: DISCLAIMER,
    diagnostics: buildDiagnostics({
      engine: usedFallback ? "fallback" : "openai",
      model: usedFallback ? undefined : aiOutcome.model,
      reasoningEffort: usedFallback ? undefined : aiOutcome.reasoningEffort,
      warnings: usedFallback
        ? [
            ...aiOutcome.warnings,
            ...gated.warnings,
            "The returned matrix was produced by the deterministic keyword fallback."
          ]
        : [...aiOutcome.warnings, ...completedAiResult.warnings, ...gated.warnings]
    })
  });
  const validated = analysisResultSchema.safeParse(normalizedResult);

  if (!validated.success) {
    const fallbackBaselineResult = runFallbackAnalysis(
      parsed.data.companyProfile,
      parsed.data.documents
    );
    const fallbackGate = applyEvidenceGate({
      companyProfile: parsed.data.companyProfile,
      documents: parsed.data.documents,
      result: fallbackBaselineResult
    });
    const fallback = normalizeResult({
      ...fallbackGate.result,
      diagnostics: buildDiagnostics({
        engine: "fallback",
        warnings: [
          "The OpenAI result did not validate against the app schema.",
          ...fallbackGate.warnings,
          "The returned matrix was produced by the deterministic keyword fallback."
        ]
      })
    });
    const persistence = await persistAnalysisRun({
      companyProfile: parsed.data.companyProfile,
      documents: parsed.data.documents,
      result: fallback
    });
    return Response.json({
      ...fallback,
      diagnostics: {
        ...fallback.diagnostics,
        persistence
      }
    });
  }

  const persistence = await persistAnalysisRun({
    companyProfile: parsed.data.companyProfile,
    documents: parsed.data.documents,
    result: validated.data
  });

  return Response.json({
    ...validated.data,
    diagnostics: {
      ...validated.data.diagnostics,
      persistence
    }
  });
}

function buildDiagnostics({
  engine,
  model,
  reasoningEffort,
  warnings
}: {
  engine: AnalysisDiagnostics["engine"];
  model?: string;
  reasoningEffort?: string;
  warnings: string[];
}): AnalysisDiagnostics {
  return {
    engine,
    model,
    reasoningEffort,
    generatedAt: new Date().toISOString(),
    warnings,
    persistence: {
      status: "skipped",
      detail: "Persistence has not run yet."
    },
    regulatorySources: [...REGULATORY_SOURCE_SUMMARY]
  };
}

function normalizeResult(result: AnalysisResult): AnalysisResult {
  return {
    ...result,
    runId: isUuid(result.runId) ? result.runId : crypto.randomUUID(),
    disclaimer: DISCLAIMER
  };
}

function completeMatrixWithBaseline(
  result: AnalysisResult,
  baseline: AnalysisResult
): { result: AnalysisResult; warnings: string[] } {
  const existingIds = new Set(result.matrix.map((item) => item.requirementId));
  const missingRows = baseline.matrix.filter((item) => !existingIds.has(item.requirementId));
  const baselineById = new Map(
    baseline.matrix.map((item) => [item.requirementId, item])
  );
  const matrix = [
    ...result.matrix.map((item) => {
      const baselineItem = baselineById.get(item.requirementId);
      return {
        ...item,
        regulatoryReference: item.regulatoryReference ?? baselineItem?.regulatoryReference,
        sourceUrl: item.sourceUrl ?? baselineItem?.sourceUrl
      };
    }),
    ...missingRows
  ];

  return {
    result: {
      ...result,
      matrix,
      summary: summarizeMatrix(matrix)
    },
    warnings: missingRows.length
      ? [
          `OpenAI omitted ${missingRows.length} source-backed requirement(s); deterministic baseline rows were appended.`
        ]
      : []
  };
}

function summarizeMatrix(matrix: AnalysisResult["matrix"]): AnalysisResult["summary"] {
  return matrix.reduce(
    (summary, item) => {
      summary.totalRequirements += 1;
      if (item.status === "Covered") {
        summary.covered += 1;
      } else if (item.status === "Partially covered") {
        summary.partiallyCovered += 1;
      } else if (item.status === "Not evidenced") {
        summary.notEvidenced += 1;
      } else {
        summary.needsHumanReview += 1;
      }
      return summary;
    },
    {
      totalRequirements: 0,
      covered: 0,
      partiallyCovered: 0,
      notEvidenced: 0,
      needsHumanReview: 0
    }
  );
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}
