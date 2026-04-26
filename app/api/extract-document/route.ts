import type { UploadedDocument } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MIN_EXTRACTED_CHARS = 20;
let pdfParserPromise: Promise<typeof import("pdf-parse").PDFParse> | null = null;

export async function POST(request: Request) {
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");

  if (!(file instanceof File)) {
    return Response.json({ error: "No file was provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return Response.json(
      { error: "File is too large. The current limit is 12 MB." },
      { status: 413 }
    );
  }

  const extension = getExtension(file.name);

  try {
    if (extension === "pdf" || file.type === "application/pdf") {
      const content = await extractPdfText(file);
      return Response.json({
        document: {
          name: file.name,
          type: "application/pdf",
          content
        } satisfies UploadedDocument
      });
    }

    if (extension === "txt" || extension === "md" || file.type.startsWith("text/")) {
      const content = (await file.text()).trim();
      if (!content) {
        return Response.json({ error: "The uploaded text file is empty." }, { status: 422 });
      }

      return Response.json({
        document: {
          name: file.name,
          type: file.type || `text/${extension || "plain"}`,
          content
        } satisfies UploadedDocument
      });
    }

    return Response.json(
      { error: "Unsupported file type. Upload .pdf, .txt or .md files." },
      { status: 415 }
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Document extraction failed with an unknown error."
      },
      { status: 422 }
    );
  }
}

function getExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

async function extractPdfText(file: File): Promise<string> {
  const PDFParse = await getPdfParser();
  const data = new Uint8Array(await file.arrayBuffer());
  const parser = new PDFParse({ data });

  try {
    const result = await parser.getText();
    const text = result.text.replace(/\s+\n/g, "\n").trim();

    if (text.length < MIN_EXTRACTED_CHARS) {
      throw new Error(
        "PDF text extraction did not find enough readable text. Scanned PDFs need OCR before upload."
      );
    }

    return text;
  } finally {
    await parser.destroy();
  }
}

function getPdfParser(): Promise<typeof import("pdf-parse").PDFParse> {
  pdfParserPromise ??= loadPdfParser();
  return pdfParserPromise;
}

async function loadPdfParser(): Promise<typeof import("pdf-parse").PDFParse> {
  await ensurePdfRuntimePolyfills();

  const [{ PDFParse }, { getData }] = await Promise.all([
    import("pdf-parse"),
    import("pdf-parse/worker")
  ]);
  PDFParse.setWorker(getData());
  return PDFParse;
}

async function ensurePdfRuntimePolyfills(): Promise<void> {
  const canvas = await import("@napi-rs/canvas");

  globalThis.DOMMatrix ??= canvas.DOMMatrix as unknown as typeof DOMMatrix;
  globalThis.ImageData ??= canvas.ImageData as unknown as typeof ImageData;
  globalThis.Path2D ??= canvas.Path2D as unknown as typeof Path2D;
}
