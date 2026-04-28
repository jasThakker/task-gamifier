import { PDFParse } from "pdf-parse";
import type { NormalizedContent } from "@/server/ingest/types";

export async function ingestPDF(
  buffer: Buffer,
  filename: string
): Promise<Extract<NormalizedContent, { kind: "pdf" }>> {
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  const pageTexts = result.pages.map((p) => p.text.trim()).filter((t) => t.length > 0);

  if (pageTexts.length === 0) {
    throw new Error("No text could be extracted from this PDF. It may be scanned or image-only.");
  }

  const title = filename.replace(/\.pdf$/i, "").replace(/[-_]/g, " ").trim() || "Uploaded PDF";

  return { kind: "pdf", title, pageTexts, totalPages: result.total };
}
