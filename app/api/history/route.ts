import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import FileUpload from "@/models/FileUpload";
import Notes from "@/models/Notes";
import MCQ from "@/models/MCQ";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;

    await connectDB();

    // Get all file uploads for the user, sorted by newest first
    const files = await FileUpload.find({ userId })
      .sort({ createdAt: -1 })
      .lean();

    // Get associated notes and MCQ IDs for each file
    const fileIds = files.map((f) => f._id);

    const [notesRecords, mcqRecords] = await Promise.all([
      Notes.find({ fileId: { $in: fileIds } })
        .select("_id fileId title")
        .lean(),
      MCQ.find({ fileId: { $in: fileIds } })
        .select("_id fileId")
        .lean(),
    ]);

    // Build a lookup map by fileId
    const notesMap = new Map<string, { _id: string; title: string }[]>();
    for (const note of notesRecords) {
      const key = note.fileId.toString();
      if (!notesMap.has(key)) notesMap.set(key, []);
      notesMap.get(key)!.push({ _id: note._id.toString(), title: note.title });
    }

    const mcqMap = new Map<string, { _id: string }[]>();
    for (const mcq of mcqRecords) {
      const key = mcq.fileId.toString();
      if (!mcqMap.has(key)) mcqMap.set(key, []);
      mcqMap.get(key)!.push({ _id: mcq._id.toString() });
    }

    const history = files.map((file) => ({
      ...file,
      notes: notesMap.get(file._id.toString()) ?? [],
      mcqs: mcqMap.get(file._id.toString()) ?? [],
    }));

    return Response.json({ success: true, history });
  } catch (error) {
    console.error("History error:", error);
    return Response.json(
      { error: "Failed to fetch history" },
      { status: 500 }
    );
  }
}
