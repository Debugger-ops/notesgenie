import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface ConceptNode {
  concept: string;
  relatedConcepts: string[];
}

export interface INotes extends Document {
  userId: Types.ObjectId;
  fileId: Types.ObjectId;
  title: string;
  summary: string[];
  examNotes: string[];
  keyFormulas: string[];
  rawText: string;
  // Deep analysis fields
  topics?: string[];
  difficulty?: "beginner" | "intermediate" | "advanced";
  estimatedReadTime?: number;
  conceptMap?: ConceptNode[];
  studyTips?: string[];
  hasDeepAnalysis?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const NotesSchema = new Schema<INotes>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    fileId: {
      type: Schema.Types.ObjectId,
      ref: "FileUpload",
      required: [true, "File ID is required"],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    summary: { type: [String], default: [] },
    examNotes: { type: [String], default: [] },
    keyFormulas: { type: [String], default: [] },
    rawText: { type: String, default: "" },
    // Deep analysis
    topics: { type: [String], default: [] },
    difficulty: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
      default: null,
    },
    estimatedReadTime: { type: Number, default: null },
    conceptMap: {
      type: [{ concept: String, relatedConcepts: [String] }],
      default: [],
    },
    studyTips: { type: [String], default: [] },
    hasDeepAnalysis: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Notes: Model<INotes> =
  mongoose.models.Notes || mongoose.model<INotes>("Notes", NotesSchema);

export default Notes;
