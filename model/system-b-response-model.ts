import mongoose, { Document, Schema, Model } from "mongoose";

export interface ISystemBResponse extends Document {
  sessionId: string;
  messageIndex: number; // Index of the message in the session
  userMessage: string;
  assistantResponse: string;
  questionType?: string;
  codeContent?: string;
  codeLanguage?: string;
  createdAt: Date;
}

const systemBResponseSchema = new Schema<ISystemBResponse>(
  {
    sessionId: { type: String, required: true, index: true },
    messageIndex: { type: Number, required: true },
    userMessage: { type: String, required: true },
    assistantResponse: { type: String, required: true },
    questionType: { type: String },
    codeContent: { type: String },
    codeLanguage: { type: String },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient querying
systemBResponseSchema.index(
  { sessionId: 1, messageIndex: 1 },
  { unique: true }
);

const SystemBResponse: Model<ISystemBResponse> =
  mongoose.models.SystemBResponse ||
  mongoose.model<ISystemBResponse>("SystemBResponse", systemBResponseSchema);

export default SystemBResponse;
