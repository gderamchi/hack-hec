import { mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import {
  evaluateRequiredDocuments,
  getRequiredDocuments
} from "@/data/document-requirements";
import { applyEvidenceGate } from "@/lib/evidence-gate";
import { runFallbackAnalysis } from "@/lib/fallback-analyzer";
import { getRelevantRequirements } from "@/lib/requirement-scope";
import {
  DISCLAIMER,
  SERVICES,
  type AnalysisResult,
  type CompanyProfile,
  type Requirement,
  type RequirementStatus,
  type UploadedDocument
} from "@/lib/types";

type ExpectedStatusMap = Record<string, RequirementStatus>;

type UseCase = {
  id: string;
  title: string;
  profile: CompanyProfile;
  expectedStatuses?: ExpectedStatusMap;
  expectedError?: string;
  notes: string;
  documents: UploadedDocument[];
};

type AnalyzeSuccess = {
  ok: true;
  statusCode: number;
  result: AnalysisResult;
};

type AnalyzeFailure = {
  ok: false;
  statusCode: number;
  error: string;
  missingRequiredDocuments?: Array<{ id: string; title: string }>;
};

type AnalyzeOutcome = AnalyzeSuccess | AnalyzeFailure;

type CaseReport = {
  caseId: string;
  title: string;
  notes: string;
  expectedSummary: string;
  actualSummary: string;
  pass: boolean;
  mismatches: string[];
  warnings: string[];
  runId?: string;
};

const today = new Date().toISOString().slice(0, 10);
const outputDir = join(
  homedir(),
  "Downloads",
  `psd3-psr-complex-usecases-${today}`
);
const target = process.env.COMPLEX_E2E_TARGET === "prod" ? "prod" : "local";
const prodAnalyzeUrl =
  process.env.COMPLIANCEPILOT_ANALYZE_URL ??
  "https://compliancepilot-psd3.vercel.app/api/analyze";

const bannedMarkers = [
  "demo",
  "fictional",
  "hackathon",
  "not legal advice",
  "placeholder"
];

async function main() {
  mkdirSync(outputDir, { recursive: true });

  const cases = buildUseCases();
  const reports: CaseReport[] = [];
  const csvRows = [
    [
      "case_id",
      "requirement_id",
      "requirement_title",
      "expected_status",
      "actual_status",
      "match",
      "source_document",
      "evidence_excerpt"
    ].join(",")
  ];

  for (const useCase of cases) {
    writeUseCaseDocuments(useCase);
    assertNoBannedMarkers(useCase);

    const outcome = await analyze(useCase);
    const report = compareOutcome(useCase, outcome);
    reports.push(report);

    if (outcome.ok && useCase.expectedStatuses) {
      for (const row of outcome.result.matrix) {
        csvRows.push(
          [
            useCase.id,
            row.requirementId,
            row.requirementTitle,
            useCase.expectedStatuses[row.requirementId] ?? "UNEXPECTED_ROW",
            row.status,
            useCase.expectedStatuses[row.requirementId] === row.status ? "yes" : "no",
            row.sourceDocument ?? "",
            row.evidenceExcerpt ?? ""
          ]
            .map(csv)
            .join(",")
        );
      }
    }
  }

  writeFileSync(join(outputDir, "requirement-comparison.csv"), `${csvRows.join("\n")}\n`);
  writeFileSync(join(outputDir, "complex-usecase-report.md"), renderReport(reports));
  writeFileSync(
    join(outputDir, "complex-usecase-summary.json"),
    `${JSON.stringify({ target, prodAnalyzeUrl, outputDir, reports }, null, 2)}\n`
  );

  const failed = reports.filter((report) => !report.pass);
  console.log(
    JSON.stringify(
      {
        target,
        prodAnalyzeUrl: target === "prod" ? prodAnalyzeUrl : undefined,
        outputDir,
        cases: reports.length,
        passed: reports.length - failed.length,
        failed: failed.length,
        failures: failed.map((report) => ({
          caseId: report.caseId,
          mismatches: report.mismatches
        }))
      },
      null,
      2
    )
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

function buildUseCases(): UseCase[] {
  const fullEmi: CompanyProfile = {
    companyName: "Northstar Payments Europe",
    companyType: "Electronic Money Institution",
    country: "France",
    services: [...SERVICES]
  };
  const allNot = statusMap(fullEmi, {}, "Not evidenced");

  const useCases: UseCase[] = [
    makeEvidenceCase({
      id: "uc01-full-emi-mixed-supervisory-pack",
      title: "Full EMI dossier with operational, policy-only and absent evidence",
      profile: fullEmi,
      notes:
        "Tests a large mixed dossier across the complete PSD3/PSR scope, with complete artefacts for some controls, policy-only evidence for others and no source evidence for the rest.",
      statuses: statusMap(
        fullEmi,
        {
          Covered: [
            "PSR-PAYEE-001",
            "PSR-WARN-001",
            "PSD3-SCA-001",
            "PSD3-OB-003",
            "PSD3-SAFE-001",
            "PSR-INSTANT-001",
            "PSR-AUDIT-001",
            "PSR-LIMIT-001",
            "PSR-HUMAN-001",
            "PSR-FEE-001",
            "PSR-ATM-001",
            "PSR-MOBILE-001",
            "PSD3-AUTH-001",
            "PSR-FRAUD-REPORT-001"
          ],
          "Partially covered": [
            "PSR-FRAUD-001",
            "PSR-TXN-001",
            "PSR-APPFRAUD-001",
            "PSR-LIAB-001",
            "PSR-TRANS-001",
            "PSR-INC-001",
            "PSD3-SCA-002",
            "PSD3-SCA-003",
            "PSD3-OB-001",
            "PSD3-OB-002",
            "PSR-DATA-001",
            "PSD3-LIC-001",
            "PSR-CASH-001",
            "PSR-SUSPICIOUS-001",
            "PSR-IMPERSONATION-001",
            "PSD3-TRANSITION-001",
            "PSR-PLATFORM-001",
            "PSR-EDU-001"
          ]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc02-full-emi-required-doc-shells-only",
      title: "All required document types are present but contain no proof",
      profile: fullEmi,
      notes:
        "Tests that required document names alone allow the workflow to run but do not create false coverage.",
      statuses: allNot
    }),
    makeEvidenceCase({
      id: "uc03-full-emi-expected-evidence-checklist-only",
      title: "Expected-evidence checklist without source proof",
      profile: fullEmi,
      notes:
        "Tests that a list of requested artefacts is treated as no evidence rather than partial coverage.",
      statuses: allNot,
      mode: "expected-only"
    }),
    makeEvidenceCase({
      id: "uc04-fraud-monitoring-negative-gap-register",
      title: "Negative gap register mentions controls but says they are absent",
      profile: {
        companyName: "Sentinel Fraud Operations",
        companyType: "Payment Institution",
        country: "France",
        services: ["Fraud monitoring"]
      },
      notes:
        "Tests that negative context such as contains no evidence, missing and not provided is not credited.",
      statuses: statusMap(
        {
          companyName: "Sentinel Fraud Operations",
          companyType: "Payment Institution",
          country: "France",
          services: ["Fraud monitoring"]
        },
        {},
        "Not evidenced"
      ),
      mode: "negative"
    }),
    makeEvidenceCase({
      id: "uc05-neobank-fraud-sca-mixed",
      title: "Neobank with strong payment controls but weaker liability and accessibility evidence",
      profile: {
        companyName: "Helio Bank France",
        companyType: "Neobank",
        country: "France",
        services: [
          "Instant credit transfers",
          "Wallet transfers",
          "Card payments",
          "Fraud monitoring",
          "Strong customer authentication"
        ]
      },
      notes:
        "Tests overlapping fraud, SCA, card, wallet and instant-transfer requirements in a realistic neobank scope.",
      statuses: statusMap(
        {
          companyName: "Helio Bank France",
          companyType: "Neobank",
          country: "France",
          services: [
            "Instant credit transfers",
            "Wallet transfers",
            "Card payments",
            "Fraud monitoring",
            "Strong customer authentication"
          ]
        },
        {
          Covered: [
            "PSR-PAYEE-001",
            "PSR-FRAUD-001",
            "PSR-TXN-001",
            "PSR-WARN-001",
            "PSD3-SCA-001",
            "PSD3-SAFE-001",
            "PSR-INSTANT-001",
            "PSR-LIMIT-001",
            "PSR-FEE-001"
          ],
          "Partially covered": [
            "PSR-APPFRAUD-001",
            "PSR-LIAB-001",
            "PSR-INC-001",
            "PSR-TRANS-001",
            "PSD3-SCA-002",
            "PSD3-SCA-003",
            "PSR-DATA-001",
            "PSR-AUDIT-001",
            "PSR-HUMAN-001",
            "PSR-ADR-001",
            "PSR-IMPERSONATION-001",
            "PSR-UNAUTH-001",
            "PSD3-PASSPORT-001",
            "PSR-EDU-001",
            "PSR-FRAUD-REPORT-001"
          ]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc06-open-banking-provider-consent-mixed",
      title: "Open banking provider with complete consent evidence and partial authorisation pack",
      profile: {
        companyName: "Clearbridge Account Access",
        companyType: "Open Banking Provider",
        country: "Netherlands",
        services: [
          "Open banking account access",
          "Payment initiation",
          "Strong customer authentication"
        ]
      },
      notes:
        "Tests open-banking interface, consent, dashboard, SCA and authorisation boundaries.",
      statuses: statusMap(
        {
          companyName: "Clearbridge Account Access",
          companyType: "Open Banking Provider",
          country: "Netherlands",
          services: [
            "Open banking account access",
            "Payment initiation",
            "Strong customer authentication"
          ]
        },
        {
          Covered: [
            "PSD3-SCA-001",
            "PSD3-OB-001",
            "PSD3-OB-002",
            "PSD3-OB-003",
            "PSR-AUDIT-001",
            "PSR-OB-004"
          ],
          "Partially covered": [
            "PSD3-SCA-002",
            "PSD3-SCA-003",
            "PSD3-LIC-001",
            "PSR-HUMAN-001",
            "PSR-ADR-001",
            "PSR-FEE-001",
            "PSR-MOBILE-001",
            "PSD3-AUTH-001",
            "PSD3-TRANSITION-001",
            "PSD3-PASSPORT-001"
          ]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc07-retail-cash-provider",
      title: "Retail cash withdrawal provider with complete ATM proof and partial customer support evidence",
      profile: {
        companyName: "Corner Cash Services",
        companyType: "Retail Cash Provider",
        country: "Germany",
        services: ["Cash withdrawal support"]
      },
      notes:
        "Tests that cash-specific requirements are selected without importing unrelated payment-service rows.",
      statuses: statusMap(
        {
          companyName: "Corner Cash Services",
          companyType: "Retail Cash Provider",
          country: "Germany",
          services: ["Cash withdrawal support"]
        },
        {
          Covered: ["PSR-CASH-001", "PSR-CASH-002", "PSR-ATM-001"],
          "Partially covered": ["PSR-ADR-001", "PSR-FEE-001"]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc08-online-platform-ads-and-fraud-content",
      title: "Online platform with fraud-content takedown records and partial ads approval workflow",
      profile: {
        companyName: "MarketLayer EU",
        companyType: "Online Platform",
        country: "France",
        services: [
          "Financial services advertising",
          "Online platform fraud-content handling"
        ]
      },
      notes:
        "Tests a non-PSP scope: platform fraud content and financial-advertising evidence only.",
      statuses: statusMap(
        {
          companyName: "MarketLayer EU",
          companyType: "Online Platform",
          country: "France",
          services: [
            "Financial services advertising",
            "Online platform fraud-content handling"
          ]
        },
        {
          Covered: ["PSR-PLATFORM-001"],
          "Partially covered": ["PSR-ADS-001"]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc09-mobile-front-end-technical-provider",
      title: "Technical provider with FRAND evidence and incomplete payment-initiation controls",
      profile: {
        companyName: "DeviceRail Payments Technology",
        companyType: "Technical Service Provider",
        country: "Spain",
        services: ["Mobile wallet front-end services", "Payment initiation"]
      },
      notes:
        "Tests mobile-device FRAND evidence with payment-initiation rows that should remain partial or absent.",
      statuses: statusMap(
        {
          companyName: "DeviceRail Payments Technology",
          companyType: "Technical Service Provider",
          country: "Spain",
          services: ["Mobile wallet front-end services", "Payment initiation"]
        },
        {
          Covered: ["PSR-MOBILE-001"],
          "Partially covered": [
            "PSD3-SCA-001",
            "PSD3-OB-001",
            "PSD3-OB-002",
            "PSD3-OB-003",
            "PSR-AUDIT-001",
            "PSR-LIMIT-001",
            "PSR-FEE-001",
            "PSR-OB-004"
          ]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc10-payment-account-access-provider",
      title: "Account provider serving payment institutions",
      profile: {
        companyName: "Euro Settlement Accounts",
        companyType: "Payment Institution",
        country: "France",
        services: ["Payment account provision to payment institutions"]
      },
      notes:
        "Tests that a narrow account-access service produces only the account-access PSD3 requirement.",
      statuses: statusMap(
        {
          companyName: "Euro Settlement Accounts",
          companyType: "Payment Institution",
          country: "France",
          services: ["Payment account provision to payment institutions"]
        },
        {
          Covered: ["PSD3-ACCOUNT-001"]
        },
        "Not evidenced"
      )
    }),
    makeEvidenceCase({
      id: "uc11-card-acquirer-with-out-of-scope-open-banking-noise",
      title: "Card acquirer with unrelated open-banking appendix",
      profile: {
        companyName: "Meridian Acquiring",
        companyType: "Payment Institution",
        country: "Italy",
        services: ["Card payments", "Merchant acquiring"]
      },
      notes:
        "Tests service scoping: uploaded documents mention open banking and instant transfers, but selected services are card payments and merchant acquiring only.",
      statuses: statusMap(
        {
          companyName: "Meridian Acquiring",
          companyType: "Payment Institution",
          country: "Italy",
          services: ["Card payments", "Merchant acquiring"]
        },
        {
          Covered: ["PSR-LIAB-001", "PSR-TRANS-001", "PSR-FEE-001", "PSR-UNAUTH-001"],
          "Partially covered": [
            "PSD3-LIC-001",
            "PSR-HUMAN-001",
            "PSR-ADR-001",
            "PSD3-AUTH-001",
            "PSD3-TRANSITION-001",
            "PSD3-PASSPORT-001",
            "PSR-EDU-001",
            "PSR-FRAUD-REPORT-001"
          ]
        },
        "Not evidenced"
      ),
      extraNoise: outOfScopeNoise()
    }),
    makeEvidenceCase({
      id: "uc12-fraud-controls-contradictory-documents",
      title: "Fraud monitoring dossier with one pending policy and one operational override",
      profile: {
        companyName: "Vector Fraud Monitoring",
        companyType: "Payment Institution",
        country: "France",
        services: ["Fraud monitoring"]
      },
      notes:
        "Tests that operational evidence can override an older policy-only document for the same requirement, while unrelated fraud rows stay partial or absent.",
      statuses: statusMap(
        {
          companyName: "Vector Fraud Monitoring",
          companyType: "Payment Institution",
          country: "France",
          services: ["Fraud monitoring"]
        },
        {
          Covered: [
            "PSR-FRAUD-001",
            "PSR-TXN-001",
            "PSR-INC-001",
            "PSR-DATA-001",
            "PSR-FRAUD-REPORT-001"
          ],
          "Partially covered": [
            "PSR-WARN-001",
            "PSR-AUDIT-001",
            "PSR-LIMIT-001",
            "PSR-SUSPICIOUS-001",
            "PSR-EDU-001"
          ]
        },
        "Not evidenced"
      ),
      contradictory: true
    }),
    {
      id: "uc13-open-banking-missing-required-documents",
      title: "Open banking upload rejected when required packs are missing",
      profile: {
        companyName: "Sparse AIS Gateway",
        companyType: "Open Banking Provider",
        country: "France",
        services: ["Open banking account access"]
      },
      notes:
        "Tests strict required-document gating before analysis. The expected result is a 400 error with missing required documents.",
      expectedError: "Missing required documents for selected services",
      documents: [
        {
          name: "general-company-overview.txt",
          type: "text/plain",
          content:
            "Sparse AIS Gateway provides a short corporate overview. The upload intentionally omits the required authorisation, terms, support, SCA and open-banking interface packs."
        }
      ]
    }
  ];

  return useCases;
}

function makeEvidenceCase({
  id,
  title,
  profile,
  statuses,
  notes,
  mode,
  extraNoise,
  contradictory
}: {
  id: string;
  title: string;
  profile: CompanyProfile;
  statuses: ExpectedStatusMap;
  notes: string;
  mode?: "normal" | "expected-only" | "negative";
  extraNoise?: string;
  contradictory?: boolean;
}): UseCase {
  const documents = [
    ...requiredShellDocuments(profile),
    ...evidenceDocuments({ id, profile, statuses, mode: mode ?? "normal", contradictory })
  ];

  if (extraNoise) {
    documents.push({
      name: `${id}-out-of-scope-appendix.txt`,
      type: "text/plain",
      content: extraNoise
    });
  }

  return {
    id,
    title,
    profile,
    expectedStatuses: statuses,
    notes,
    documents
  };
}

function statusMap(
  profile: CompanyProfile,
  groups: Partial<Record<RequirementStatus, string[]>>,
  defaultStatus: RequirementStatus
): ExpectedStatusMap {
  const map: ExpectedStatusMap = Object.fromEntries(
    getRelevantRequirements(profile).map((requirement) => [
      requirement.id,
      defaultStatus
    ])
  );

  for (const [status, ids] of Object.entries(groups) as Array<
    [RequirementStatus, string[] | undefined]
  >) {
    for (const id of ids ?? []) {
      if (!(id in map)) {
        throw new Error(`${id} is not relevant for ${profile.companyName}`);
      }
      map[id] = status;
    }
  }

  return map;
}

function requiredShellDocuments(profile: CompanyProfile): UploadedDocument[] {
  return getRequiredDocuments(profile).map((requiredDocument) => ({
    name: `${requiredDocument.id} - ${requiredDocument.keywords.slice(0, 8).join(" - ")}.txt`,
    type: "text/plain",
    content:
      "Control index cover sheet. Detailed artefacts are included in separate source files where available."
  }));
}

function evidenceDocuments({
  id,
  profile,
  statuses,
  mode,
  contradictory
}: {
  id: string;
  profile: CompanyProfile;
  statuses: ExpectedStatusMap;
  mode: "normal" | "expected-only" | "negative";
  contradictory?: boolean;
}): UploadedDocument[] {
  const byId = new Map(
    getRelevantRequirements(profile).map((requirement) => [requirement.id, requirement])
  );
  const covered: string[] = [];
  const partial: string[] = [];
  const expectedOnly: string[] = [];
  const negative: string[] = [];

  for (const [requirementId, status] of Object.entries(statuses)) {
    if (mode === "expected-only") {
      expectedOnly.push(requirementId);
    } else if (mode === "negative") {
      negative.push(requirementId);
    } else if (status === "Covered") {
      covered.push(requirementId);
    } else if (status === "Partially covered") {
      partial.push(requirementId);
    }
  }

  const documents: UploadedDocument[] = [];
  if (covered.length > 0) {
    documents.push({
      name: `${id}-operational-evidence.txt`,
      type: "text/plain",
      content: covered.map((requirementId) => completeBlock(byId.get(requirementId))).join("\n\n")
    });
  }

  if (partial.length > 0) {
    documents.push({
      name: `${id}-policy-and-procedure-evidence.txt`,
      type: "text/plain",
      content: partial.map((requirementId) => partialBlock(byId.get(requirementId))).join("\n\n")
    });
  }

  if (expectedOnly.length > 0) {
    documents.push({
      name: `${id}-expected-evidence-request-list.txt`,
      type: "text/plain",
      content: expectedOnly
        .map((requirementId) => expectedOnlyBlock(byId.get(requirementId)))
        .join("\n\n")
    });
  }

  if (negative.length > 0) {
    documents.push({
      name: `${id}-negative-gap-register.txt`,
      type: "text/plain",
      content: negative.map((requirementId) => negativeBlock(byId.get(requirementId))).join("\n\n")
    });
  }

  if (contradictory && covered.length > 0) {
    documents.push({
      name: `${id}-older-control-status.txt`,
      type: "text/plain",
      content: covered
        .map((requirementId) => partialBlock(byId.get(requirementId)))
        .join("\n\n")
    });
  }

  return documents;
}

function completeBlock(requirement: Requirement | undefined): string {
  if (!requirement) {
    throw new Error("Missing requirement for complete block");
  }

  return [
    `Operational source record for ${requirement.title} (${requirement.id}).`,
    `The control owner retains supervisory artefacts for ${requirement.domain}.`,
    ...requirement.expectedEvidence.map(
      (item, index) =>
        `- ${item}. Log extract ${requirement.id}-${index + 1}, screenshot, approval record, test result and audit event retained.`
    )
  ].join("\n");
}

function partialBlock(requirement: Requirement | undefined): string {
  if (!requirement) {
    throw new Error("Missing requirement for partial block");
  }

  return [
    `Policy and procedure note for ${requirement.title} (${requirement.id}).`,
    `The approved standard assigns ownership for ${requirement.domain}.`,
    ...requirement.expectedEvidence
      .slice(0, Math.max(1, Math.ceil(requirement.expectedEvidence.length / 2)))
      .map((item) => `- ${item}. The workflow is defined and awaiting retained source artefacts.`)
  ].join("\n");
}

function expectedOnlyBlock(requirement: Requirement | undefined): string {
  if (!requirement) {
    throw new Error("Missing requirement for expected-only block");
  }

  return [
    `Document request for ${requirement.title} (${requirement.id}).`,
    "Expected evidence checklist requested from the operating teams:",
    ...requirement.expectedEvidence.map((item) => `- ${item}`)
  ].join("\n");
}

function negativeBlock(requirement: Requirement | undefined): string {
  if (!requirement) {
    throw new Error("Missing requirement for negative block");
  }

  return [
    `Gap register entry for ${requirement.title} (${requirement.id}).`,
    `The file contains no evidence of ${requirement.expectedEvidence[0] ?? requirement.title}.`,
    `The operating team has not provided source material for ${requirement.domain}; missing items remain open.`
  ].join("\n");
}

function outOfScopeNoise(): string {
  return [
    "Appendix from a separate programme:",
    "The open banking dedicated interface keeps a consent dashboard, account information access, permission revocation and third-party provider monitoring dashboard.",
    "The instant credit transfer stream also mentions payee verification, beneficiary name matching and payment initiation test results.",
    "These notes are included for reference and are not selected services for this assessment."
  ].join("\n");
}

async function analyze(useCase: UseCase): Promise<AnalyzeOutcome> {
  if (target === "prod") {
    const response = await fetch(prodAnalyzeUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        companyProfile: useCase.profile,
        documents: useCase.documents
      })
    });
    const payload = (await response.json().catch(() => ({}))) as
      | AnalysisResult
      | {
          error?: string;
          missingRequiredDocuments?: Array<{ id: string; title: string }>;
        };

    if (!response.ok) {
      return {
        ok: false,
        statusCode: response.status,
        error: "error" in payload && payload.error ? payload.error : "Unknown error",
        missingRequiredDocuments:
          "missingRequiredDocuments" in payload ? payload.missingRequiredDocuments : undefined
      };
    }

    return {
      ok: true,
      statusCode: response.status,
      result: payload as AnalysisResult
    };
  }

  const documentCheck = evaluateRequiredDocuments(useCase.profile, useCase.documents);
  if (documentCheck.missing.length > 0) {
    return {
      ok: false,
      statusCode: 400,
      error: "Missing required documents for selected services",
      missingRequiredDocuments: documentCheck.missing.map((document) => ({
        id: document.id,
        title: document.title
      }))
    };
  }

  const baseline = runFallbackAnalysis(useCase.profile, useCase.documents);
  const gated = applyEvidenceGate({
    companyProfile: useCase.profile,
    documents: useCase.documents,
    result: baseline
  });

  return {
    ok: true,
    statusCode: 200,
    result: {
      ...gated.result,
      disclaimer: DISCLAIMER,
      diagnostics: {
        engine: "fallback",
        generatedAt: new Date(0).toISOString(),
        warnings: gated.warnings,
        persistence: {
          status: "skipped",
          detail: "Complex regression local mode."
        },
        regulatorySources: []
      }
    }
  };
}

function compareOutcome(useCase: UseCase, outcome: AnalyzeOutcome): CaseReport {
  if (useCase.expectedError) {
    const pass = !outcome.ok && outcome.error === useCase.expectedError;
    return {
      caseId: useCase.id,
      title: useCase.title,
      notes: useCase.notes,
      expectedSummary: `HTTP 400: ${useCase.expectedError}`,
      actualSummary: outcome.ok
        ? summarizeResult(outcome.result)
        : `HTTP ${outcome.statusCode}: ${outcome.error}; missing=${outcome.missingRequiredDocuments?.length ?? 0}`,
      pass,
      mismatches: pass
        ? []
        : [`Expected error "${useCase.expectedError}", got ${outcome.ok ? "success" : outcome.error}`],
      warnings: []
    };
  }

  if (!useCase.expectedStatuses) {
    throw new Error(`${useCase.id} has no expected statuses`);
  }

  if (!outcome.ok) {
    return {
      caseId: useCase.id,
      title: useCase.title,
      notes: useCase.notes,
      expectedSummary: summarizeStatuses(useCase.expectedStatuses),
      actualSummary: `HTTP ${outcome.statusCode}: ${outcome.error}`,
      pass: false,
      mismatches: [`Unexpected API error: ${outcome.error}`],
      warnings: []
    };
  }

  const actualById = Object.fromEntries(
    outcome.result.matrix.map((row) => [row.requirementId, row.status])
  );
  const mismatches: string[] = [];

  for (const [requirementId, expected] of Object.entries(useCase.expectedStatuses)) {
    const actual = actualById[requirementId];
    if (actual !== expected) {
      mismatches.push(`${requirementId}: expected ${expected}, got ${actual ?? "missing row"}`);
    }
  }

  for (const row of outcome.result.matrix) {
    if (!(row.requirementId in useCase.expectedStatuses)) {
      mismatches.push(`${row.requirementId}: unexpected row with ${row.status}`);
    }
  }

  return {
    caseId: useCase.id,
    title: useCase.title,
    notes: useCase.notes,
    expectedSummary: summarizeStatuses(useCase.expectedStatuses),
    actualSummary: summarizeResult(outcome.result),
    pass: mismatches.length === 0,
    mismatches,
    warnings: outcome.result.diagnostics?.warnings ?? [],
    runId: outcome.result.runId
  };
}

function summarizeStatuses(statuses: ExpectedStatusMap): string {
  const values = Object.values(statuses);
  return `total=${values.length}; covered=${values.filter((status) => status === "Covered").length}; partial=${values.filter((status) => status === "Partially covered").length}; not_evidenced=${values.filter((status) => status === "Not evidenced").length}; review=${values.filter((status) => status === "Needs human review").length}`;
}

function summarizeResult(result: AnalysisResult): string {
  return `total=${result.summary.totalRequirements}; covered=${result.summary.covered}; partial=${result.summary.partiallyCovered}; not_evidenced=${result.summary.notEvidenced}; review=${result.summary.needsHumanReview}`;
}

function writeUseCaseDocuments(useCase: UseCase) {
  const caseDir = join(outputDir, "inputs", useCase.id);
  mkdirSync(caseDir, { recursive: true });
  writeFileSync(
    join(caseDir, "company-profile.json"),
    `${JSON.stringify(useCase.profile, null, 2)}\n`
  );
  for (const document of useCase.documents) {
    writeFileSync(join(caseDir, safeFileName(document.name)), `${document.content}\n`);
  }
}

function assertNoBannedMarkers(useCase: UseCase) {
  const source = useCase.documents
    .map((document) => `${document.name}\n${document.content}`)
    .join("\n")
    .toLowerCase();
  const found = bannedMarkers.filter((marker) => source.includes(marker));
  if (found.length > 0) {
    throw new Error(`${useCase.id} contains banned test marker(s): ${found.join(", ")}`);
  }
}

function renderReport(reports: CaseReport[]): string {
  const lines = [
    `# PSD3/PSR complex use-case regression (${target})`,
    "",
    `Output directory: ${outputDir}`,
    target === "prod" ? `Production endpoint: ${prodAnalyzeUrl}` : "Mode: local deterministic route equivalent",
    "",
    "| Case | Expected | Actual | Result |",
    "| --- | --- | --- | --- |"
  ];

  for (const report of reports) {
    lines.push(
      `| ${report.caseId} | ${report.expectedSummary} | ${report.actualSummary} | ${report.pass ? "PASS" : "FAIL"} |`
    );
  }

  lines.push("", "## Details", "");
  for (const report of reports) {
    lines.push(`### ${report.caseId} - ${report.title}`);
    lines.push(report.notes);
    if (report.runId) {
      lines.push(`Run ID: ${report.runId}`);
    }
    if (report.warnings.length > 0) {
      lines.push(`Warnings: ${report.warnings.join(" | ")}`);
    }
    if (report.mismatches.length > 0) {
      lines.push("Mismatches:");
      for (const mismatch of report.mismatches) {
        lines.push(`- ${mismatch}`);
      }
    } else {
      lines.push("No mismatches.");
    }
    lines.push("");
  }

  return `${lines.join("\n")}\n`;
}

function csv(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function safeFileName(value: string): string {
  return value
    .replace(/[^a-z0-9._ -]/gi, "_")
    .replace(/\s+/g, " ")
    .trim();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
