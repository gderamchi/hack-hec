// Complee — Document generation: per-step PDF/DOCX + final Master Submission Pack.

import { jsPDF } from "jspdf";
import {
  Document as DocxDocument,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
  PageBreak,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
} from "docx";
import fileSaver from "file-saver";
const { saveAs } = fileSaver;
import type { AssessmentResultRow, CompanyProfile, Requirement } from "@/data/requirements";
import { getPlaybook, type DocumentSection, type DocumentTable, type DocumentTemplate, taskKey } from "./playbook";
import { REGULATORS } from "@/data/regulators";

function isoDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function regulatorName(code: string) {
  return REGULATORS.find((r) => r.code === code)?.country ?? code;
}
function regulatorAuthority(code: string) {
  return REGULATORS.find((r) => r.code === code)?.authority ?? code;
}

interface BuildArgs {
  row: AssessmentResultRow;
  template: DocumentTemplate;
  inputs: Record<string, string>;
  profile: CompanyProfile;
}

function ctx({ row, template, inputs, profile }: BuildArgs) {
  return {
    companyName: profile.companyName,
    authority: row.requirement.authority,
    country: regulatorName(profile.targetCountry),
    homeCountry: regulatorName(profile.homeCountry),
    requirement: row.requirement,
    inputs,
    generatedAt: isoDate(),
  };
}

// ---------- PDF ----------

function pdfFromSections(opts: {
  title: string;
  subtitle: string;
  companyName: string;
  authority: string;
  sections: DocumentSection[];
  footer: string;
}) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 56;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function ensure(space: number) {
    if (y + space > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // Header band
  doc.setFillColor(10, 31, 68);
  doc.rect(0, 0, pageWidth, 84, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("COMPLEE — AI COMPLIANCE CONSULTANT", margin, 32);
  doc.setFontSize(18);
  doc.text(opts.title, margin, 56);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(opts.subtitle, margin, 72);

  y = 110;
  doc.setTextColor(20, 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(opts.companyName, margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(`For: ${opts.authority}`, pageWidth - margin, y, { align: "right" });
  y += 14;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 18;

  function drawTable(table: DocumentTable) {
    const cols = table.columns.length;
    if (cols === 0) return;
    // Column widths: first column gets ~40%, remainder split evenly.
    const widths =
      cols === 1
        ? [contentWidth]
        : [
            contentWidth * 0.4,
            ...Array.from({ length: cols - 1 }, () => (contentWidth * 0.6) / (cols - 1)),
          ];
    const cellPadX = 6;
    const cellPadY = 5;
    const lineH = 12;

    function rowHeight(cells: string[]) {
      let max = lineH;
      cells.forEach((cell, i) => {
        const wrapped = doc.splitTextToSize(String(cell ?? ""), widths[i] - cellPadX * 2);
        max = Math.max(max, wrapped.length * lineH);
      });
      return max + cellPadY * 2;
    }

    function drawRow(cells: string[], opts: { bold?: boolean; fill?: [number, number, number] }) {
      const h = rowHeight(cells);
      ensure(h);
      let x = margin;
      if (opts.fill) {
        doc.setFillColor(opts.fill[0], opts.fill[1], opts.fill[2]);
        doc.rect(margin, y, contentWidth, h, "F");
      }
      doc.setDrawColor(210);
      doc.setLineWidth(0.5);
      doc.rect(margin, y, contentWidth, h);
      doc.setFont("helvetica", opts.bold ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(opts.fill ? 255 : 30, opts.fill ? 255 : 30, opts.fill ? 255 : 30);
      cells.forEach((cell, i) => {
        const wrapped = doc.splitTextToSize(String(cell ?? ""), widths[i] - cellPadX * 2);
        wrapped.forEach((ln: string, lineIdx: number) => {
          doc.text(ln, x + cellPadX, y + cellPadY + lineH * (lineIdx + 1) - 3);
        });
        // vertical separators between cells
        if (i < cells.length - 1) {
          doc.line(x + widths[i], y, x + widths[i], y + h);
        }
        x += widths[i];
      });
      doc.setTextColor(30, 30, 30);
      y += h;
    }

    if (table.caption) {
      ensure(16);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(10);
      doc.setTextColor(90, 90, 90);
      const wrapped = doc.splitTextToSize(table.caption, contentWidth);
      wrapped.forEach((ln: string) => {
        ensure(14);
        doc.text(ln, margin, y + 10);
        y += 14;
      });
      y += 2;
      doc.setTextColor(30, 30, 30);
    }
    drawRow(table.columns, { bold: true, fill: [10, 31, 68] });
    table.rows.forEach((r) => drawRow(r, { bold: false }));
    if (table.footer) drawRow(table.footer, { bold: true, fill: [235, 240, 248] as [number, number, number] });
    y += 8;
  }

  // Track inline signature field positions so the signer dialogs can stamp
  // signatures exactly there (instead of approximating via OCR).
  type Anchor = { page: number; x: number; y: number; lineH: number };
  let signatureAnchor: Anchor | null = null;
  let auditorAnchor: Anchor | null = null;

  for (const section of opts.sections) {
    ensure(40);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(10, 31, 68);
    doc.text(section.heading, margin, y);
    y += 16;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    for (const para of section.body) {
      const lines = doc.splitTextToSize(para, contentWidth);
      for (const line of lines) {
        ensure(16);
        const isAuditorLine = /^\s*auditor\s*signature\s*:/i.test(line);
        const isSignatureLine =
          !isAuditorLine && /^\s*signature\s*:/i.test(line);
        let renderedLine = line;
        if (isAuditorLine) {
          renderedLine =
            line.match(/^\s*auditor\s*signature\s*:/i)?.[0].trimEnd() ??
            "Auditor signature:";
        } else if (isSignatureLine) {
          renderedLine =
            line.match(/^\s*signature\s*:/i)?.[0].trimEnd() ?? "Signature:";
        }
        doc.text(renderedLine, margin, y);
        if (!signatureAnchor && isSignatureLine) {
          const labelWidth = doc.getTextWidth(renderedLine);
          signatureAnchor = {
            page: doc.getNumberOfPages(),
            x: margin + labelWidth + 8,
            y,
            lineH: 14,
          };
        }
        if (!auditorAnchor && isAuditorLine) {
          const labelWidth = doc.getTextWidth(renderedLine);
          auditorAnchor = {
            page: doc.getNumberOfPages(),
            x: margin + labelWidth + 8,
            y,
            lineH: 14,
          };
        }
        y += 14;
      }
      y += 6;
    }
    if (section.tables && section.tables.length > 0) {
      for (const t of section.tables) drawTable(t);
    }
    y += 6;
  }

  // Footer on every page
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFontSize(9);
    doc.setTextColor(150);
    doc.text(opts.footer, margin, pageHeight - 24);
    doc.text(`Page ${i} of ${total}`, pageWidth - margin, pageHeight - 24, { align: "right" });
  }

  // Embed both signature anchors in PDF metadata so signing helpers can find
  // them deterministically.
  if (signatureAnchor || auditorAnchor) {
    doc.setProperties({
      subject: `complee-sig-anchors:${JSON.stringify({
        owner: signatureAnchor,
        auditor: auditorAnchor,
      })}`,
    });
  }

  return doc;
}

// ---------- DOCX ----------

function buildDocxTable(table: DocumentTable): Table {
  const border = { style: BorderStyle.SINGLE, size: 4, color: "CCCCCC" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cols = table.columns.length;
  // Total table width 9000 DXA (~6.25"); first col 40%, rest equal.
  const totalWidth = 9000;
  const widths =
    cols === 1
      ? [totalWidth]
      : [
          Math.round(totalWidth * 0.4),
          ...Array.from({ length: cols - 1 }, () =>
            Math.round((totalWidth * 0.6) / (cols - 1)),
          ),
        ];

  function makeRow(
    cells: string[],
    opts: { bold?: boolean; fill?: string; headerColor?: string } = {},
  ) {
    return new TableRow({
      children: cells.map((cell, i) =>
        new TableCell({
          borders,
          width: { size: widths[i], type: WidthType.DXA },
          shading: opts.fill
            ? { fill: opts.fill, type: ShadingType.CLEAR, color: "auto" }
            : undefined,
          margins: { top: 80, bottom: 80, left: 120, right: 120 },
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: String(cell ?? ""),
                  bold: opts.bold,
                  size: 20,
                  color: opts.headerColor,
                }),
              ],
            }),
          ],
        }),
      ),
    });
  }

  const rows: TableRow[] = [];
  rows.push(makeRow(table.columns, { bold: true, fill: "0A1F44", headerColor: "FFFFFF" }));
  table.rows.forEach((r) => rows.push(makeRow(r)));
  if (table.footer) rows.push(makeRow(table.footer, { bold: true, fill: "EBF0F8" }));

  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths: widths,
    rows,
  });
}

function docxFromSections(opts: {
  title: string;
  subtitle: string;
  companyName: string;
  authority: string;
  sections: DocumentSection[];
  footer: string;
}): DocxDocument {
  const children: (Paragraph | Table)[] = [
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [new TextRun({ text: "COMPLEE — AI COMPLIANCE CONSULTANT", bold: true, size: 18, color: "1E5BFF" })],
    }),
    new Paragraph({ children: [new TextRun({ text: opts.title, bold: true, size: 36, color: "0A1F44" })] }),
    new Paragraph({ children: [new TextRun({ text: opts.subtitle, size: 22, color: "555555" })] }),
    new Paragraph({ children: [new TextRun({ text: " " })] }),
    new Paragraph({
      children: [
        new TextRun({ text: opts.companyName, bold: true, size: 22 }),
        new TextRun({ text: `   ·   For: ${opts.authority}`, size: 20, color: "555555" }),
      ],
    }),
    new Paragraph({ children: [new TextRun({ text: " " })] }),
  ];

  for (const section of opts.sections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.heading, bold: true, color: "0A1F44" })],
      }),
    );
    for (const para of section.body) {
      children.push(new Paragraph({ children: [new TextRun({ text: para, size: 22 })] }));
    }
    if (section.tables && section.tables.length > 0) {
      for (const t of section.tables) {
        if (t.caption) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t.caption, italics: true, size: 20, color: "555555" })],
            }),
          );
        }
        children.push(buildDocxTable(t));
        children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
      }
    }
    children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
  }

  children.push(new Paragraph({ children: [new TextRun({ text: opts.footer, size: 18, color: "888888", italics: true })] }));

  return new DocxDocument({
    creator: "Complee",
    title: opts.title,
    description: opts.subtitle,
    sections: [{ properties: {}, children }],
  });
}

async function downloadDocx(doc: DocxDocument, filename: string) {
  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

function safeFilename(s: string) {
  return s.replace(/[^a-z0-9-_]+/gi, "_").replace(/^_+|_+$/g, "");
}

// ---------- Per-step generator ----------

export async function generateStepDocument(
  args: BuildArgs,
  format: "pdf" | "docx",
) {
  const { blob, filename } = await buildStepDocumentBlob(args, format);
  saveAs(blob, filename);
}

/**
 * Build the per-step document as a Blob (so it can be uploaded to storage,
 * previewed in an iframe, or signed) instead of immediately saving to disk.
 */
export async function buildStepDocumentBlob(
  args: BuildArgs,
  format: "pdf" | "docx",
): Promise<{ blob: Blob; filename: string }> {
  const { row, template, profile } = args;
  const sections = template.build(ctx(args));
  const subtitle = `${template.description}`;
  const footer = `Generated by Complee · ${isoDate()} · ${profile.companyName}`;

  if (format === "pdf") {
    const doc = pdfFromSections({
      title: template.title,
      subtitle,
      companyName: profile.companyName,
      authority: row.requirement.authority,
      sections,
      footer,
    });
    return {
      blob: doc.output("blob"),
      filename: `${safeFilename(template.title)}.pdf`,
    };
  }

  const doc = docxFromSections({
    title: template.title,
    subtitle,
    companyName: profile.companyName,
    authority: row.requirement.authority,
    sections,
    footer,
  });
  const blob = await Packer.toBlob(doc);
  return { blob, filename: `${safeFilename(template.title)}.docx` };
}

// ---------- Final Master Submission Pack ----------

export interface StepProgressMap {
  [requirementId: string]: {
    status: "todo" | "in_progress" | "done";
    completedSubsteps: string[];
    formInputs: Record<string, string>;
    notes?: string;
  };
}

export async function generateMasterDocument(opts: {
  profile: CompanyProfile;
  rows: AssessmentResultRow[];
  progress: StepProgressMap;
  format: "pdf" | "docx";
}) {
  const { profile, rows, progress, format } = opts;
  const authority = regulatorAuthority(profile.targetCountry);
  const targetCountry = regulatorName(profile.targetCountry);

  const overview: DocumentSection = {
    heading: "Executive Summary",
    body: [
      `${profile.companyName}, currently authorised as a ${profile.institutionType} in ${regulatorName(profile.homeCountry)}, hereby submits this consolidated readiness pack in support of authorisation in ${targetCountry} under the supervision of ${authority}.`,
      `This pack consolidates the firm's response to ${rows.length} regulatory requirements identified by Complee's AI-driven gap analysis, completed on ${isoDate()}. It is intended to accompany the formal application form and Annexes G.1 through G.${rows.length}.`,
    ],
  };

  const status: DocumentSection = {
    heading: "Status of Controls",
    body: [
      `Total requirements assessed: ${rows.length}.`,
      `Covered: ${rows.filter((r) => r.status === "covered").length}. Partial: ${rows.filter((r) => r.status === "partial").length}. Missing: ${rows.filter((r) => r.status === "missing").length}.`,
      `Steps completed by the firm at the date of this submission: ${rows.filter((r) => progress[taskKey(r)]?.status === "done").length} of ${rows.length}.`,
    ],
  };

  // Per-requirement annexes
  const annexes: DocumentSection[] = [];
  rows.forEach((row, idx) => {
    const key = taskKey(row);
    const stepProgress = progress[key];
    const inputs = stepProgress?.formInputs ?? {};
    const playbook = getPlaybook(row);
    const heading = `Annex G.${idx + 1} — ${row.requirement.title}`;
    const intro: string[] = [
      `Reference: ${row.requirement.regulation_reference} (${row.requirement.authority}).`,
      `Status: ${row.status.toUpperCase()} · Confidence: ${row.confidence}%.`,
      `Effort estimate: ${playbook.estimatedTime}.`,
    ];
    if (stepProgress?.notes) intro.push(`Firm notes: ${stepProgress.notes}`);
    annexes.push({ heading, body: intro });

    // Render each generated document inline as a sub-section
    for (const tpl of playbook.documents) {
      annexes.push({ heading: `   ${tpl.title}`, body: [tpl.description] });
      const sections = tpl.build(ctx({ row, template: tpl, inputs, profile }));
      for (const s of sections) {
        annexes.push({ heading: `     ${s.heading}`, body: s.body });
      }
    }
  });

  const allSections = [overview, status, ...annexes];
  const subtitle = `Consolidated Authorisation Readiness Pack for ${authority} (${targetCountry})`;
  const footer = `Generated by Complee · ${isoDate()} · ${profile.companyName}`;

  const baseFilename = safeFilename(profile.companyName) + "_Authorisation_Pack";

  if (format === "pdf") {
    const doc = pdfFromSections({
      title: `${profile.companyName} — Authorisation Submission Pack`,
      subtitle,
      companyName: profile.companyName,
      authority,
      sections: allSections,
      footer,
    });
    doc.save(`${baseFilename}.pdf`);
    return;
  }

  const docx = buildMasterDocx({ profile, subtitle, allSections });
  await downloadDocx(docx, `${baseFilename}.docx`);
}

/**
 * Same content as `generateMasterDocument` but returns a Blob instead of
 * triggering a download — used to upload the master pack into storage.
 */
export async function buildMasterDocumentBlob(opts: {
  profile: CompanyProfile;
  rows: AssessmentResultRow[];
  progress: StepProgressMap;
  format: "pdf" | "docx";
}): Promise<{ blob: Blob; filename: string }> {
  const { profile, rows, progress, format } = opts;
  const authority = regulatorAuthority(profile.targetCountry);
  const targetCountry = regulatorName(profile.targetCountry);

  const overview: DocumentSection = {
    heading: "Executive Summary",
    body: [
      `${profile.companyName}, currently authorised as a ${profile.institutionType} in ${regulatorName(profile.homeCountry)}, hereby submits this consolidated readiness pack in support of authorisation in ${targetCountry} under the supervision of ${authority}.`,
      `This pack consolidates the firm's response to ${rows.length} regulatory requirements identified by Complee's AI-driven gap analysis, completed on ${isoDate()}.`,
    ],
  };
  const status: DocumentSection = {
    heading: "Status of Controls",
    body: [
      `Total requirements assessed: ${rows.length}.`,
      `Covered: ${rows.filter((r) => r.status === "covered").length}. Partial: ${rows.filter((r) => r.status === "partial").length}. Missing: ${rows.filter((r) => r.status === "missing").length}.`,
      `Steps completed by the firm at the date of this submission: ${rows.filter((r) => progress[taskKey(r)]?.status === "done").length} of ${rows.length}.`,
    ],
  };
  const annexes: DocumentSection[] = [];
  rows.forEach((row, idx) => {
    const key = taskKey(row);
    const stepProgress = progress[key];
    const inputs = stepProgress?.formInputs ?? {};
    const playbook = getPlaybook(row);
    const heading = `Annex G.${idx + 1} — ${row.requirement.title}`;
    const intro: string[] = [
      `Reference: ${row.requirement.regulation_reference} (${row.requirement.authority}).`,
      `Status: ${row.status.toUpperCase()} · Confidence: ${row.confidence}%.`,
      `Effort estimate: ${playbook.estimatedTime}.`,
    ];
    if (stepProgress?.notes) intro.push(`Firm notes: ${stepProgress.notes}`);
    annexes.push({ heading, body: intro });
    for (const tpl of playbook.documents) {
      annexes.push({ heading: `   ${tpl.title}`, body: [tpl.description] });
      const sections = tpl.build(ctx({ row, template: tpl, inputs, profile }));
      for (const s of sections) {
        annexes.push({ heading: `     ${s.heading}`, body: s.body });
      }
    }
  });

  const allSections = [overview, status, ...annexes];
  const subtitle = `Consolidated Authorisation Readiness Pack for ${authority} (${targetCountry})`;
  const footer = `Generated by Complee · ${isoDate()} · ${profile.companyName}`;
  const baseFilename = safeFilename(profile.companyName) + "_Authorisation_Pack";

  if (format === "pdf") {
    const doc = pdfFromSections({
      title: `${profile.companyName} — Authorisation Submission Pack`,
      subtitle,
      companyName: profile.companyName,
      authority,
      sections: allSections,
      footer,
    });
    return { blob: doc.output("blob"), filename: `${baseFilename}.pdf` };
  }

  const docx = buildMasterDocx({ profile, subtitle, allSections });
  const blob = await Packer.toBlob(docx);
  return { blob, filename: `${baseFilename}.docx` };
}

function buildMasterDocx(opts: {
  profile: CompanyProfile;
  subtitle: string;
  allSections: DocumentSection[];
}): DocxDocument {
  const { profile, subtitle, allSections } = opts;
  const children: (Paragraph | Table)[] = [];
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: "AUTHORISATION SUBMISSION PACK", bold: true, color: "0A1F44", size: 36 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: profile.companyName, bold: true, size: 30 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: subtitle, size: 22, color: "555555" })],
    }),
    new Paragraph({ children: [new TextRun({ text: " " })] }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Generated ${isoDate()}`, size: 20, color: "888888", italics: true })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  );
  for (const section of allSections) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: section.heading, bold: true, color: "0A1F44" })],
      }),
    );
    for (const para of section.body) {
      children.push(new Paragraph({ children: [new TextRun({ text: para, size: 22 })] }));
    }
    if (section.tables && section.tables.length > 0) {
      for (const t of section.tables) {
        if (t.caption) {
          children.push(
            new Paragraph({
              children: [new TextRun({ text: t.caption, italics: true, size: 20, color: "555555" })],
            }),
          );
        }
        children.push(buildDocxTable(t));
        children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
      }
    }
    children.push(new Paragraph({ children: [new TextRun({ text: " " })] }));
  }
  return new DocxDocument({
    creator: "Complee",
    title: `${profile.companyName} Authorisation Pack`,
    sections: [{ properties: {}, children }],
  });
}

export type { Requirement };
