import fs from "fs/promises";

export async function parsePDF(filePath: string) {
  // dynamic import INSIDE function (prevents turbopack bundling issue)
  const mod = await import("pdf-parse");

  const pdfParse =
    (mod as any).default ||
    mod;

  const buffer = await fs.readFile(filePath);

  const data = await pdfParse(buffer);

  return data.text || "";
}