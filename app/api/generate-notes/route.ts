import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { extractText } from "@/lib/file-processor";
import { summarizeText } from "@/lib/ai";
import FileUpload from "@/models/FileUpload";
import Notes from "@/models/Notes";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { fileId } = await request.json();

    if (!fileId) {
      return Response.json({ error: "fileId is required" }, { status: 400 });
    }

    await connectDB();

    const fileRecord = await FileUpload.findById(fileId);
    if (!fileRecord) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (fileRecord.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Extract text from the file
    const rawText = await extractText(fileRecord.filePath, fileRecord.fileType);

    // Generate summary
    const summaryResult = await summarizeText(rawText);

    // Create Notes record
    const notes = await Notes.create({
      userId,
      fileId,
      title: fileRecord.originalName.replace(/\.[^.]+$/, ""),
      summary: summaryResult.summary,
      examNotes: summaryResult.examNotes,
      keyFormulas: summaryResult.keyFormulas,
      rawText,
    });

    return Response.json({ success: true, notes });
  } catch (error) {
    console.error("Generate notes error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate notes";
    return Response.json({ error: message }, { status: 500 });
  }
}
