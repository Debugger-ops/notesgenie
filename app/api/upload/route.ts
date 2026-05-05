import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { saveFile } from "@/lib/upload";
import FileUpload from "@/models/FileUpload";
import path from "path";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as unknown as { id: string }).id;

    await connectDB();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return Response.json({ error: "No file provided" }, { status: 400 });
    }

    const uploadResult = await saveFile(file, userId);

    const ext = path.extname(file.name).toLowerCase().replace(".", "");
    const fileType = ext === "pdf" ? "pdf" : "pptx";

    const fileRecord = await FileUpload.create({
      userId,
      fileName: uploadResult.fileName,
      originalName: file.name,
      fileType,
      fileSize: uploadResult.fileSize,
      filePath: uploadResult.filePath,
      status: "uploaded",
    });

    return Response.json({ success: true, fileId: fileRecord._id }, { status: 201 });
  } catch (error) {
    console.error("Upload error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to upload file";
    return Response.json({ error: message }, { status: 500 });
  }
}
