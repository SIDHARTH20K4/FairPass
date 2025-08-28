import mongoose from "mongoose";

let isConnected = 0 as 0 | 1;

export async function connectDB() {
  if (isConnected) return;
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");
  await mongoose.connect(uri);
  isConnected = 1;
}

