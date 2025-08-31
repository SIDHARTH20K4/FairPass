import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { OrganizationModel } from "@/models/Organization";

export async function PATCH(req: Request) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, name, description } = body;

    if (!id) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    const updatedOrg = await OrganizationModel.findByIdAndUpdate(
      id,
      { name, description },
      { new: true, runValidators: true }
    );

    if (!updatedOrg) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...updatedOrg.toObject(),
      id: String(updatedOrg._id)
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}
