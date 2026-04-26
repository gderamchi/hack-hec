// Complee — Document library: upload generated/uploaded docs to Cloud storage,
// embed e-signatures into PDFs, and read/list signed documents.

import { supabase } from "@/integrations/supabase/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export type DocType = "step" | "master" | "upload";

export interface SignedDocumentRow {
  id: string;
  user_id: string;
  assessment_id: string | null;
  requirement_id: string | null;
  name: string;
  doc_type: DocType;
  storage_path: string;
  signed_storage_path: string | null;
  status: "unsigned" | "signed";
  signer_name: string | null;
  signature_method: "typed" | "drawn" | null;
  signature_hash: string | null;
  signed_ip: string | null;
  signed_user_agent: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
  review_status?: "draft" | "awaiting_review" | "changes_requested" | "approved";
  reviewer_user_id?: string | null;
  reviewer_name?: string | null;
  reviewer_signature_data?: string | null;
  reviewer_signed_at?: string | null;
  review_notes?: string | null;
}

const BUCKET = "documents";

/** Hash a string with SHA-256 → hex (used for tamper-evident audit trail). */
async function sha256Hex(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/**
 * Upload a Blob to the user's documents folder.
 * Path layout: `{userId}/{folder}/{timestamp}-{filename}`.
 */
export async function uploadDocumentBlob(opts: {
  blob: Blob;
  filename: string;
  folder: string;
}): Promise<string> {
  const userId = await currentUserId();
  const ts = Date.now();
  const path = `${userId}/${opts.folder}/${ts}-${opts.filename}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, opts.blob, {
      contentType: opts.blob.type || "application/octet-stream",
      upsert: false,
    });
  if (error) throw error;
  return path;
}

/** Get a short-lived signed URL for previewing/downloading a private file. */
export async function getDocumentUrl(
  path: string,
  expiresInSec = 3600,
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresInSec);
  if (error) throw error;
  return data.signedUrl;
}

/** Download a stored file as a Blob (used before embedding signature). */
export async function downloadDocumentBlob(path: string): Promise<Blob> {
  const { data, error } = await supabase.storage.from(BUCKET).download(path);
  if (error) throw error;
  return data;
}

// ---------- Library CRUD ----------

export async function registerDocument(input: {
  name: string;
  storage_path: string;
  doc_type: DocType;
  assessment_id?: string | null;
  requirement_id?: string | null;
}): Promise<SignedDocumentRow> {
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("signed_documents")
    .insert({
      user_id: userId,
      name: input.name,
      storage_path: input.storage_path,
      doc_type: input.doc_type,
      assessment_id: input.assessment_id ?? null,
      requirement_id: input.requirement_id ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as SignedDocumentRow;
}

export async function listDocuments(): Promise<SignedDocumentRow[]> {
  const { data, error } = await supabase
    .from("signed_documents")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as SignedDocumentRow[];
}

export async function deleteDocument(row: SignedDocumentRow): Promise<void> {
  // Remove storage objects (best effort), then DB row.
  const paths = [row.storage_path];
  if (row.signed_storage_path) paths.push(row.signed_storage_path);
  await supabase.storage.from(BUCKET).remove(paths);
  const { error } = await supabase
    .from("signed_documents")
    .delete()
    .eq("id", row.id);
  if (error) throw error;
}

// ---------- Signature embedding ----------

export interface SignatureInput {
  signerName: string;
  method: "typed" | "drawn";
  /** Required when method === "drawn". PNG data-URL (base64). */
  drawnPngDataUrl?: string;
}

async function getSignatureMarkDataUrl(sig: SignatureInput): Promise<string | null> {
  if (sig.method === "drawn") {
    return sig.drawnPngDataUrl ?? null;
  }

  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  canvas.width = 900;
  canvas.height = 260;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#0a1f44";
  ctx.textBaseline = "middle";

  const maxWidth = canvas.width - 40;
  let fontSize = 92;
  do {
    ctx.font = `600 ${fontSize}px "Brush Script MT", "Lucida Handwriting", cursive`;
    if (ctx.measureText(sig.signerName).width <= maxWidth || fontSize <= 48) break;
    fontSize -= 4;
  } while (fontSize > 48);

  ctx.fillText(sig.signerName, 20, canvas.height / 2 + 10);
  return canvas.toDataURL("image/png");
}

/**
 * Take a PDF Blob, append a signature page (or stamp the last page) with the
 * signer's name, the selected mark (typed text or drawn image), a UTC
 * timestamp, and a SHA-256 audit hash of the original document + signature.
 * Returns the signed PDF Blob and the audit hash.
 */
export async function signPdfBlob(
  originalBlob: Blob,
  sig: SignatureInput,
): Promise<{ blob: Blob; hash: string; signedAt: string }> {
  if (originalBlob.type && originalBlob.type !== "application/pdf") {
    throw new Error("Only PDF documents can be signed at this time.");
  }
  const arrayBuf = await originalBlob.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuf);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const signedAt = new Date().toISOString();
  const fingerprintInput = `${sig.signerName}|${sig.method}|${signedAt}|${arrayBuf.byteLength}`;
  const hash = await sha256Hex(fingerprintInput);
  const shortHash = hash.slice(0, 16);
  const signatureMarkDataUrl = await getSignatureMarkDataUrl(sig);

  // ---------- Stamp the inline "Signature:" field on the right page ----------
  // Strategy:
  //   1) Read deterministic anchor from PDF metadata (Subject) written by the
  //      generator: "complee-sig-anchor:{page,x,y,lineH}". jsPDF coordinates
  //      are top-origin in points, identical to pdf-lib once we flip Y.
  //   2) Fallback: locate "Signature:" via pdf.js by grouping text items into
  //      lines (Y-tolerance) and finding the line that contains the literal.
  const navyInline = rgb(10 / 255, 31 / 255, 68 / 255);
  const mutedInline = rgb(0.42, 0.42, 0.42);
  let stamped = false;

  async function stampInline(
    pageIndex: number,
    xPt: number,
    yBaselinePt: number,
  ) {
    const targetPage = pdf.getPages()[pageIndex];
    if (!targetPage) return false;
    if (signatureMarkDataUrl) {
      const base64Inline = signatureMarkDataUrl.split(",")[1] ?? "";
      const bytesInline = Uint8Array.from(atob(base64Inline), (c) =>
        c.charCodeAt(0),
      );
      const pngInline = await pdf.embedPng(bytesInline);
      const targetWInline = 140;
      const scaleInline = targetWInline / pngInline.width;
      const targetHInline = pngInline.height * scaleInline;
      targetPage.drawImage(pngInline, {
        x: xPt,
        y: yBaselinePt - targetHInline / 2,
        width: targetWInline,
        height: targetHInline,
      });
    } else {
      targetPage.drawText(sig.signerName, {
        x: xPt,
        y: yBaselinePt - 4,
        size: 13,
        font: helvBold,
        color: navyInline,
      });
    }
    targetPage.drawText(`Signed electronically · ${signedAt.slice(0, 10)}`, {
      x: xPt,
      y: yBaselinePt - 14,
      size: 7,
      font: helv,
      color: mutedInline,
    });
    return true;
  }

  // 1) Deterministic anchor from generator metadata. Supports both the new
  //    `complee-sig-anchors:{owner,auditor}` envelope and the legacy
  //    `complee-sig-anchor:{...}` single-anchor format.
  try {
    const subject = pdf.getSubject() ?? "";
    type Anchor = { page: number; x: number; y: number; lineH: number };
    let ownerAnchor: Anchor | null = null;
    const mNew = subject.match(/^complee-sig-anchors:(.+)$/);
    const mOld = subject.match(/^complee-sig-anchor:(.+)$/);
    if (mNew) {
      const env = JSON.parse(mNew[1]) as {
        owner: Anchor | null;
        auditor: Anchor | null;
      };
      ownerAnchor = env.owner ?? null;
    } else if (mOld) {
      ownerAnchor = JSON.parse(mOld[1]) as Anchor;
    }
    if (ownerAnchor) {
      const targetPage = pdf.getPages()[ownerAnchor.page - 1];
      if (targetPage) {
        const pageHeight = targetPage.getSize().height;
        const yPdfLib = pageHeight - ownerAnchor.y;
        stamped = await stampInline(ownerAnchor.page - 1, ownerAnchor.x, yPdfLib);
      }
    }
  } catch {
    /* fall through to text-search */
  }

  // 2) Fallback: pdf.js line-grouped text search.
  if (!stamped) {
    try {
      const pdfjs = await import("pdfjs-dist");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
          const workerUrl = (
            await import("pdfjs-dist/build/pdf.worker.mjs?url")
          ).default as string;
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch {
          /* worker resolution is best-effort */
        }
      }
      const pdfjsDoc = await pdfjs.getDocument({
        data: new Uint8Array(arrayBuf),
      }).promise;

      for (let i = pdfjsDoc.numPages; i >= 1 && !stamped; i -= 1) {
        const page = await pdfjsDoc.getPage(i);
        const text = await page.getTextContent();
        const Y_TOL = 3;

        // Group items by Y baseline to reconstruct logical lines.
        type Item = { str: string; x: number; y: number; w: number };
        const lines = new Map<number, Item[]>();
        for (const raw of text.items as Array<{
          str: string;
          transform: number[];
          width?: number;
        }>) {
          if (!raw.str || !raw.str.trim()) continue;
          const yKey = Math.round(raw.transform[5] / Y_TOL) * Y_TOL;
          const arr = lines.get(yKey) ?? [];
          arr.push({
            str: raw.str,
            x: raw.transform[4],
            y: raw.transform[5],
            w: raw.width ?? raw.str.length * 5,
          });
          lines.set(yKey, arr);
        }

        for (const items of lines.values()) {
          items.sort((a, b) => a.x - b.x);
          const joined = items.map((it) => it.str).join("");
          // Owner stamp must NOT land on the "Auditor signature:" line.
          if (/auditor\s*signature\s*:/i.test(joined)) continue;
          if (!/signature\s*:/i.test(joined)) continue;

          // Find the "Signature:" item itself, place stamp right after its
          // text width.
          const labelItem =
            items.find((it) => /signature\s*:/i.test(it.str)) ?? items[0];
          const xAfterLabel = labelItem.x + labelItem.w + 6;
          const targetPage = pdf.getPages()[i - 1];
          if (!targetPage) continue;
          const pageHeight = targetPage.getSize().height;
          // pdf.js Y is bottom-origin too — but the transform gives baseline
          // in user-space. Use directly with pdf-lib (both are bottom-origin
          // in PDF coordinate space).
          const yBaseline = labelItem.y;
          // Sanity check; if anchor seems off-page, flip.
          const yFinal =
            yBaseline >= 0 && yBaseline <= pageHeight ? yBaseline : pageHeight - yBaseline;
          stamped = await stampInline(i - 1, xAfterLabel, yFinal);
          if (stamped) break;
        }
      }
    } catch {
      /* still no inline stamp — audit page below remains as proof */
    }
  }


  // Add a dedicated signature page (cleaner than overlaying on existing pages).
  const sigPage = pdf.addPage();
  const { width, height } = sigPage.getSize();
  const navy = rgb(10 / 255, 31 / 255, 68 / 255);
  const muted = rgb(0.42, 0.42, 0.42);
  const lineColor = rgb(0.83, 0.83, 0.83);

  // Header band
  sigPage.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: navy,
  });
  sigPage.drawText("ELECTRONIC SIGNATURE CERTIFICATE", {
    x: 48,
    y: height - 42,
    size: 14,
    font: helvBold,
    color: rgb(1, 1, 1),
  });
  sigPage.drawText("Generated by Complee", {
    x: 48,
    y: height - 60,
    size: 9,
    font: helv,
    color: rgb(0.85, 0.88, 0.95),
  });

  // Body
  let y = height - 120;
  const col1 = 48;
  const col2 = 200;

  const row = (label: string, value: string) => {
    sigPage.drawText(label, { x: col1, y, size: 10, font: helv, color: muted });
    sigPage.drawText(value, {
      x: col2,
      y,
      size: 11,
      font: helvBold,
      color: navy,
    });
    y -= 22;
  };

  row("Signer name", sig.signerName);
  row("Signature method", sig.method === "typed" ? "Typed name" : "Drawn signature");
  row("Signed at (UTC)", signedAt);
  row("Document hash", `sha256:${shortHash}…`);

  y -= 10;
  sigPage.drawLine({
    start: { x: col1, y },
    end: { x: width - col1, y },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 30;

  sigPage.drawText("Signature", {
    x: col1,
    y,
    size: 10,
    font: helv,
    color: muted,
  });
  y -= 20;

  if (signatureMarkDataUrl) {
    const base64 = signatureMarkDataUrl.split(",")[1] ?? "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const png = await pdf.embedPng(bytes);
    const targetW = 260;
    const scale = targetW / png.width;
    const targetH = png.height * scale;
    sigPage.drawImage(png, {
      x: col1,
      y: y - targetH + 16,
      width: targetW,
      height: targetH,
    });
    y -= targetH + 8;
  } else {
    sigPage.drawText(sig.signerName, {
      x: col1,
      y: y - 6,
      size: 28,
      font: helvBold,
      color: navy,
    });
    y -= 40;
  }

  sigPage.drawLine({
    start: { x: col1, y: y + 4 },
    end: { x: col1 + 320, y: y + 4 },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 16;
  sigPage.drawText(`${sig.signerName} · ${signedAt}`, {
    x: col1,
    y,
    size: 9,
    font: helv,
    color: muted,
  });

  // Footer attestation
  const attest =
    "By applying the signature above, the signer acknowledges they have read and approved " +
    "this document. This electronic signature is bound to the document via the SHA-256 " +
    "hash recorded above and the audit metadata stored in the Complee document library.";
  const wrap = (text: string, maxChars: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxChars) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    if (line) lines.push(line);
    return lines;
  };
  let footY = 80;
  for (const ln of wrap(attest, 95)) {
    sigPage.drawText(ln, { x: col1, y: footY, size: 9, font: helv, color: muted });
    footY -= 12;
  }

  const out = await pdf.save();
  // Use ArrayBuffer copy to satisfy TS BlobPart typing
  const blob = new Blob([out.slice().buffer], { type: "application/pdf" });
  return { blob, hash, signedAt };
}

/**
 * End-to-end sign flow: download stored doc → embed signature → upload signed
 * copy → mark the row as signed. Returns the updated DB row.
 */
export async function signStoredDocument(
  row: SignedDocumentRow,
  sig: SignatureInput,
): Promise<SignedDocumentRow> {
  const original = await downloadDocumentBlob(row.storage_path);
  const { blob, hash, signedAt } = await signPdfBlob(original, sig);

  const userId = await currentUserId();
  const ts = Date.now();
  const signedPath = `${userId}/signed/${ts}-signed-${row.name.replace(/\.pdf$/i, "")}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(signedPath, blob, { contentType: "application/pdf", upsert: false });
  if (upErr) throw upErr;

  const ua = typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 255) : null;
  const { data, error } = await supabase
    .from("signed_documents")
    .update({
      status: "signed",
      signer_name: sig.signerName,
      signature_method: sig.method,
      signature_hash: hash,
      signed_at: signedAt,
      signed_storage_path: signedPath,
      signed_user_agent: ua,
      // Auto-route signed documents into the reviewer portal so invited
      // auditors see them immediately under "Needs review".
      review_status: "awaiting_review",
    })
    .eq("id", row.id)
    .select()
    .single();
  if (error) throw error;
  const updated = data as SignedDocumentRow;

  // Append tamper-evident audit events (best-effort; never block signing)
  if (updated.assessment_id) {
    try {
      const { recordAuditEvent } = await import("./auditTrail");
      await recordAuditEvent({
        assessmentId: updated.assessment_id,
        documentId: updated.id,
        action: "document_signed",
        actorName: sig.signerName,
        actorRole: "owner",
        metadata: {
          method: sig.method,
          hash,
          signed_at: signedAt,
          document_name: updated.name,
        },
      });
      // Also record that the document was auto-routed to the reviewer queue.
      await recordAuditEvent({
        assessmentId: updated.assessment_id,
        documentId: updated.id,
        action: "document_sent_to_reviewer",
        actorName: sig.signerName,
        actorRole: "owner",
        metadata: {
          document_name: updated.name,
          auto: true,
          trigger: "signed",
        },
      });
    } catch (e) {
      console.warn("Audit event after signing failed:", e);
    }
  }

  return updated;
}

/**
 * Stamp the auditor's signature into the inline "Auditor signature:" field
 * of an already-signed PDF and append an Electronic Auditor Approval
 * Certificate page that mirrors the owner's signature certificate.
 *
 * Inline-resolution strategy mirrors the owner stamp: deterministic anchor
 * from PDF metadata, with a pdf.js text-search fallback constrained to lines
 * that contain "Auditor signature:".
 */
export async function stampAuditorSignatureOnBlob(
  pdfBlob: Blob,
  input: {
    reviewerName: string;
    signatureData: string;
    notes?: string | null;
  },
): Promise<Blob> {
  const arrayBuf = await pdfBlob.arrayBuffer();
  const pdf = await PDFDocument.load(arrayBuf);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(10 / 255, 31 / 255, 68 / 255);
  const muted = rgb(0.42, 0.42, 0.42);
  const lineColor = rgb(0.83, 0.83, 0.83);

  const isImage = input.signatureData.startsWith("data:image");
  const signatureMarkDataUrl = await getSignatureMarkDataUrl({
    signerName: input.reviewerName,
    method: isImage ? "drawn" : "typed",
    drawnPngDataUrl: isImage ? input.signatureData : undefined,
  });
  const stampedAt = new Date().toISOString();
  const fingerprintInput = `${input.reviewerName}|auditor|${stampedAt}|${arrayBuf.byteLength}`;
  const approvalHash = await sha256Hex(fingerprintInput);
  const shortHash = approvalHash.slice(0, 16);

  // Pre-embed the signature image once (re-used inline + on certificate page).
  let signaturePng: Awaited<ReturnType<typeof pdf.embedPng>> | null = null;
  if (signatureMarkDataUrl) {
    const base64 = signatureMarkDataUrl.split(",")[1] ?? "";
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    signaturePng = await pdf.embedPng(bytes);
  }

  // ---------- Inline stamp (matches owner stamp dimensions) ----------
  async function stampInline(pageIndex: number, xPt: number, yBaselinePt: number) {
    const page = pdf.getPages()[pageIndex];
    if (!page) return false;
    if (signaturePng) {
      const targetW = 140;
      const scale = targetW / signaturePng.width;
      const targetH = signaturePng.height * scale;
      page.drawImage(signaturePng, {
        x: xPt,
        y: yBaselinePt - targetH / 2,
        width: targetW,
        height: targetH,
      });
    } else {
      page.drawText(input.reviewerName, {
        x: xPt,
        y: yBaselinePt - 4,
        size: 13,
        font: helvBold,
        color: navy,
      });
    }
    page.drawText(`Approved by auditor · ${stampedAt.slice(0, 10)}`, {
      x: xPt,
      y: yBaselinePt - 14,
      size: 7,
      font: helv,
      color: muted,
    });
    return true;
  }

  let stamped = false;

  // 1) Deterministic anchor.
  try {
    const subject = pdf.getSubject() ?? "";
    const m = subject.match(/^complee-sig-anchors:(.+)$/);
    if (m) {
      type Anchor = { page: number; x: number; y: number; lineH: number };
      const env = JSON.parse(m[1]) as { auditor: Anchor | null };
      const a = env.auditor;
      if (a) {
        const page = pdf.getPages()[a.page - 1];
        if (page) {
          const pageHeight = page.getSize().height;
          stamped = await stampInline(a.page - 1, a.x, pageHeight - a.y);
        }
      }
    }
  } catch {
    /* fall through */
  }

  // 2) pdf.js fallback: locate "Auditor signature:" line.
  if (!stamped) {
    try {
      const pdfjs = await import("pdfjs-dist");
      if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        try {
          const workerUrl = (
            await import("pdfjs-dist/build/pdf.worker.mjs?url")
          ).default as string;
          pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
        } catch {
          /* best-effort */
        }
      }
      const pdfjsDoc = await pdfjs.getDocument({
        data: new Uint8Array(arrayBuf),
      }).promise;
      const Y_TOL = 3;
      for (let i = pdfjsDoc.numPages; i >= 1 && !stamped; i -= 1) {
        const page = await pdfjsDoc.getPage(i);
        const text = await page.getTextContent();
        type Item = { str: string; x: number; y: number; w: number };
        const lines = new Map<number, Item[]>();
        for (const raw of text.items as Array<{
          str: string;
          transform: number[];
          width?: number;
        }>) {
          if (!raw.str || !raw.str.trim()) continue;
          const yKey = Math.round(raw.transform[5] / Y_TOL) * Y_TOL;
          const arr = lines.get(yKey) ?? [];
          arr.push({
            str: raw.str,
            x: raw.transform[4],
            y: raw.transform[5],
            w: raw.width ?? raw.str.length * 5,
          });
          lines.set(yKey, arr);
        }
        for (const items of lines.values()) {
          items.sort((a, b) => a.x - b.x);
          const joined = items.map((it) => it.str).join("");
          if (!/auditor\s*signature\s*:/i.test(joined)) continue;
          const labelItem =
            items.find((it) => /auditor|signature/i.test(it.str)) ?? items[0];
          const lastLabelItem =
            [...items]
              .reverse()
              .find((it) => /:/i.test(it.str)) ?? labelItem;
          const xAfterLabel = lastLabelItem.x + lastLabelItem.w + 6;
          const targetPage = pdf.getPages()[i - 1];
          if (!targetPage) continue;
          const pageHeight = targetPage.getSize().height;
          const yBaseline = lastLabelItem.y;
          const yFinal =
            yBaseline >= 0 && yBaseline <= pageHeight
              ? yBaseline
              : pageHeight - yBaseline;
          stamped = await stampInline(i - 1, xAfterLabel, yFinal);
          if (stamped) break;
        }
      }
    } catch {
      /* still no stamp — certificate page below remains as proof */
    }
  }

  // ---------- Auditor approval certificate page ----------
  const sigPage = pdf.addPage();
  const { width, height } = sigPage.getSize();

  // Header band
  sigPage.drawRectangle({
    x: 0,
    y: height - 70,
    width,
    height: 70,
    color: navy,
  });
  sigPage.drawText("ELECTRONIC SIGNATURE CERTIFICATE", {
    x: 48,
    y: height - 42,
    size: 14,
    font: helvBold,
    color: rgb(1, 1, 1),
  });
  sigPage.drawText("Generated by Complee", {
    x: 48,
    y: height - 60,
    size: 9,
    font: helv,
    color: rgb(0.85, 0.88, 0.95),
  });

  // Body
  let y = height - 120;
  const col1 = 48;
  const col2 = 200;
  const row = (label: string, value: string) => {
    sigPage.drawText(label, { x: col1, y, size: 10, font: helv, color: muted });
    sigPage.drawText(value, {
      x: col2,
      y,
      size: 11,
      font: helvBold,
      color: navy,
    });
    y -= 22;
  };

  row("Signer name", input.reviewerName);
  row("Signature method", isImage ? "Drawn signature" : "Typed name");
  row("Signed at (UTC)", stampedAt);
  row("Document hash", `sha256:${shortHash}…`);

  y -= 10;
  sigPage.drawLine({
    start: { x: col1, y },
    end: { x: width - col1, y },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 30;

  sigPage.drawText("Signature", {
    x: col1,
    y,
    size: 10,
    font: helv,
    color: muted,
  });
  y -= 20;

  if (signaturePng) {
    const targetW = 260;
    const scale = targetW / signaturePng.width;
    const targetH = signaturePng.height * scale;
    sigPage.drawImage(signaturePng, {
      x: col1,
      y: y - targetH + 16,
      width: targetW,
      height: targetH,
    });
    y -= targetH + 8;
  } else {
    sigPage.drawText(input.reviewerName, {
      x: col1,
      y: y - 6,
      size: 28,
      font: helvBold,
      color: navy,
    });
    y -= 40;
  }

  sigPage.drawLine({
    start: { x: col1, y: y + 4 },
    end: { x: col1 + 320, y: y + 4 },
    thickness: 0.5,
    color: lineColor,
  });
  y -= 16;
  sigPage.drawText(`${input.reviewerName} · ${stampedAt}`, {
    x: col1,
    y,
    size: 9,
    font: helv,
    color: muted,
  });

  // Wrap helper
  const wrap = (text: string, maxChars: number) => {
    const words = text.split(/\s+/);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      if ((line + " " + w).trim().length > maxChars) {
        lines.push(line.trim());
        line = w;
      } else {
        line = (line + " " + w).trim();
      }
    }
    if (line) lines.push(line);
    return lines;
  };

  // Optional reviewer notes block
  if (input.notes && input.notes.trim()) {
    y -= 24;
    sigPage.drawText("Reviewer notes", {
      x: col1,
      y,
      size: 10,
      font: helv,
      color: muted,
    });
    y -= 14;
    for (const ln of wrap(input.notes.trim(), 95)) {
      sigPage.drawText(ln, { x: col1, y, size: 10, font: helv, color: navy });
      y -= 12;
    }
  }

  // Footer attestation
  const attest =
    "By applying the signature above, the signer acknowledges they have read and approved " +
    "this document. This electronic signature is bound to the document via the SHA-256 " +
    "hash recorded above and the audit metadata stored in the Complee document library.";
  let footY = 80;
  for (const ln of wrap(attest, 95)) {
    sigPage.drawText(ln, { x: col1, y: footY, size: 9, font: helv, color: muted });
    footY -= 12;
  }

  const out = await pdf.save();
  return new Blob([out.slice().buffer], { type: "application/pdf" });
}

/**
 * Download an already-signed PDF, stamp the auditor signature into it, and
 * upload as a new version. Returns the new storage path.
 */
export async function stampAuditorSignatureOnStoredDoc(
  signedPath: string,
  docName: string,
  input: {
    reviewerName: string;
    signatureData: string;
    notes?: string | null;
  },
): Promise<string> {
  const original = await downloadDocumentBlob(signedPath);
  const stampedBlob = await stampAuditorSignatureOnBlob(original, input);
  const userId = await currentUserId();
  const ts = Date.now();
  const newPath = `${userId}/signed/${ts}-approved-${docName.replace(/\.pdf$/i, "")}.pdf`;
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(newPath, stampedBlob, {
      contentType: "application/pdf",
      upsert: false,
    });
  if (upErr) throw upErr;
  return newPath;
}
