import mongoose, { Document, Schema, Model, Types } from "mongoose";

export interface IMessage {
  id: string;
  role: "user" | "assistant";
  questionType: string;
  content: string;
  codeContent?: string;
  codeLanguage?: string;
  codeOutputPreference: string;
  createdAt: Date;
  probableQuestionType?: string;
  version?: string;
  feedbackGiven?: boolean;
}

interface ISession extends Document {
  sessionId: string;
  title?: string;
  messages: IMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const messageSchema = new Schema<IMessage>({
  role: { type: String, enum: ["user", "assistant"], required: true },
  questionType: { type: String, required: true },
  content: { type: String, required: true },
  codeContent: { type: String },
  codeLanguage: { type: String },
  codeOutputPreference: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  probableQuestionType: {
    type: String,
    required: false,
  },
  version: {
    type: String,
    default: "1.0",
  },
  feedbackGiven: { type: Boolean, default: false },
});

const sessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    messages: [messageSchema],
    title: { type: String },
  },
  {
    timestamps: true,
  }
);


// Check if model already exists
let Session: Model<ISession>;
try {
  Session = mongoose.model<ISession>('Session');
} catch {
  Session = mongoose.model<ISession>('Session', sessionSchema);
}

export default Session;