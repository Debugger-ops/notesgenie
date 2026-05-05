import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import FileUpload from "@/models/FileUpload";
import Notes from "@/models/Notes";
import MCQ from "@/models/MCQ";
import fs from "fs/promises";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;
    const { id } = await params;

    await connectDB();

    const file = await FileUpload.findById(id);
    if (!file) {
      return Response.json({ error: "File not found" }, { status: 404 });
    }

    if (file.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete associated notes and MCQs if any
    await Notes.deleteMany({ fileId: id });
    await MCQ.deleteMany({ fileId: id });

    // Delete the physical file if it exists
    try {
      await fs.unlink(file.filePath);
    } catch {
      // File may already be gone — not a fatal error
    }

    // Delete the file record
    await FileUpload.findByIdAndDelete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE file error:", error);
    return Response.json({ error: "Failed to delete file" }, { status: 500 });
  }
}
