import mongoose, { Schema, Model } from "mongoose";

export interface EventDoc {
  name: string;
  bannerUrl: string;
  bannerCid?: string;
  isPaid: boolean;
  price?: number;
  currency?: string;
  approvalNeeded: boolean;
  date: string;
  time: string;
  location: string;
  organization?: string;
  organizationDescription?: string;
  eventDescription?: string;
  lat?: number;
  lng?: number;
  hostAddress?: string;
  status: 'draft' | 'published';
  createdAt: Date;
  updatedAt: Date;
}

const EventSchema = new Schema<EventDoc>(
  {
    name: { type: String, required: true },
    bannerUrl: { type: String, required: true },
    bannerCid: String,
    isPaid: { type: Boolean, required: true },
    price: Number,
    currency: String,
    approvalNeeded: { type: Boolean, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true },
    organization: String,
    organizationDescription: String,
    eventDescription: String,
    lat: Number,
    lng: Number,
    hostAddress: String,
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
  },
  { timestamps: true }
);

export const EventModel: Model<EventDoc> =
  mongoose.models.Event || mongoose.model<EventDoc>("Event", EventSchema);

