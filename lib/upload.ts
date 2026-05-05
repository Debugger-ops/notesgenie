import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const ALLOWED_TYPES = ["application/pdf", "application/vnd.openxmlformats-officedocument.presentationml.presentation"];
const ALLOWED_EXTENSIONS = [".pdf", ".pptx"];

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? String(50 * 1024 * 1024), 10); // default 50MB

// On Vercel (serverless) process.cwd() is read-only. Use /tmp for temporary
// file storage — files only need to exist long enough to extract text.
const UPLOAD_DIR = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");

export interface UploadResult {
  fileName: string;
  filePath: string;
  fileSize: number;
}

export async function saveFile(
  file: File,
  userId: string
): Promise<UploadResult> {
  // Validate file type
  const ext = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext) && !ALLOWED_TYPES.includes(file.type)) {
    throw new Error(
      `Invalid file type. Only PDF and PPTX files are allowed.`
    );
  }

  // Validate file size
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File too large. Maximum size is ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB.`
    );
  }

  // Create user-specific upload directory
  const userDir = path.join(UPLOAD_DIR, userId);
  await fs.mkdir(userDir, { recursive: true });

  // Generate unique filename
  const uniqueName = `${uuidv4()}${ext}`;
  const filePath = path.join(userDir, uniqueName);

  // Write file to disk
  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  return {
    fileName: file.name,
    filePath,
    fileSize: file.size,
  };
}
