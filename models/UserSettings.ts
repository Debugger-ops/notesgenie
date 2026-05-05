import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IUserSettings extends Document {
  userId: Types.ObjectId;
  aiProvider: "groq" | "gemini" | "ollama";
  groqApiKey?: string;
  geminiApiKey?: string;
  groqModel?: string;
  geminiModel?: string;
  ollamaModel?: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserSettingsSchema = new Schema<IUserSettings>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    aiProvider: {
      type: String,
      enum: ["groq", "gemini", "ollama"],
      default: "groq",
    },
    groqApiKey: { type: String, default: "" },
    geminiApiKey: { type: String, default: "" },
    groqModel: { type: String, default: "llama-3.1-8b-instant" },
    geminiModel: { type: String, default: "gemini-1.5-flash" },
    ollamaModel: { type: String, default: "llama3.1:8b-instruct" },
  },
  { timestamps: true }
);

const UserSettings: Model<IUserSettings> =
  mongoose.models.UserSettings ||
  mongoose.model<IUserSettings>("UserSettings", UserSettingsSchema);

export default UserSettings;
