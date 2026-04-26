import { POST } from "@/app/api/extract-document/route";

const EXPECTED_TEXT =
  "RegPilot PDF parser smoke test with embedded text evidence for production extraction.";

async function main() {
  const formData = new FormData();
  const pdfBytes = createTextPdf(EXPECTED_TEXT);
  const file = new File([pdfBytes], "parser-smoke.pdf", {
    type: "application/pdf"
  });

  formData.append("file", file);

  const response = await POST(
    new Request("http://localhost/api/extract-document", {
      method: "POST",
      body: formData
    })
  );
  const payload = (await response.json().catch(() => null)) as
    | { document?: { name?: string; type?: string; content?: string }; error?: string }
    | null;

  if (!response.ok || !payload?.document?.content) {
    throw new Error(
      `PDF extraction failed with ${response.status}: ${payload?.error ?? "missing payload"}`
    );
  }

  if (!payload.document.content.includes(EXPECTED_TEXT)) {
    throw new Error(
      `PDF extraction returned unexpected text: ${JSON.stringify(payload.document.content)}`
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        status: response.status,
        documentName: payload.document.name,
        contentLength: payload.document.content.length
      },
      null,
      2
    )
  );
}

function createTextPdf(text: string): ArrayBuffer {
  const escaped = text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const stream = `BT /F1 12 Tf 72 720 Td (${escaped}) Tj ET`;
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream\nendobj\n`
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += object;
  }

  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (const offset of offsets.slice(1)) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  const buffer = Buffer.from(pdf, "latin1");
  return buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  ) as ArrayBuffer;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
