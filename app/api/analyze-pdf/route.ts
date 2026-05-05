import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { deepAnalyzeText } from "@/lib/ai";
import Notes from "@/models/Notes";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { notesId } = await request.json();

    if (!notesId) {
      return Response.json({ error: "notesId is required" }, { status: 400 });
    }

    await connectDB();

    const notes = await Notes.findById(notesId);
    if (!notes) {
      return Response.json({ error: "Notes not found" }, { status: 404 });
    }

    if (notes.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!notes.rawText || notes.rawText.trim().length < 50) {
      return Response.json(
        { error: "Not enough text content to analyze" },
        { status: 400 }
      );
    }

    // Run deep analysis
    const analysis = await deepAnalyzeText(notes.rawText, userId);

    // Update notes with deep analysis results
    await Notes.findByIdAndUpdate(notesId, {
      $set: {
        summary: analysis.summary.length > 0 ? analysis.summary : notes.summary,
        examNotes: analysis.examNotes.length > 0 ? analysis.examNotes : notes.examNotes,
        keyFormulas: analysis.keyFormulas.length > 0 ? analysis.keyFormulas : notes.keyFormulas,
        topics: analysis.topics,
        difficulty: analysis.difficulty,
        estimatedReadTime: analysis.estimatedReadTime,
        conceptMap: analysis.conceptMap,
        studyTips: analysis.studyTips,
        hasDeepAnalysis: true,
      },
    });

    return Response.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error("Analyze PDF error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to analyze document";
    return Response.json({ error: message }, { status: 500 });
  }
}
