import { strict as assert } from "node:assert";
import { POST } from "@/app/api/analyze/route";
import type { AnalysisResult, CompanyProfile, UploadedDocument } from "@/lib/types";

process.env.OPENAI_API_KEY = "";
process.env.SUPABASE_URL = "";
process.env.NEXT_PUBLIC_SUPABASE_URL = "";
process.env.SUPABASE_SERVICE_ROLE_KEY = "";

const profile: CompanyProfile = {
  companyName: "FlowPay Europe",
  companyType: "Payment Institution",
  institutionType: "PI",
  country: "United Kingdom",
  homeCountry: "France",
  targetCountry: "United Kingdom",
  assessmentMode: "cross_border",
  services: ["Electronic money issuance"]
};

const document: UploadedDocument = {
  name: "flowpay-uk-expansion-evidence-shell.txt",
  type: "text/plain",
  content: [
    "UK target market authorisation licence service scope application checklist competent authority registration.",
    "Governance risk management consumer duty complaints customer outcome integrity screening internal control outsourcing board.",
    "MLRO financial crime suspicious activity safeguarding reconciliation customer funds incident dashboard audit event.",
    "Customer terms fee charges receipt dispute alternative dispute resolution support refund reimbursement liability customer outcome.",
    "Fraud policy fraud monitoring transaction monitoring risk score scam warning suspicious transaction freeze fraud reporting customer education.",
    "Electronic money safeguarding segregated account concentration risk board oversight."
  ].join("\n")
};

async function main() {
  const response = await POST(
    new Request("http://localhost/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        companyProfile: profile,
        documents: [document]
      })
    })
  );
  const payload = (await response.json()) as AnalysisResult | { error?: string };

  assert.equal(response.status, 200, JSON.stringify(payload));

  const result = payload as AnalysisResult;
  const compleeRows = result.matrix.filter((row) =>
    row.requirementId.startsWith("COMPLEE-")
  );

  assert.ok(
    compleeRows.length > 0,
    "Expected /api/analyze to include mapped Complee expansion rows."
  );
  assert.equal(
    compleeRows.filter((row) => row.status === "Covered").length,
    0,
    "Complee expansion rows must not become Covered without operational source evidence."
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        route: "/api/analyze",
        summary: result.summary,
        compleeRows: compleeRows.map((row) => ({
          requirementId: row.requirementId,
          status: row.status
        })),
        diagnostics: result.diagnostics
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
