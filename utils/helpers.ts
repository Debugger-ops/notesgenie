/**
 * Format bytes into a human-readable file size string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const units = ["Bytes", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const size = parseFloat((bytes / Math.pow(k, i)).toFixed(2));

  return `${size} ${units[i]}`;
}

/**
 * Format a date into a readable string (e.g. "Jan 15, 2026").
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Extract the file type from a filename based on its extension.
 */
export function getFileTypeFromName(
  name: string
): "pdf" | "pptx" | "unknown" {
  const extension = name.toLowerCase().split(".").pop();
  if (extension === "pdf") return "pdf";
  if (extension === "pptx") return "pptx";
  return "unknown";
}

/**
 * Truncate text to a maximum length, appending an ellipsis if truncated.
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "...";
}

/**
 * Calculate a percentage score from correct answers and total questions.
 */
export function calculateScore(correct: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((correct / total) * 100);
}
