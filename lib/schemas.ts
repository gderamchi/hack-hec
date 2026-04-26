import { z } from "zod";
import {
  COMPANY_TYPES,
  ASSESSMENT_MODES,
  COUNTRIES,
  INSTITUTION_TYPES,
  PRIORITIES,
  SERVICES,
  STATUSES
} from "@/lib/types";

export const companyProfileSchema = z.object({
  companyName: z.string().min(1),
  companyType: z.enum(COMPANY_TYPES),
  institutionType: z.enum(INSTITUTION_TYPES).optional(),
  country: z.enum(COUNTRIES),
  homeCountry: z.enum(COUNTRIES).optional(),
  targetCountry: z.enum(COUNTRIES).optional(),
  assessmentMode: z.enum(ASSESSMENT_MODES).optional(),
  services: z.array(z.enum(SERVICES)).min(1)
});

export const uploadedDocumentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  content: z.string().min(1)
});

export const analyzeRequestSchema = z.object({
  companyProfile: companyProfileSchema,
  documents: z.array(uploadedDocumentSchema).min(1)
});

export const evidenceMatrixItemSchema = z.object({
  requirementId: z.string().min(1),
  domain: z.string().min(1),
  requirementTitle: z.string().min(1),
  regulatoryReference: z.string().min(1).optional(),
  sourceUrl: z.string().url().optional(),
  status: z.enum(STATUSES),
  evidenceFound: z.string().min(1),
  sourceDocument: z.string().optional(),
  evidenceExcerpt: z.string().optional(),
  missingEvidence: z.array(z.string()),
  priority: z.enum(PRIORITIES),
  confidence: z.number().min(0).max(1),
  recommendedTask: z.string().min(1)
});

export const roadmapTaskSchema = z.object({
  title: z.string().min(1),
  owner: z.string().min(1),
  priority: z.enum(PRIORITIES),
  deadline: z.enum(["30 days", "60 days", "90 days", "180 days"]),
  evidenceRequired: z.array(z.string()).min(1),
  acceptanceCriteria: z.string().min(1),
  linkedRequirementIds: z.array(z.string()).min(1)
});

export const analysisResultSchema = z.object({
  runId: z.string().min(1),
  summary: z.object({
    totalRequirements: z.number().int().nonnegative(),
    covered: z.number().int().nonnegative(),
    partiallyCovered: z.number().int().nonnegative(),
    notEvidenced: z.number().int().nonnegative(),
    needsHumanReview: z.number().int().nonnegative()
  }),
  matrix: z.array(evidenceMatrixItemSchema),
  roadmap: z.array(roadmapTaskSchema),
  disclaimer: z.string().min(1),
  diagnostics: z
    .object({
      engine: z.enum(["openai", "fallback"]),
      model: z.string().optional(),
      reasoningEffort: z.string().optional(),
      generatedAt: z.string(),
      warnings: z.array(z.string()),
      persistence: z.object({
        status: z.enum(["saved", "skipped", "failed"]),
        detail: z.string()
      }),
      regulatorySources: z.array(
        z.object({
          label: z.string().min(1),
          url: z.string().url()
        })
      )
    })
    .optional()
});
