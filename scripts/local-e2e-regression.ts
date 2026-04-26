import { strict as assert } from "node:assert";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Page } from "@playwright/test";
import { getRequiredDocuments } from "@/data/document-requirements";
import { mapCompanyProfileToOperatingModel } from "@/lib/profile-mapper";
import { getRelevantRequirements } from "@/lib/requirement-scope";
import type {
  AnalysisResult,
  CompanyProfile,
  Requirement,
  RequirementStatus,
  UploadedDocument
} from "@/lib/types";

type ExpectedStatusMap = Record<string, RequirementStatus>;

type ApiCase = {
  id: string;
  profile: CompanyProfile;
  documents: UploadedDocument[];
  expectedStatuses?: ExpectedStatusMap;
  expectedError?: string;
};

type CaseReport = {
  id: string;
  pass: boolean;
  summary: string;
  diagnostics?: AnalysisResult["diagnostics"];
};

const baseUrl = process.env.LOCAL_E2E_BASE_URL ?? "http://127.0.0.1:3000";
const runUi = process.env.LOCAL_E2E_SKIP_UI !== "1";
const outputDir = join(tmpdir(), `hack-hec-local-e2e-${Date.now()}`);

async function main() {
  mkdirSync(outputDir, { recursive: true });
  await waitForServer();

  const apiReports: CaseReport[] = [];
  for (const testCase of buildApiCases()) {
    apiReports.push(await runAnalyzeCase(testCase));
  }

  const monitorReport = await runMonitorCase();
  const agentReport = await runAgentCase();
  const uiReport = runUi ? await runUiCase() : { id: "ui-flow", pass: true, summary: "skipped" };

  const reports = [...apiReports, monitorReport, agentReport, uiReport];
  const failed = reports.filter((report) => !report.pass);
  const report = {
    baseUrl,
    outputDir,
    reports,
    passed: reports.length - failed.length,
    failed: failed.length
  };

  console.log(JSON.stringify(report, null, 2));

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function buildApiCases(): ApiCase[] {
  const crossBorderCovered: CompanyProfile = {
    companyName: "Generated Atlas EMI UK",
    companyType: "Electronic Money Institution",
    institutionType: "EMI",
    assessmentMode: "cross_border",
    country: "United Kingdom",
    homeCountry: "France",
    targetCountry: "United Kingdom",
    services: ["Electronic money issuance", "Payment initiation", "Fraud monitoring"]
  };
  const openBankingPartial: CompanyProfile = {
    companyName: "Generated Clearbridge AIS",
    companyType: "Open Banking Provider",
    institutionType: "AISP",
    assessmentMode: "psd3_psr",
    country: "Netherlands",
    services: [
      "Open banking account access",
      "Payment initiation",
      "Strong customer authentication"
    ]
  };
  const fraudExpectedOnly: CompanyProfile = {
    companyName: "Generated Sentinel Fraud",
    companyType: "Payment Institution",
    assessmentMode: "psd3_psr",
    country: "France",
    services: ["Fraud monitoring"]
  };
  const missingDocs: CompanyProfile = {
    companyName: "Generated Sparse AIS",
    companyType: "Open Banking Provider",
    assessmentMode: "psd3_psr",
    country: "France",
    services: ["Open banking account access"]
  };

  return [
    {
      id: "api-cross-border-all-covered",
      profile: crossBorderCovered,
      expectedStatuses: statusMap(crossBorderCovered, "Covered"),
      documents: [
        allRequiredShell(crossBorderCovered),
        evidenceDocument(crossBorderCovered, "covered", "operational")
      ]
    },
    {
      id: "api-open-banking-all-partial",
      profile: openBankingPartial,
      expectedStatuses: statusMap(openBankingPartial, "Partially covered"),
      documents: [
        allRequiredShell(openBankingPartial),
        evidenceDocument(openBankingPartial, "partial", "procedure")
      ]
    },
    {
      id: "api-fraud-expected-only-not-evidenced",
      profile: fraudExpectedOnly,
      expectedStatuses: statusMap(fraudExpectedOnly, "Not evidenced"),
      documents: [
        allRequiredShell(fraudExpectedOnly),
        evidenceDocument(fraudExpectedOnly, "expected-only", "expected-only")
      ]
    },
    {
      id: "api-missing-required-documents",
      profile: missingDocs,
      expectedError: "Missing required documents for selected services",
      documents: [
        {
          name: "general-company-overview.txt",
          type: "text/plain",
          content:
            "Generated Sparse AIS has a product overview. The required authorisation, SCA, support, fee and open-banking packs are intentionally absent."
        }
      ]
    }
  ];
}

async function runAnalyzeCase(testCase: ApiCase): Promise<CaseReport> {
  const response = await postJson("/api/analyze", {
    companyProfile: testCase.profile,
    documents: testCase.documents
  });
  const payload = (await response.json().catch(() => ({}))) as
    | AnalysisResult
    | { error?: string };

  if (testCase.expectedError) {
    assert.equal(response.status, 400, JSON.stringify(payload));
    assert.equal((payload as { error?: string }).error, testCase.expectedError);
    return {
      id: testCase.id,
      pass: true,
      summary: `expected HTTP 400: ${testCase.expectedError}`
    };
  }

  assert.equal(response.status, 200, JSON.stringify(payload));
  const result = payload as AnalysisResult;
  assertExpectedStatuses(testCase.id, result, testCase.expectedStatuses ?? {});
  assert.ok(result.diagnostics, `${testCase.id}: expected diagnostics from real route`);

  return {
    id: testCase.id,
    pass: true,
    summary: summarizeResult(result),
    diagnostics: result.diagnostics
  };
}

async function runMonitorCase(): Promise<CaseReport> {
  const profile: CompanyProfile = {
    companyName: "Generated MonitorPay",
    companyType: "Payment Institution",
    assessmentMode: "psd3_psr",
    country: "France",
    services: ["Payment initiation", "Fraud monitoring"]
  };
  const response = await postJson("/api/monitor", {
    regulationText: [
      "Generated PSD3/PSR amendment: payment service providers must verify payee names before execution.",
      "Providers must keep audit events, customer warning copy, fraud scoring logs and dispute escalation records.",
      "Effective date: 1 September 2026. Jurisdiction: EU."
    ].join("\n"),
    operatingModel: mapCompanyProfileToOperatingModel(profile)
  });
  const payload = (await response.json().catch(() => ({}))) as {
    mode?: string;
    error?: string;
    propagation?: { relevance_score?: number };
    extraction?: { obligation_groups?: unknown[] };
  };

  assert.equal(response.status, 200, JSON.stringify(payload));
  assert.equal(payload.mode, "propagation", JSON.stringify(payload));
  assert.ok(payload.propagation, "Expected monitor propagation result");

  return {
    id: "api-monitor-propagation",
    pass: true,
    summary: `mode=${payload.mode}; relevance=${payload.propagation?.relevance_score ?? "n/a"}`
  };
}

async function runAgentCase(): Promise<CaseReport> {
  const profile: CompanyProfile = {
    companyName: "Generated AgentPay",
    companyType: "Payment Institution",
    assessmentMode: "psd3_psr",
    country: "United Kingdom",
    services: ["Payment initiation", "Fraud monitoring"]
  };
  const createResponse = await postJson("/api/agent/profile", {
    operatingModel: mapCompanyProfileToOperatingModel(profile),
    activeRegulations: ["DORA", "PSD3/PSR", "FCA Consumer Duty"]
  });
  const createPayload = (await createResponse.json()) as {
    profile?: { id?: string; active_regulations?: string[] };
    error?: string;
  };
  assert.equal(createResponse.status, 200, JSON.stringify(createPayload));
  assert.ok(createPayload.profile?.id, "Expected created agent profile id");

  const scanResponse = await postJson("/api/agent/scan", {
    profileId: createPayload.profile.id
  });
  const scanPayload = (await scanResponse.json()) as {
    eventsCreated?: number;
    activities?: string[];
    error?: string;
  };
  assert.equal(scanResponse.status, 200, JSON.stringify(scanPayload));
  assert.equal(scanPayload.eventsCreated, 0);
  assert.ok((scanPayload.activities ?? []).length > 0, "Expected scan activity log");

  return {
    id: "api-agent-profile-and-scan",
    pass: true,
    summary: `profile=${createPayload.profile.id}; heartbeat activities=${scanPayload.activities?.length ?? 0}`
  };
}

async function runUiCase(): Promise<CaseReport> {
  const profile: CompanyProfile = {
    companyName: `Generated UI FlowPay ${Date.now()}`,
    companyType: "Electronic Money Institution",
    institutionType: "EMI",
    assessmentMode: "cross_border",
    country: "United Kingdom",
    homeCountry: "France",
    targetCountry: "United Kingdom",
    services: ["Electronic money issuance"]
  };
  assert.ok(profile.institutionType, "UI case requires an institution type");
  const uploadPath = join(outputDir, "ui-complete-evidence.txt");
  writeFileSync(
    uploadPath,
    [
      requiredKeywordIndex(profile),
      ...getRelevantRequirements(profile).map(completeBlock)
    ].join("\n\n")
  );

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

  try {
    await page.goto(baseUrl, { waitUntil: "networkidle" });
    await expectVisibleText(page, "Complee");
    await page.getByRole("button", { name: "New workspace" }).first().click();
    await expectVisibleText(page, "Create a compliance workspace");
    await page.getByPlaceholder("Atlas Payments").fill(profile.companyName);
    await page.getByLabel("Company type").selectOption(profile.companyType);
    await page.getByLabel("Institution type").selectOption(profile.institutionType);
    await page.getByRole("button", { name: "Electronic money issuance" }).click();
    await page.getByRole("button", { name: "Continue to documents" }).click();
    await expectVisibleText(page, "Upload the required evidence documents");

    await page.locator('input[type="file"]').setInputFiles(uploadPath);
    await expectVisibleText(page, "Extracted 1 document");
    await page.getByRole("button", { name: /Run expansion readiness assessment/i }).click();
    await expectVisibleText(page, "Expansion readiness dashboard", 150_000);
    await expectVisibleText(page, "Covered");

    await page.getByRole("button", { name: "Seed Live Agent" }).click();
    await expectVisibleText(page, "Live Agent profile updated", 30_000);

    return {
      id: "ui-upload-analyze-seed-agent",
      pass: true,
      summary: "uploaded generated evidence, analyzed through /api/analyze, seeded /api/agent/profile"
    };
  } finally {
    await browser.close();
  }
}

function statusMap(
  profile: CompanyProfile,
  status: RequirementStatus
): ExpectedStatusMap {
  return Object.fromEntries(
    getRelevantRequirements(profile).map((requirement) => [requirement.id, status])
  );
}

function allRequiredShell(profile: CompanyProfile): UploadedDocument {
  return {
    name: `required-pack-index-${profile.companyName}.txt`,
    type: "text/plain",
    content: requiredKeywordIndex(profile)
  };
}

function requiredKeywordIndex(profile: CompanyProfile): string {
  return getRequiredDocuments(profile)
    .map((document) =>
      [
        `Required document pack: ${document.title}`,
        `Document keywords: ${document.keywords.join(", ")}.`,
        `Requirement ids: ${document.requirementIds.join(", ")}.`
      ].join("\n")
    )
    .join("\n\n");
}

function evidenceDocument(
  profile: CompanyProfile,
  suffix: string,
  mode: "operational" | "procedure" | "expected-only"
): UploadedDocument {
  const blocks = getRelevantRequirements(profile).map((requirement) => {
    if (mode === "operational") return completeBlock(requirement);
    if (mode === "procedure") return partialBlock(requirement);
    return expectedOnlyBlock(requirement);
  });

  return {
    name: `${profile.companyName}-${suffix}.txt`,
    type: "text/plain",
    content: blocks.join("\n\n")
  };
}

function completeBlock(requirement: Requirement): string {
  return [
    `Operational source record for ${requirement.title} (${requirement.id}).`,
    `The control owner retains supervisory artefacts for ${requirement.domain}.`,
    ...requirement.expectedEvidence.map(
      (item, index) =>
        `- ${item}. Log extract ${requirement.id}-${index + 1}, screenshot, approval record, test result and audit event retained.`
    )
  ].join("\n");
}

function partialBlock(requirement: Requirement): string {
  return [
    `Policy and procedure note for ${requirement.title} (${requirement.id}).`,
    `The approved standard assigns ownership for ${requirement.domain}.`,
    ...requirement.expectedEvidence
      .slice(0, Math.max(1, Math.ceil(requirement.expectedEvidence.length / 2)))
      .map((item) => `- ${item}. The workflow is defined and awaiting retained source artefacts.`)
  ].join("\n");
}

function expectedOnlyBlock(requirement: Requirement): string {
  return [
    `Document request for ${requirement.title} (${requirement.id}).`,
    "Expected evidence checklist requested from the operating teams:",
    ...requirement.expectedEvidence.map((item) => `- ${item}`)
  ].join("\n");
}

function assertExpectedStatuses(
  id: string,
  result: AnalysisResult,
  expectedStatuses: ExpectedStatusMap
) {
  const actual = Object.fromEntries(
    result.matrix.map((row) => [row.requirementId, row.status])
  );

  for (const [requirementId, expected] of Object.entries(expectedStatuses)) {
    assert.equal(actual[requirementId], expected, `${id}: ${requirementId}`);
  }

  for (const row of result.matrix) {
    assert.ok(
      row.requirementId in expectedStatuses,
      `${id}: unexpected matrix row ${row.requirementId}`
    );
  }
}

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // retry until deadline
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Local server not reachable at ${baseUrl}`);
}

async function postJson(path: string, body: unknown) {
  return fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

async function expectVisibleText(page: Page, text: string | RegExp, timeout = 15_000) {
  await page.getByText(text).first().waitFor({ state: "visible", timeout });
}

function summarizeResult(result: AnalysisResult): string {
  return `engine=${result.diagnostics?.engine ?? "unknown"}; total=${result.summary.totalRequirements}; covered=${result.summary.covered}; partial=${result.summary.partiallyCovered}; not_evidenced=${result.summary.notEvidenced}; persistence=${result.diagnostics?.persistence.status ?? "unknown"}`;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (process.env.LOCAL_E2E_KEEP_OUTPUT !== "1") {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });
