import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Notes from "@/models/Notes";

/* ─── GET ─── */
export async function GET(
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

    const notes = await Notes.findById(id).populate("fileId");
    if (!notes) {
      return Response.json({ error: "Notes not found" }, { status: 404 });
    }

    if (notes.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    return Response.json({ success: true, notes });
  } catch (error) {
    console.error("Get notes error:", error);
    return Response.json({ error: "Failed to fetch notes" }, { status: 500 });
  }
}

/* ─── PATCH (edit) ─── */
export async function PATCH(
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
    const body = await request.json();

    await connectDB();

    const notes = await Notes.findById(id);
    if (!notes) {
      return Response.json({ error: "Notes not found" }, { status: 404 });
    }

    if (notes.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    // Only allow editing these fields
    const allowed = ["title", "summary", "examNotes", "keyFormulas", "studyTips"];
    const update: Record<string, unknown> = {};

    for (const field of allowed) {
      if (body[field] !== undefined) {
        update[field] = body[field];
      }
    }

    const updated = await Notes.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    ).populate("fileId");

    return Response.json({ success: true, notes: updated });
  } catch (error) {
    console.error("PATCH notes error:", error);
    return Response.json({ error: "Failed to update notes" }, { status: 500 });
  }
}

/* ─── DELETE ─── */
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

    const notes = await Notes.findById(id);
    if (!notes) {
      return Response.json({ error: "Notes not found" }, { status: 404 });
    }

    if (notes.userId.toString() !== userId) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    await Notes.findByIdAndDelete(id);

    return Response.json({ success: true });
  } catch (error) {
    console.error("DELETE notes error:", error);
    return Response.json({ error: "Failed to delete notes" }, { status: 500 });
  }
}
