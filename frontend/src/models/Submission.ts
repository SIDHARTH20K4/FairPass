import mongoose, { Schema, Model } from "mongoose";

export interface SubmissionDoc {
  eventId: string; // ObjectId string
  address?: string;
  values: Record<string, string>;
  status: "pending" | "approved" | "rejected";
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature?: string;
  createdAt: Date;
  updatedAt: Date;
}

const SubmissionSchema = new Schema<SubmissionDoc>(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    address: String,
    values: { type: Object, required: true },
    status: { type: String, enum: ["pending", "approved", "rejected"], required: true },
    qrCid: String,
    qrUrl: String,
    jsonCid: String,
    jsonUrl: String,
    signature: String,
  },
  { timestamps: true }
);

export const SubmissionModel: Model<SubmissionDoc> =
  mongoose.models.Submission || mongoose.model<SubmissionDoc>("Submission", SubmissionSchema);

