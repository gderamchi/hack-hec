import { ANALYSIS_KEYWORD_RULES } from "@/lib/fallback-analyzer";
import {
  buildScopeWarnings,
  getRelevantRequirements
} from "@/lib/requirement-scope";
import type {
  AnalysisResult,
  CompanyProfile,
  EvidenceMatrixItem,
  Priority,
  Requirement,
  RequirementStatus,
  RoadmapTask,
  UploadedDocument
} from "@/lib/types";

type EvidenceType =
  | "demo_placeholder"
  | "policy_intent"
  | "procedure"
  | "design_spec"
  | "operational_artifact";

type EvidenceHit = {
  sourceDocument: string;
  excerpt: string;
  matchedPhrase: string;
  evidenceType: EvidenceType;
  strength: number;
};

type ExpectedEvidenceHit = {
  expectedEvidence: string;
  hit: EvidenceHit;
};

type GateInput = {
  companyProfile: CompanyProfile;
  documents: UploadedDocument[];
  result: AnalysisResult;
};

type GateOutput = {
  result: AnalysisResult;
  warnings: string[];
};

const DEMO_PATTERNS = [
  /\bfor .*demo purposes\b/i,
  /\bdemo content\b/i,
  /\bfictional\b/i,
  /\bnot legal advice\b/i,
  /\bplaceholder\b/i
];

const EXPECTED_ONLY_CONTEXT_PATTERNS = [
  /\bevidence (the ai )?should\b/i,
  /\bevidence pack for demo\b/i,
  /\bdemo evidence\b/i,
  /\bdemo finding examples\b/i,
  /\bminimum documents\b/i,
  /\bexpected\b/i
];

const OPERATIONAL_PATTERNS = [
  /\blog(s|ged)?\b/i,
  /\bextract\b/i,
  /\bscreenshot\b/i,
  /\bmetric(s)?\b/i,
  /\bdashboard\b/i,
  /\bticket(s)?\b/i,
  /\brecord(s|ed)?\b/i,
  /\bregister\b/i,
  /\bminutes\b/i,
  /\breport(ing)? pack\b/i,
  /\btest (result|evidence|case|cases)\b/i,
  /\baudit event(s)?\b/i,
  /\bcase management\b/i,
  /\bapproval record(s)?\b/i
];

const PROCEDURE_PATTERNS = [
  /\bprocedure\b/i,
  /\bworkflow\b/i,
  /\bplaybook\b/i,
  /\bdecision tree\b/i,
  /\bescalation\b/i,
  /\bprocess\b/i,
  /\bcriteria\b/i
];

const DESIGN_PATTERNS = [
  /\bpolicy\b/i,
  /\bstandard\b/i,
  /\bframework\b/i,
  /\bprinciple(s)?\b/i,
  /\blogic\b/i,
  /\bflow\b/i,
  /\bmodel\b/i,
  /\bcontrol design\b/i
];

const POLICY_INTENT_PATTERNS = [
  /\bwill maintain\b/i,
  /\bshould\b/i,
  /\bmust\b/i,
  /\bdesigned to\b/i,
  /\bintended\b/i,
  /\btarget architecture\b/i
];

const NEGATIVE_EVIDENCE_CONTEXT_PATTERNS = [
  /\bcontains no\b/i,
  /\bno .* evidence\b/i,
  /\bnot evidenced\b/i,
  /\bnot provided\b/i,
  /\bnot attached\b/i,
  /\bdoes not include\b/i,
  /\bmissing\b/i
];

export function applyEvidenceGate({
  companyProfile,
  documents,
  result
}: GateInput): GateOutput {
  const sourceByRequirement = new Map(
    result.matrix.map((item) => [item.requirementId, item])
  );
  const relevantRequirements = getRelevantRequirements(companyProfile);
  const hasDemoLimitation = documents.some((document) =>
    DEMO_PATTERNS.some((pattern) => pattern.test(document.content))
  );
  const warnings = [...buildScopeWarnings(companyProfile, documents)];

  if (hasDemoLimitation) {
    warnings.push(
      "Uploaded documents contain fictional/demo disclaimers; policy statements can support partial readiness but cannot be treated as complete compliance evidence."
    );
  }

  const matrix = relevantRequirements.map((requirement) =>
    gateRequirement({
      requirement,
      sourceItem: sourceByRequirement.get(requirement.id),
      documents,
      hasDemoLimitation
    })
  );

  return {
    result: {
      ...result,
      matrix,
      summary: summarize(matrix),
      roadmap: createRoadmap(matrix)
    },
    warnings
  };
}

function gateRequirement({
  requirement,
  sourceItem,
  documents,
  hasDemoLimitation
}: {
  requirement: Requirement;
  sourceItem?: EvidenceMatrixItem;
  documents: UploadedDocument[];
  hasDemoLimitation: boolean;
}): EvidenceMatrixItem {
  const bestHit = findBestEvidence(requirement, documents);
  const expectedHits = requirement.expectedEvidence
    .map((expectedEvidence) => ({
      expectedEvidence,
      hit: findEvidence(documents, expandEvidencePhrases(expectedEvidence))
    }))
    .filter((item): item is ExpectedEvidenceHit => Boolean(item.hit));
  const strongestEvidence = Math.max(
    bestHit?.strength ?? 0,
    ...expectedHits.map((item) => item.hit.strength)
  );
  const status = inferGatedStatus({
    requirement,
    bestHit,
    expectedHits,
    strongestEvidence
  });
  const missingEvidence = inferMissingEvidence({
    requirement,
    status,
    expectedHits,
    strongestEvidence,
    hasDemoLimitation
  });
  const confidence = inferConfidence({
    status,
    requirement,
    expectedHits,
    strongestEvidence,
    hasDemoLimitation
  });

  return {
    requirementId: requirement.id,
    domain: requirement.domain,
    requirementTitle: requirement.title,
    regulatoryReference: `${requirement.sourceInstrument}: ${requirement.sourceReference}`,
    sourceUrl: requirement.sourceUrl,
    status,
    evidenceFound: describeEvidence(status, bestHit),
    sourceDocument: status === "Not evidenced" ? undefined : bestHit?.sourceDocument,
    evidenceExcerpt: status === "Not evidenced" ? undefined : bestHit?.excerpt,
    missingEvidence,
    priority: requirement.priority,
    confidence,
    recommendedTask: recommendedTaskFor({
      requirement,
      sourceItem,
      status,
      missingEvidence
    })
  };
}

function inferGatedStatus({
  requirement,
  bestHit,
  expectedHits,
  strongestEvidence
}: {
  requirement: Requirement;
  bestHit?: EvidenceHit;
  expectedHits: ExpectedEvidenceHit[];
  strongestEvidence: number;
}): RequirementStatus {
  if (!bestHit) {
    return "Not evidenced";
  }

  const expectedCoverage =
    requirement.expectedEvidence.length === 0
      ? 0
      : expectedHits.length / requirement.expectedEvidence.length;
  const canBeCovered =
    expectedCoverage >= 1 &&
    strongestEvidence >= evidenceStrength("operational_artifact");

  return canBeCovered ? "Covered" : "Partially covered";
}

function inferMissingEvidence({
  requirement,
  status,
  expectedHits,
  strongestEvidence,
  hasDemoLimitation
}: {
  requirement: Requirement;
  status: RequirementStatus;
  expectedHits: ExpectedEvidenceHit[];
  strongestEvidence: number;
  hasDemoLimitation: boolean;
}): string[] {
  if (status === "Covered") {
    return [];
  }

  const matched = new Set(expectedHits.map((item) => item.expectedEvidence));
  const missing = requirement.expectedEvidence.filter((item) => !matched.has(item));

  if (
    missing.length === 0 &&
    strongestEvidence < evidenceStrength("operational_artifact")
  ) {
    missing.push(
      "operational artifact proving the control is implemented, tested and retained"
    );
  }

  if (hasDemoLimitation && status !== "Not evidenced") {
    missing.push("non-demo source evidence suitable for supervisory review");
  }

  return missing;
}

function inferConfidence({
  status,
  requirement,
  expectedHits,
  strongestEvidence,
  hasDemoLimitation
}: {
  status: RequirementStatus;
  requirement: Requirement;
  expectedHits: ExpectedEvidenceHit[];
  strongestEvidence: number;
  hasDemoLimitation: boolean;
}): number {
  const expectedCoverage =
    requirement.expectedEvidence.length === 0
      ? 0
      : expectedHits.length / requirement.expectedEvidence.length;
  const base =
    status === "Covered" ? 0.9 : status === "Partially covered" ? 0.68 : 0.86;
  const evidenceBonus = Math.min(0.1, expectedCoverage * 0.1);
  const strengthBonus = Math.min(0.06, strongestEvidence * 0.015);
  const demoPenalty = hasDemoLimitation && status !== "Not evidenced" ? 0.16 : 0;
  const score = base + evidenceBonus + strengthBonus - demoPenalty;

  return Math.max(0.25, Math.min(0.97, Number(score.toFixed(2))));
}

function describeEvidence(
  status: RequirementStatus,
  hit: EvidenceHit | undefined
): string {
  if (status === "Not evidenced" || !hit) {
    return "Not evidenced in the uploaded documents.";
  }

  return `Verified ${labelForEvidenceType(hit.evidenceType)} evidence in ${hit.sourceDocument} using "${hit.matchedPhrase}": ${hit.excerpt}`;
}

function recommendedTaskFor({
  requirement,
  sourceItem,
  status,
  missingEvidence
}: {
  requirement: Requirement;
  sourceItem?: EvidenceMatrixItem;
  status: RequirementStatus;
  missingEvidence: string[];
}): string {
  if (status === "Covered") {
    return `Keep source-backed evidence current for ${requirement.title}.`;
  }

  if (
    sourceItem &&
    sourceItem.status !== "Covered" &&
    sourceItem.recommendedTask.trim().length > 0
  ) {
    return sourceItem.recommendedTask;
  }

  const firstGap = missingEvidence[0] ?? requirement.expectedEvidence[0];
  return `Produce source-backed evidence for ${requirement.title}, starting with ${firstGap}.`;
}

function findBestEvidence(
  requirement: Requirement,
  documents: UploadedDocument[]
): EvidenceHit | undefined {
  const rule = ANALYSIS_KEYWORD_RULES[requirement.id];
  const phrases = uniqueStrings([
    ...(rule?.strongKeywords ?? []),
    ...(rule?.keywords ?? []),
    requirement.title
  ]);
  const hits = phrases
    .map((phrase) => findEvidence(documents, [phrase]))
    .filter((hit): hit is EvidenceHit => Boolean(hit));

  return hits.sort(compareEvidenceHits)[0];
}

function findEvidence(
  documents: UploadedDocument[],
  phrases: string[]
): EvidenceHit | undefined {
  for (const document of documents) {
    const lowerContent = document.content.toLowerCase();
    for (const phrase of uniqueStrings(phrases.flatMap(expandPhraseVariants))) {
      const normalizedPhrase = phrase.toLowerCase().trim();
      if (normalizedPhrase.length < 3) continue;
      const index = lowerContent.indexOf(normalizedPhrase);
      if (index === -1) continue;

      const excerpt = createExcerpt(document.content, index);
      if (isNegativeEvidenceContext(excerpt)) continue;
      const evidenceType = classifyEvidence(document.content, index, excerpt);
      return {
        sourceDocument: document.name,
        excerpt,
        matchedPhrase: phrase,
        evidenceType,
        strength: evidenceStrength(evidenceType)
      };
    }
  }

  return undefined;
}

function isNegativeEvidenceContext(excerpt: string): boolean {
  return NEGATIVE_EVIDENCE_CONTEXT_PATTERNS.some((pattern) =>
    pattern.test(excerpt)
  );
}

function classifyEvidence(
  content: string,
  index: number,
  excerpt: string
): EvidenceType {
  const context = content.slice(Math.max(0, index - 320), index + 320);

  if (EXPECTED_ONLY_CONTEXT_PATTERNS.some((pattern) => pattern.test(context))) {
    return "demo_placeholder";
  }

  if (OPERATIONAL_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "operational_artifact";
  }

  if (PROCEDURE_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "procedure";
  }

  if (DESIGN_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "design_spec";
  }

  if (POLICY_INTENT_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "policy_intent";
  }

  return "policy_intent";
}

function evidenceStrength(evidenceType: EvidenceType): number {
  return {
    demo_placeholder: 1,
    policy_intent: 2,
    design_spec: 3,
    procedure: 4,
    operational_artifact: 5
  }[evidenceType];
}

function labelForEvidenceType(evidenceType: EvidenceType): string {
  return {
    demo_placeholder: "demo-placeholder",
    policy_intent: "policy-intent",
    design_spec: "design/spec",
    procedure: "procedure",
    operational_artifact: "operational"
  }[evidenceType];
}

function expandEvidencePhrases(value: string): string[] {
  const base = value
    .replace(/\bor\b/gi, " ")
    .replace(/\band\b/gi, " ")
    .replace(/[(),]/g, " ");
  const words = base
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2);
  const phrases = [value, base.trim()];

  for (let index = 0; index < words.length - 1; index += 1) {
    phrases.push(`${words[index]} ${words[index + 1]}`);
  }

  return uniqueStrings(phrases);
}

function expandPhraseVariants(value: string): string[] {
  const normalized = value.trim();
  return uniqueStrings([
    normalized,
    normalized.replace(/[-/]/g, " "),
    normalized.replace(/\s+/g, " ")
  ]);
}

function createExcerpt(content: string, index: number): string {
  const start = Math.max(0, index - 140);
  const end = Math.min(content.length, index + 260);
  return content
    .slice(start, end)
    .replace(/\s+/g, " ")
    .trim();
}

function compareEvidenceHits(a: EvidenceHit, b: EvidenceHit): number {
  if (a.strength !== b.strength) {
    return b.strength - a.strength;
  }

  return b.matchedPhrase.length - a.matchedPhrase.length;
}

function summarize(matrix: EvidenceMatrixItem[]): AnalysisResult["summary"] {
  return {
    totalRequirements: matrix.length,
    covered: matrix.filter((item) => item.status === "Covered").length,
    partiallyCovered: matrix.filter((item) => item.status === "Partially covered").length,
    notEvidenced: matrix.filter((item) => item.status === "Not evidenced").length,
    needsHumanReview: matrix.filter((item) => item.status === "Needs human review").length
  };
}

function createRoadmap(matrix: EvidenceMatrixItem[]): RoadmapTask[] {
  return matrix
    .filter((item) => item.status !== "Covered")
    .sort((a, b) => priorityRank(b.priority) - priorityRank(a.priority))
    .slice(0, 10)
    .map((item) => ({
      title: item.recommendedTask,
      owner: ownerForDomain(item.domain),
      priority: item.priority,
      deadline: deadlineForPriority(item.priority),
      evidenceRequired: item.missingEvidence.slice(0, 4),
      acceptanceCriteria: `The uploaded source documents include verifiable evidence for ${item.requirementTitle}.`,
      linkedRequirementIds: [item.requirementId]
    }));
}

function priorityRank(priority: Priority): number {
  return {
    Low: 1,
    Medium: 2,
    High: 3,
    Critical: 4
  }[priority];
}

function deadlineForPriority(priority: Priority): RoadmapTask["deadline"] {
  if (priority === "Critical") return "30 days";
  if (priority === "High") return "60 days";
  if (priority === "Medium") return "90 days";
  return "180 days";
}

function ownerForDomain(domain: string): string {
  if (domain.includes("Fraud")) return "Fraud Operations";
  if (domain.includes("SCA")) return "Security Engineering";
  if (domain.includes("Open Banking")) return "Open Banking Product";
  if (domain.includes("Cash")) return "Product Operations";
  if (domain.includes("Customer")) return "Product + Support";
  if (domain.includes("Authorisation")) return "Compliance Leadership";
  return "Compliance";
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
