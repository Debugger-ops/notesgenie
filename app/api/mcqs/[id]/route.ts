import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import MCQ from "@/models/MCQ";

export async function GET(
  request: Request,
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

    // Support lookup by MCQ ID or by Notes ID
    let mcq = await MCQ.findById(id).catch(() => null);
    if (!mcq) {
      mcq = await MCQ.findOne({ notesId: id });
    }
    if (!mcq) {
      return Response.json({ error: "MCQ not found" }, { status: 404 });
    }

    if (mcq.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ success: true, mcq });
  } catch (error) {
    console.error("Get MCQ error:", error);
    return Response.json(
      { error: "Failed to fetch MCQ" },
      { status: 500 }
    );
  }
}
