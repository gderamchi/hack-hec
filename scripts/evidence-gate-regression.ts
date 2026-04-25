import { strict as assert } from "node:assert";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { applyEvidenceGate } from "@/lib/evidence-gate";
import { runFallbackAnalysis } from "@/lib/fallback-analyzer";
import { getRelevantRequirements } from "@/lib/requirement-scope";
import {
  SERVICES,
  type AnalysisResult,
  type CompanyProfile,
  type RequirementStatus,
  type UploadedDocument
} from "@/lib/types";

const cwd = process.cwd();
const generatedDir = join(cwd, "evidence", "evidence-gate-fixtures", "atlas-payments");

const fullServiceProfile: CompanyProfile = {
  companyName: "Atlas Payments EU",
  companyType: "Electronic Money Institution",
  country: "France",
  services: [...SERVICES]
};

function main() {
  const syntheticDocs = generateSyntheticDocuments();
  const completeResult = gatedResult(fullServiceProfile, [syntheticDocs.complete]);
  const partialResult = gatedResult(fullServiceProfile, [syntheticDocs.partial]);
  const emptyResult = gatedResult(fullServiceProfile, [syntheticDocs.empty]);

  assertAllStatuses(completeResult, "Covered");
  assertAllStatuses(partialResult, "Partially covered");
  assertAllStatuses(emptyResult, "Not evidenced");

  console.log(
    JSON.stringify(
      {
        generatedDir,
        completeSummary: completeResult.summary,
        partialSummary: partialResult.summary,
        emptySummary: emptyResult.summary
      },
      null,
      2
    )
  );
}

function generateSyntheticDocuments(): {
  complete: UploadedDocument;
  partial: UploadedDocument;
  empty: UploadedDocument;
} {
  mkdirSync(generatedDir, { recursive: true });
  const requirements = getRelevantRequirements(fullServiceProfile);
  const complete = requirements
    .map(
      (requirement) => `Requirement ${requirement.id}: ${requirement.title}
Atlas Payments EU supervisory evidence register entry.
Operational evidence retained for ${requirement.domain}:
${requirement.expectedEvidence
  .map(
    (item) =>
      `- ${item}. Log extract, screenshot, approval record, test result and audit event retained.`
  )
  .join("\n")}`
    )
    .join("\n\n");
  const partial = requirements
    .map(
      (requirement) => `Requirement ${requirement.id}: ${requirement.title}
Atlas Payments EU policy statement.
The policy sets ownership and governance for ${requirement.domain}. Operational artefact collection is pending.`
    )
    .join("\n\n");
  const empty =
    "Atlas Payments EU corporate overview. The company supports merchant commerce operations in the European Union.";

  writeFixture("covered-pack.txt", complete);
  writeFixture("partial-pack.txt", partial);
  writeFixture("not-evidenced-pack.txt", empty);

  return {
    complete: {
      name: "covered-pack.txt",
      type: "text/plain",
      content: complete
    },
    partial: {
      name: "partial-pack.txt",
      type: "text/plain",
      content: partial
    },
    empty: {
      name: "not-evidenced-pack.txt",
      type: "text/plain",
      content: empty
    }
  };
}

function writeFixture(fileName: string, content: string) {
  writeFileSync(join(generatedDir, fileName), `${content}\n`);
}

function gatedResult(
  companyProfile: CompanyProfile,
  documents: UploadedDocument[]
): AnalysisResult {
  const baseline = runFallbackAnalysis(companyProfile, documents);
  const gated = applyEvidenceGate({
    companyProfile,
    documents,
    result: baseline
  });

  return {
    ...gated.result,
    diagnostics: {
      engine: "fallback",
      generatedAt: new Date(0).toISOString(),
      warnings: gated.warnings,
      persistence: {
        status: "skipped",
        detail: "Regression test only."
      },
      regulatorySources: []
    }
  };
}

function assertAllStatuses(result: AnalysisResult, status: RequirementStatus) {
  const mismatches = result.matrix.filter((item) => item.status !== status);
  assert.deepEqual(
    mismatches.map((item) => ({
      requirementId: item.requirementId,
      actual: item.status,
      expected: status,
      evidenceFound: item.evidenceFound
    })),
    [],
    `Expected every row to be ${status}.`
  );
}

main();
