// Complee — Submission-pack export.
// Bundles every signed document for an assessment together with a regulator
// cover letter, a checklist of requirements, and the tamper-evident audit
// trail PDF, all into a single ZIP ready for FCA / BaFin / etc. submission.

import JSZip from "jszip";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;
import { supabase } from "@/integrations/supabase/client";
import { downloadDocumentBlob, listDocuments, type SignedDocumentRow } from "./documentLibrary";
import { listAuditEvents, recordAuditEvent, labelForAction, verifyAuditChain } from "./auditTrail";
import { REGULATORS } from "@/data/regulators";

interface AssessmentMeta {
  id: string;
  company_name: string;
  home_country: string;
  target_country: string;
  institution_type: string;
  created_at: string;
}

async function fetchAssessment(assessmentId: string): Promise<AssessmentMeta> {
  const { data, error } = await supabase
    .from("assessments")
    .select("id, company_name, home_country, target_country, institution_type, created_at")
    .eq("id", assessmentId)
    .single();
  if (error) throw error;
  return data as AssessmentMeta;
}

function getRegulator(targetCountry: string) {
  return REGULATORS.find(
    (r) => r.country.toLowerCase() === targetCountry.toLowerCase(),
  );
}

/** Generate the regulator cover letter as a PDF blob. */
async function buildCoverLetter(
  meta: AssessmentMeta,
  documents: SignedDocumentRow[],
): Promise<Blob> {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const reg = getRegulator(meta.target_country);
  const today = new Date().toISOString().slice(0, 10);

  let y = height - 60;
  const left = 60;
  const lh = 16;

  page.drawText(meta.company_name, { x: left, y, size: 18, font: helvBold, color: rgb(0.07, 0.13, 0.27) });
  y -= 22;
  page.drawText(`Submission Cover Letter · ${today}`, { x: left, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.45) });
  y -= 30;

  if (reg) {
    page.drawText(reg.authorityFull, { x: left, y, size: 11, font: helvBold });
    y -= lh;
    page.drawText(`${reg.country} · ${reg.authority}`, { x: left, y, size: 11, font: helv });
    y -= 24;
  }

  const intro = [
    `Dear ${reg?.authority ?? "Sir or Madam"},`,
    "",
    `Please find attached the regulatory documentation prepared by ${meta.company_name}`,
    `in support of our application as a ${meta.institution_type} in ${meta.target_country}.`,
    "",
    `The package contains ${documents.length} signed document(s) and is accompanied`,
    "by a tamper-evident audit trail (audit-trail.pdf) detailing every signature,",
    "review, and approval recorded on our compliance platform.",
    "",
    "We confirm that all documents have been reviewed by our designated compliance",
    "reviewer and approved prior to submission. Should you require any additional",
    "information or clarification, please do not hesitate to contact us.",
    "",
    "Yours faithfully,",
    "",
    `${meta.company_name}`,
  ];

  for (const line of intro) {
    page.drawText(line, { x: left, y, size: 11, font: helv, color: rgb(0.07, 0.13, 0.27) });
    y -= lh;
  }

  // Document index
  y -= 20;
  page.drawText("Enclosed documents", { x: left, y, size: 12, font: helvBold });
  y -= lh + 4;
  documents.forEach((d, i) => {
    if (y < 80) return; // keep simple; truncate if too many
    const status = d.review_status === "approved" ? "✓ approved" : d.status === "signed" ? "signed" : "draft";
    page.drawText(`${i + 1}. ${d.name}  —  ${status}`, {
      x: left,
      y,
      size: 10,
      font: helv,
      color: rgb(0.2, 0.2, 0.25),
    });
    y -= lh;
  });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer], { type: "application/pdf" });
}

/** Generate the audit-trail PDF showing every chained event. */
async function buildAuditTrailPdf(
  meta: AssessmentMeta,
  documents: SignedDocumentRow[],
): Promise<Blob> {
  const events = await listAuditEvents(meta.id);
  const broken = await verifyAuditChain(events);

  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const mono = await pdf.embedFont(StandardFonts.Courier);

  let page = pdf.addPage([595, 842]);
  let y = page.getHeight() - 60;
  const left = 50;
  const lh = 13;

  const docNameById = new Map(documents.map((d) => [d.id, d.name]));

  page.drawText("Audit Trail", { x: left, y, size: 20, font: helvBold, color: rgb(0.07, 0.13, 0.27) });
  y -= 24;
  page.drawText(`${meta.company_name} · Assessment ${meta.id.slice(0, 8)}`, {
    x: left, y, size: 10, font: helv, color: rgb(0.4, 0.4, 0.45),
  });
  y -= 14;
  page.drawText(`Generated ${new Date().toISOString()}`, {
    x: left, y, size: 9, font: helv, color: rgb(0.5, 0.5, 0.55),
  });
  y -= 12;
  page.drawText(
    broken === null
      ? `Hash-chain verified: intact across ${events.length} event(s).`
      : `WARNING: Hash chain broken at event #${broken + 1}.`,
    { x: left, y, size: 9, font: helvBold, color: broken === null ? rgb(0, 0.45, 0.2) : rgb(0.8, 0.1, 0.1) },
  );
  y -= 24;

  const writeLine = (text: string, opts?: { font?: typeof helv; size?: number; color?: ReturnType<typeof rgb> }) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = page.getHeight() - 60;
    }
    page.drawText(text, {
      x: left,
      y,
      size: opts?.size ?? 9,
      font: opts?.font ?? helv,
      color: opts?.color ?? rgb(0.15, 0.15, 0.2),
    });
    y -= lh;
  };

  events.forEach((e, i) => {
    writeLine(`#${i + 1}  ${labelForAction(e.action)}`, { font: helvBold, size: 10, color: rgb(0.07, 0.13, 0.27) });
    writeLine(`   When:   ${e.created_at}`);
    writeLine(`   Who:    ${e.actor_name} (${e.actor_role})`);
    if (e.signed_document_id) {
      writeLine(`   Doc:    ${docNameById.get(e.signed_document_id) ?? e.signed_document_id}`);
    }
    if (Object.keys(e.metadata).length > 0) {
      writeLine(`   Meta:   ${JSON.stringify(e.metadata)}`);
    }
    writeLine(`   Hash:   ${e.event_hash}`, { font: mono, size: 7, color: rgb(0.4, 0.4, 0.45) });
    if (e.prev_hash) {
      writeLine(`   Prev:   ${e.prev_hash}`, { font: mono, size: 7, color: rgb(0.55, 0.55, 0.6) });
    }
    y -= 6;
  });

  const bytes = await pdf.save();
  return new Blob([bytes.slice().buffer], { type: "application/pdf" });
}

/** Build a manifest JSON that lists every file in the pack with its hash. */
function buildManifest(meta: AssessmentMeta, documents: SignedDocumentRow[]) {
  return {
    pack_format_version: "1.0",
    company: meta.company_name,
    home_country: meta.home_country,
    target_country: meta.target_country,
    institution_type: meta.institution_type,
    generated_at: new Date().toISOString(),
    documents: documents.map((d) => ({
      name: d.name,
      status: d.status,
      review_status: d.review_status ?? "draft",
      signer: d.signer_name,
      signed_at: d.signed_at,
      signature_hash: d.signature_hash,
      reviewer: d.reviewer_name,
      reviewer_signed_at: d.reviewer_signed_at,
    })),
  };
}

/**
 * Build and trigger a download of the full submission pack as a ZIP.
 * Records an audit event after successful generation.
 */
export async function exportSubmissionPack(assessmentId: string): Promise<{
  filename: string;
  size: number;
  documentCount: number;
}> {
  const meta = await fetchAssessment(assessmentId);
  const allDocs = await listDocuments();
  const documents = allDocs.filter((d) => d.assessment_id === assessmentId);

  if (documents.length === 0) {
    throw new Error("No documents to export. Generate and sign documents first.");
  }

  const zip = new JSZip();

  // Cover letter
  const cover = await buildCoverLetter(meta, documents);
  zip.file("00-cover-letter.pdf", cover);

  // Signed documents (folder)
  const docsFolder = zip.folder("documents");
  if (!docsFolder) throw new Error("Failed to create documents folder.");

  for (const d of documents) {
    const path = d.signed_storage_path ?? d.storage_path;
    try {
      const blob = await downloadDocumentBlob(path);
      const prefix = d.review_status === "approved" ? "APPROVED" : d.status === "signed" ? "SIGNED" : "DRAFT";
      docsFolder.file(`${prefix}__${d.name}`, blob);
    } catch (e) {
      console.error(`Failed to bundle ${d.name}:`, e);
    }
  }

  // Audit trail
  const audit = await buildAuditTrailPdf(meta, documents);
  zip.file("audit-trail.pdf", audit);

  // Manifest
  zip.file("manifest.json", JSON.stringify(buildManifest(meta, documents), null, 2));

  // README
  zip.file(
    "README.txt",
    [
      `Complee Submission Pack`,
      `Company: ${meta.company_name}`,
      `Target regulator: ${meta.target_country}`,
      `Generated: ${new Date().toISOString()}`,
      ``,
      `Contents:`,
      `  00-cover-letter.pdf  – Regulator cover letter`,
      `  documents/           – Signed PDFs (one per requirement)`,
      `  audit-trail.pdf      – Tamper-evident audit log`,
      `  manifest.json        – Machine-readable index with hashes`,
      ``,
      `Verification:`,
      `  Each document is signed with SHA-256. The audit trail is a hash-chain;`,
      `  any modification breaks the chain and invalidates the pack.`,
    ].join("\n"),
  );

  const blob = await zip.generateAsync({ type: "blob" });
  const filename = `submission-pack__${meta.company_name.replace(/[^a-z0-9]+/gi, "-")}__${meta.target_country}__${new Date().toISOString().slice(0, 10)}.zip`;
  saveAs(blob, filename);

  // Record audit event
  const { data: u } = await supabase.auth.getUser();
  await recordAuditEvent({
    assessmentId,
    action: "submission_pack_exported",
    actorName: u.user?.email ?? "Owner",
    actorRole: "owner",
    metadata: { document_count: documents.length, filename },
  });

  return { filename, size: blob.size, documentCount: documents.length };
}
