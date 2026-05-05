import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { extractText } from "@/lib/file-processor";
import { summarizeText } from "@/lib/ai";
import { generateMCQs } from "@/lib/ai";
import FileUpload from "@/models/FileUpload";
import Notes from "@/models/Notes";
import MCQ from "@/models/MCQ";

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

    // Update status to processing
    await FileUpload.findByIdAndUpdate(fileId, { status: "processing" });

    try {
      // Extract text from the file
      const rawText = await extractText(fileRecord.filePath, fileRecord.fileType);

      if (!rawText || rawText.trim().length < 50) {
        throw new Error("Could not extract enough text from this file. The file may be empty or image-based.");
      }

      // Run sequentially — pass userId so the right AI provider is used
      const summaryResult = await summarizeText(rawText, userId);
      const mcqQuestions = await generateMCQs(rawText, userId);

      // Validate AI output before saving
      if (!summaryResult.summary || summaryResult.summary.length === 0) {
        throw new Error("AI failed to generate a valid summary");
      }

      // Create Notes record
      const notes = await Notes.create({
        userId,
        fileId,
        title: fileRecord.originalName.replace(/\.[^.]+$/, ""),
        summary: summaryResult.summary,
        examNotes: summaryResult.examNotes || [],
        keyFormulas: summaryResult.keyFormulas || [],
        rawText,
      });

      // Create MCQ record (mcqQuestions already sanitized by ai.ts)
      const mcqs = await MCQ.create({
        userId,
        fileId,
        notesId: notes._id,
        questions: mcqQuestions.length > 0 ? mcqQuestions : [],
      });

      // Update status to completed
      await FileUpload.findByIdAndUpdate(fileId, { status: "completed" });

      return Response.json({
        success: true,
        notesId: notes._id,
        mcqId: mcqs._id,
      });
    } catch (processingError) {
      // Update status to failed on error
      await FileUpload.findByIdAndUpdate(fileId, { status: "failed" });
      throw processingError;
    }
  } catch (error) {
    console.error("Process file error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to process file";
    return Response.json({ error: message }, { status: 500 });
  }
}
