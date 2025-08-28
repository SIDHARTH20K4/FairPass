import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { SubmissionModel } from "@/models/Submission";

export async function PATCH(req: Request, { params }: { params: { id: string; subId: string } }) {
  await connectDB();
  const patch = await req.json();
  const s = await SubmissionModel.findByIdAndUpdate(params.subId, patch, { new: true }).lean();
  if (!s) return new NextResponse("Not found", { status: 404 });
  return NextResponse.json({ ...s, id: String(s._id) });
}

