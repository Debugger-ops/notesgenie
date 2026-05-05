import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IFileUpload extends Document {
  userId: Types.ObjectId;
  fileName: string;
  originalName: string;
  fileType: "pdf" | "pptx";
  fileSize: number;
  filePath: string;
  status: "uploaded" | "processing" | "completed" | "failed";
  createdAt: Date;
  updatedAt: Date;
}

const FileUploadSchema = new Schema<IFileUpload>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    fileName: {
      type: String,
      required: [true, "File name is required"],
    },
    originalName: {
      type: String,
      required: [true, "Original file name is required"],
    },
    fileType: {
      type: String,
      enum: ["pdf", "pptx"],
      required: [true, "File type is required"],
    },
    fileSize: {
      type: Number,
      required: [true, "File size is required"],
    },
    filePath: {
      type: String,
      required: [true, "File path is required"],
    },
    status: {
      type: String,
      enum: ["uploaded", "processing", "completed", "failed"],
      default: "uploaded",
    },
  },
  {
    timestamps: true,
  }
);

const FileUpload: Model<IFileUpload> =
  mongoose.models.FileUpload ||
  mongoose.model<IFileUpload>("FileUpload", FileUploadSchema);

export default FileUpload;
