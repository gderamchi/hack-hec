import { PDFParse } from "pdf-parse";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import type { UploadedDocument } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MIN_EXTRACTED_CHARS = 20;

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
  const data = new Uint8Array(await file.arrayBuffer());
  PDFParse.setWorker(
    pathToFileURL(
      join(process.cwd(), "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs")
    ).href
  );
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
