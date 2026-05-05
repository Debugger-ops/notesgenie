import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { generateMCQs } from "@/lib/ai";
import Notes from "@/models/Notes";
import MCQ from "@/models/MCQ";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { notesId, count } = await request.json();

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

    // Generate MCQs from the raw text
    const mcqQuestions = await generateMCQs(notes.rawText, count ?? 10);

    // Create MCQ record
    const mcqs = await MCQ.create({
      userId,
      fileId: notes.fileId,
      notesId: notes._id,
      questions: mcqQuestions,
    });

    return Response.json({ success: true, mcqs });
  } catch (error) {
    console.error("Generate MCQs error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to generate MCQs";
    return Response.json({ error: message }, { status: 500 });
  }
}
