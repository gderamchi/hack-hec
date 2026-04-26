// Complee — Policy Upload + AI Coverage Check.
// Workflow:
//   1) User drops/selects a PDF policy in the active step.
//   2) We extract text in the browser via pdfjs-dist (no server roundtrip
//      needed for parsing — keeps the upload private until they confirm).
//   3) We upload the file to the documents bucket and register it in
//      signed_documents with doc_type='upload'.
//   4) We POST the extracted text + the requirement's substeps to the
//      analyze-policy edge function and get back per-substep coverage.
//   5) The UI renders the result with status pills, evidence quotes, gap
//      explanations, and "Use uploaded / Use Complee / Merge" actions.

import { supabase } from "@/integrations/supabase/client";
import {
  registerDocument,
  uploadDocumentBlob,
  type SignedDocumentRow,
} from "@/lib/documentLibrary";

export interface CoverageResult {
  substepId: string;
  substepTitle: string;
  status: "covered" | "partial" | "missing";
  evidenceQuote: string;
  gapExplanation: string;
  suggestedAddition: string;
}

export interface PolicyAnalysis {
  overallSummary: string;
  coverageScore: number;
  results: CoverageResult[];
  truncated: boolean;
}

export interface AnalyzePayload {
  documentText: string;
  documentName: string;
  requirementTitle: string;
  authority: string;
  country: string;
  regulationReference: string;
  substeps: { id: string; title: string; detail: string }[];
}

/** Extract plain text from a PDF Blob using pdfjs-dist (browser-side). */
export async function extractPdfText(blob: Blob): Promise<string> {
  if (blob.type && blob.type !== "application/pdf") {
    throw new Error("Only PDF uploads are supported in this beta.");
  }
  const pdfjs = await import("pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    try {
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url"))
        .default as string;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    } catch {
      /* worker resolution best-effort */
    }
  }
  const arrayBuf = await blob.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuf) }).promise;

  const chunks: string[] = [];
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const tc = await page.getTextContent();
    const pageText = (tc.items as Array<{ str: string }>)
      .map((it) => it.str)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim();
    if (pageText) chunks.push(pageText);
  }
  return chunks.join("\n\n");
}

/** Upload the original policy file + register it in signed_documents. */
export async function uploadPolicy(
  file: File,
  opts: { assessmentId: string | null; requirementId: string | null },
): Promise<SignedDocumentRow> {
  const blob = new Blob([await file.arrayBuffer()], {
    type: file.type || "application/pdf",
  });
  const path = await uploadDocumentBlob({
    blob,
    filename: file.name,
    folder: "uploads",
  });
  return registerDocument({
    name: file.name,
    storage_path: path,
    doc_type: "upload",
    assessment_id: opts.assessmentId,
    requirement_id: opts.requirementId,
  });
}

/** Call the analyze-policy edge function and return parsed coverage. */
export async function analyzePolicyCoverage(
  payload: AnalyzePayload,
): Promise<PolicyAnalysis> {
  const { data, error } = await supabase.functions.invoke("analyze-policy", {
    body: payload,
  });
  if (error) {
    // Functions client puts gateway error body inside error.context.
    let serverMsg: string | undefined;
    try {
      const ctxRes = (error as { context?: Response }).context;
      if (ctxRes && typeof ctxRes.json === "function") {
        const j = (await ctxRes.json()) as { error?: string };
        serverMsg = j?.error;
      }
    } catch {
      /* ignore */
    }
    throw new Error(serverMsg || error.message || "Analysis failed");
  }
  if (!data) throw new Error("No analysis returned");
  return data as PolicyAnalysis;
}
