import mongoose, { Document, Schema, Model } from "mongoose";

export interface IRatingScores {
  overall: number;
}

export interface IEvaluation extends Document {
  sessionId: string;
  messageIndex: number;
  evaluatorId: string;
  evaluatorEmail?: string;

  // Randomization tracking
  leftSystem: "A" | "B";
  rightSystem: "A" | "B";

  // Individual ratings (1-5)
  systemAScores: IRatingScores;
  systemBScores: IRatingScores;

  // Comparative preference
  preference: "A" | "B" | "tie" | "both_bad";

  // Optional feedback
  comments?: string;
  flaggedIssues?: string[];

  // Metadata
  timeSpent: number; // in seconds
  skipped: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ratingScoresSchema = new Schema<IRatingScores>(
  {
    overall: { type: Number, required: true, min: 1, max: 5 },
  },
  { _id: false }
);

const evaluationSchema = new Schema<IEvaluation>(
  {
    sessionId: { type: String, required: true, index: true },
    messageIndex: { type: Number, required: true },
    evaluatorId: { type: String, required: true, index: true },
    evaluatorEmail: { type: String },

    leftSystem: { type: String, enum: ["A", "B"], required: true },
    rightSystem: { type: String, enum: ["A", "B"], required: true },

    systemAScores: { type: ratingScoresSchema, required: true },
    systemBScores: { type: ratingScoresSchema, required: true },

    preference: {
      type: String,
      enum: ["A", "B", "tie", "both_bad"],
      required: true,
    },

    comments: { type: String },
    flaggedIssues: [{ type: String }],

    timeSpent: { type: Number, required: true, default: 0 },
    skipped: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
);

// Compound indexes
evaluationSchema.index(
  { sessionId: 1, messageIndex: 1, evaluatorId: 1 },
  { unique: true }
);
evaluationSchema.index({ createdAt: -1 });

const Evaluation: Model<IEvaluation> =
  mongoose.models.Evaluation ||
  mongoose.model<IEvaluation>("Evaluation", evaluationSchema);

export default Evaluation;
