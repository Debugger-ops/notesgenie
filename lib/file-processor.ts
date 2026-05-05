import fs from "fs/promises";
import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/* =========================
   PDF TEXT EXTRACTION
========================= */

import pdfParse from "pdf-parse"; // ✅ FIXED (no dynamic import)
import { parsePDF } from "./pdf-parser";

export async function extractTextFromPDF(filePath: string) {
  try {
    return await parsePDF(filePath);
  } catch (err) {
    console.error(err);
    throw new Error("PDF parsing failed");
  }
}


/* =========================
   PPTX TEXT EXTRACTION
========================= */

export async function extractTextFromPPTX(filePath: string): Promise<string> {
  const absolutePath = path.resolve(filePath);

  const tmpDir = path.join(
    path.dirname(absolutePath),
    `.pptx-tmp-${Date.now()}`
  );

  try {
    await fs.mkdir(tmpDir, { recursive: true });

    await execFileAsync("unzip", ["-o", absolutePath, "-d", tmpDir]);

    const slidesDir = path.join(tmpDir, "ppt", "slides");
    let allText = "";

    try {
      const files = await fs.readdir(slidesDir);

      const slideFiles = files
        .filter((f) => /^slide\d+\.xml$/.test(f))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || "0");
          const numB = parseInt(b.match(/\d+/)?.[0] || "0");
          return numA - numB;
        });

      for (const slideFile of slideFiles) {
        const xml = await fs.readFile(
          path.join(slidesDir, slideFile),
          "utf-8"
        );

        const text = xml
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();

        if (text) allText += text + "\n\n";
      }
    } catch {
      const allFiles = await getAllFiles(tmpDir);

      for (const file of allFiles) {
        if (file.endsWith(".xml")) {
          const xml = await fs.readFile(file, "utf-8");

          const text = xml
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

          if (text) allText += text + "\n\n";
        }
      }
    }

    return allText.trim();
  } finally {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

/* =========================
   RECURSIVE FILE SCANNER
========================= */

async function getAllFiles(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await getAllFiles(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

/* =========================
   MAIN EXPORT
========================= */

export async function extractText(
  filePath: string,
  fileType: "pdf" | "pptx"
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return await extractTextFromPDF(filePath);

    case "pptx":
      return await extractTextFromPPTX(filePath);

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}