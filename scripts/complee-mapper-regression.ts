import { strict as assert } from "node:assert";
import { applyEvidenceGate } from "@/lib/evidence-gate";
import { runFallbackAnalysis } from "@/lib/fallback-analyzer";
import { getRelevantRequirements } from "@/lib/requirement-scope";
import type { CompanyProfile, UploadedDocument } from "@/lib/types";

const profile: CompanyProfile = {
  companyName: "FlowPay Europe",
  companyType: "Payment Institution",
  institutionType: "PI",
  country: "United Kingdom",
  homeCountry: "France",
  targetCountry: "United Kingdom",
  assessmentMode: "cross_border",
  services: [
    "Instant credit transfers",
    "Payment initiation",
    "Fraud monitoring",
    "Electronic money issuance"
  ]
};

const nonEvidenceDocument: UploadedDocument = {
  name: "workspace-note.txt",
  type: "text/plain",
  content:
    "FlowPay is considering a UK launch. This note lists expected evidence only and does not include operational logs, approval records, test results or screenshots."
};

const requirements = getRelevantRequirements(profile);
const compleeRequirements = requirements.filter((requirement) =>
  requirement.id.startsWith("COMPLEE-")
);

assert.ok(
  compleeRequirements.length > 0,
  "Expected Complee expansion requirements to be mapped into the requirement base."
);

const baseline = runFallbackAnalysis(profile, [nonEvidenceDocument]);
const gated = applyEvidenceGate({
  companyProfile: profile,
  documents: [nonEvidenceDocument],
  result: baseline
});

const compleeRows = gated.result.matrix.filter((item) =>
  item.requirementId.startsWith("COMPLEE-")
);

assert.equal(
  compleeRows.length,
  compleeRequirements.length,
  "Expected every mapped Complee requirement to appear in the evidence matrix."
);
assert.equal(
  compleeRows.filter((item) => item.status === "Covered").length,
  0,
  "Mapped Complee requirements must not become Covered without source evidence."
);

console.log(
  JSON.stringify(
    {
      mappedCompleeRequirements: compleeRequirements.map((requirement) => requirement.id),
      compleeRows: compleeRows.map((row) => ({
        requirementId: row.requirementId,
        status: row.status,
        missingEvidence: row.missingEvidence
      }))
    },
    null,
    2
  )
);
