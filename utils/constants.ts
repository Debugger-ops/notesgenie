export const FREE_UPLOAD_LIMIT = 3;
export const PRO_UPLOAD_LIMIT = 999999;
export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [".pdf", ".pptx"];

export const APP_NAME = "AI StudyMate";

export const PROCESSING_STATUS = {
  pending: "Pending",
  uploading: "Uploading...",
  processing: "Processing with AI...",
  generating_notes: "Generating notes...",
  generating_mcqs: "Generating MCQs...",
  completed: "Completed",
  failed: "Failed",
} as const;

export type ProcessingStatus = keyof typeof PROCESSING_STATUS;
