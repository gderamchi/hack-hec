import type { AnalysisResult, CompanyProfile, UploadedDocument } from "@/lib/types";

type PersistInput = {
  companyProfile: CompanyProfile;
  documents: UploadedDocument[];
  result: AnalysisResult;
};

export type PersistenceOutcome =
  | { status: "saved"; detail: string }
  | { status: "skipped"; detail: string }
  | { status: "failed"; detail: string };

export async function persistAnalysisRun(
  input: PersistInput
): Promise<PersistenceOutcome> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return {
      status: "skipped",
      detail: "Supabase env vars are missing; analysis was not persisted."
    };
  }

  try {
    await insertRows(supabaseUrl, serviceRoleKey, "analysis_runs", [
      {
        id: input.result.runId,
        company_name: input.companyProfile.companyName,
        company_type: input.companyProfile.companyType,
        country: input.companyProfile.country,
        services: input.companyProfile.services,
        summary: input.result.summary,
        analysis_engine: input.result.diagnostics?.engine ?? null,
        model: input.result.diagnostics?.model ?? null,
        reasoning_effort: input.result.diagnostics?.reasoningEffort ?? null,
        analysis_warnings: input.result.diagnostics?.warnings ?? [],
        regulatory_sources: input.result.diagnostics?.regulatorySources ?? []
      }
    ]);

    await insertRows(
      supabaseUrl,
      serviceRoleKey,
      "analysis_documents",
      input.documents.map((document) => ({
        run_id: input.result.runId,
        name: document.name,
        type: document.type,
        content: document.content
      }))
    );

    await insertRows(
      supabaseUrl,
      serviceRoleKey,
      "evidence_matrix_items",
      input.result.matrix.map((item) => ({
        run_id: input.result.runId,
        requirement_id: item.requirementId,
        domain: item.domain,
        requirement_title: item.requirementTitle,
        regulatory_reference: item.regulatoryReference ?? null,
        source_url: item.sourceUrl ?? null,
        status: item.status,
        evidence_found: item.evidenceFound,
        source_document: item.sourceDocument ?? null,
        evidence_excerpt: item.evidenceExcerpt ?? null,
        missing_evidence: item.missingEvidence,
        priority: item.priority,
        confidence: item.confidence,
        recommended_task: item.recommendedTask
      }))
    );

    await insertRows(
      supabaseUrl,
      serviceRoleKey,
      "roadmap_tasks",
      input.result.roadmap.map((task) => ({
        run_id: input.result.runId,
        title: task.title,
        owner: task.owner,
        priority: task.priority,
        deadline: task.deadline,
        evidence_required: task.evidenceRequired,
        acceptance_criteria: task.acceptanceCriteria,
        linked_requirement_ids: task.linkedRequirementIds
      }))
    );

    return {
      status: "saved",
      detail: "Analysis run, source documents, matrix and roadmap were saved to Supabase."
    };
  } catch (error) {
    console.warn("Supabase persistence skipped after an error.", error);
    return {
      status: "failed",
      detail:
        error instanceof Error
          ? `Supabase persistence failed: ${error.message}`
          : "Supabase persistence failed with an unknown error."
    };
  }
}

async function insertRows(
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  rows: unknown[]
) {
  if (rows.length === 0) return;

  const response = await fetch(`${supabaseUrl}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(rows)
  });

  if (!response.ok) {
    throw new Error(`Supabase insert failed for ${table}: ${response.status}`);
  }
}
