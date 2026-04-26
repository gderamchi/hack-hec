import { strict as assert } from "node:assert";
import { applyEvidenceGate } from "@/lib/evidence-gate";
import { runFallbackAnalysis } from "@/lib/fallback-analyzer";
import {
  activeRegulationsForProfile,
  mapCompanyProfileToOperatingModel
} from "@/lib/profile-mapper";
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

const operatingModel = mapCompanyProfileToOperatingModel(profile);
assert.equal(operatingModel.companyName, profile.companyName);
assert.equal(operatingModel.companyType, "Payment Institution");
assert.equal(operatingModel.country, "United Kingdom");
assert.ok(
  operatingModel.services.includes("Payment initiation"),
  "Expected selected service to seed the Live Agent operating model."
);
assert.ok(
  operatingModel.teams.includes("Engineering"),
  "Expected technical payment services to add Engineering to the Live Agent profile."
);
assert.ok(
  operatingModel.internalAssets.some((asset) => asset.name.includes("Expansion Evidence Pack")),
  "Expected cross-border profiles to add an expansion evidence pack asset."
);
assert.deepEqual(activeRegulationsForProfile(profile), [
  "DORA",
  "PSD3/PSR",
  "FCA Consumer Duty"
]);

console.log(
  JSON.stringify(
    {
      mappedCompleeRequirements: compleeRequirements.map((requirement) => requirement.id),
      operatingModel: {
        companyName: operatingModel.companyName,
        companyType: operatingModel.companyType,
        country: operatingModel.country,
        services: operatingModel.services,
        teams: operatingModel.teams,
        activeRegulations: activeRegulationsForProfile(profile)
      },
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
