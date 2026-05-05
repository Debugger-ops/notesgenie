import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IProgressAnswer {
  questionIndex: number;
  selectedAnswer: number;
  isCorrect: boolean;
}

export interface IProgress extends Document {
  userId: Types.ObjectId;
  mcqId: Types.ObjectId;
  answers: IProgressAnswer[];
  knownCards: number[];
  unknownCards: number[];
  score: number;
  totalQuestions: number;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProgressAnswerSchema = new Schema<IProgressAnswer>(
  {
    questionIndex: {
      type: Number,
      required: true,
    },
    selectedAnswer: {
      type: Number,
      required: true,
    },
    isCorrect: {
      type: Boolean,
      required: true,
    },
  },
  { _id: false }
);

const ProgressSchema = new Schema<IProgress>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    mcqId: {
      type: Schema.Types.ObjectId,
      ref: "MCQ",
      required: [true, "MCQ ID is required"],
      index: true,
    },
    answers: {
      type: [ProgressAnswerSchema],
      default: [],
    },
    knownCards: {
      type: [Number],
      default: [],
    },
    unknownCards: {
      type: [Number],
      default: [],
    },
    score: {
      type: Number,
      default: 0,
    },
    totalQuestions: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Progress: Model<IProgress> =
  mongoose.models.Progress ||
  mongoose.model<IProgress>("Progress", ProgressSchema);

export default Progress;
