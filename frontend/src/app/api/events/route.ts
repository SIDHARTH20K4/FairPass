import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { EventModel } from "@/models/Event";

export async function GET() {
  await connectDB();
  const events = await EventModel.find().sort({ createdAt: -1 }).lean();
  return NextResponse.json(events.map((e: any) => ({ ...e, id: String(e._id) })));
}

export async function POST(req: Request) {
  await connectDB();
  const body = await req.json();
  const created = await EventModel.create(body);
  return NextResponse.json({ ...created.toObject(), id: String(created._id) });
}

