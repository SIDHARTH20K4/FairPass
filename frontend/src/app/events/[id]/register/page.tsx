"use client";

import { useEvents } from "@/hooks/useEvents";
import { useState } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";

const SUBMIT_KEY = (id: string) => `fairpass.events.submissions.${id}`;

type Submission = {
  values: Record<string, string>;
  at: number;
  status: "pending" | "approved";
  address?: string;
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature?: string;
};

export default function RegisterForEvent({ params }: { params: { id: string } }) {
  const { id } = params;
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [values, setValues] = useState<Record<string, string>>({ name: "", dob: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [uploading, setUploading] = useState(false);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet to register.");
      return;
    }

    const existing: Submission[] = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
    const already = existing.find((s) => s.address === address.toLowerCase());
    if (already) {
      alert("You have already registered with this wallet.");
      return;
    }

    setUploading(true);
    try {
      const needsApproval = !!event.approvalNeeded;
      const status: Submission["status"] = needsApproval ? "pending" : "approved";
      const payload = {
        eventId: id,
        eventName: event.name,
        address: address.toLowerCase(),
        ...values,
        status,
        ts: Date.now(),
      };

      const message = JSON.stringify(payload);
      const signature = await signMessageAsync({ message });

      let qrImageUrl: string | undefined;
      let qrCid: string | undefined;
      let jsonUrl: string | undefined;
      let jsonCid: string | undefined;

      if (!needsApproval) {
        const qrData = encodeURIComponent(JSON.stringify({ ...payload, signature }));
        const qrUrlData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
        const qrUpload = await uploadImageToIPFS(qrUrlData);
        qrImageUrl = qrUpload.url;
        qrCid = qrUpload.cid;

        const jsonUpload = await uploadJsonToIPFS({ ...payload, signature });
        jsonUrl = jsonUpload.url;
        jsonCid = jsonUpload.cid;
      }

      const entry: Submission = {
        values,
        at: Date.now(),
        status,
        address: address.toLowerCase(),
        qrCid,
        qrUrl: qrImageUrl,
        jsonCid,
        jsonUrl,
        signature,
      };

      existing.push(entry);
      localStorage.setItem(SUBMIT_KEY(id), JSON.stringify(existing));
      setSubmitted(entry);
    } catch (err: any) {
      alert(err?.message || "Registration failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Register for {event.name}</h1>

      {submitted ? (
        <div className="rounded-md border border-black/10 dark:border-white/10 p-4 space-y-2">
          <p className="text-sm">Registration received.</p>
          {submitted.status === "pending" ? (
            <p className="text-sm text-yellow-500">Approval pending. You'll receive your QR once approved.</p>
          ) : (
            <p className="text-sm text-green-500">You're approved!</p>
          )}
          {submitted.status === "approved" && submitted.qrUrl && (
            <div className="space-y-1">
              <p className="text-sm">Your QR (stored on IPFS):</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={submitted.qrUrl} alt="QR" className="w-36 h-36" />
              <a className="text-sm underline" href={submitted.qrUrl} target="_blank" rel="noreferrer">{submitted.qrUrl}</a>
            </div>
          )}
          {submitted.status === "approved" && submitted.jsonUrl && (
            <div className="space-y-1">
              <p className="text-sm">Registration JSON (IPFS):</p>
              <a className="text-sm underline" href={submitted.jsonUrl} target="_blank" rel="noreferrer">{submitted.jsonUrl}</a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="name">Full name</label>
            <input id="name" type="text" required value={values.name} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="dob">Date of birth</label>
            <input id="dob" type="date" required value={values.dob} onChange={(e) => setValues((v) => ({ ...v, dob: e.target.value }))} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="email">Email</label>
            <input id="email" type="email" required value={values.email} onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium" htmlFor="phone">Phone number</label>
            <input id="phone" type="tel" required value={values.phone} onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none" />
          </div>
          <button disabled={uploading} type="submit" className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">{uploading ? "Submitting..." : "Submit"}</button>
        </form>
      )}
    </main>
  );
}
