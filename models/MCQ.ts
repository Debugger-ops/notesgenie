import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IMCQQuestion {
  question: string;
  options: [string, string, string, string];
  correctAnswer: number;
  explanation: string;
}

export interface IMCQ extends Document {
  userId: Types.ObjectId;
  fileId: Types.ObjectId;
  notesId: Types.ObjectId;
  questions: IMCQQuestion[];
  createdAt: Date;
  updatedAt: Date;
}

const MCQQuestionSchema = new Schema<IMCQQuestion>(
  {
    question: {
      type: String,
      required: true,
    },
    options: {
      type: [String],
      validate: {
        validator: (val: string[]) => val.length === 4,
        message: "Each question must have exactly 4 options",
      },
      required: true,
    },
    correctAnswer: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const MCQSchema = new Schema<IMCQ>(
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
    notesId: {
      type: Schema.Types.ObjectId,
      ref: "Notes",
      required: [true, "Notes ID is required"],
      index: true,
    },
    questions: {
      type: [MCQQuestionSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

const MCQ: Model<IMCQ> =
  mongoose.models.MCQ || mongoose.model<IMCQ>("MCQ", MCQSchema);

export default MCQ;
