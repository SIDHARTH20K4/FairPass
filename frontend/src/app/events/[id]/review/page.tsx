"use client";

import Link from "next/link";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";

const SUBMIT_KEY = (id: string) => `fairpass.events.submissions.${id}`;

type Submission = {
  values: Record<string, string>;
  at: number;
  status: "pending" | "approved" | "rejected";
  address?: string;
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature?: string;
};

export default function ReviewSubmissionsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address } = useAccount();
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    const existing: Submission[] = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
    setSubs(existing);
  }, [id]);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  const isHost = event.hostAddress && event.hostAddress === address?.toLowerCase();
  if (!isHost) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6"><Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link></div>
        <p className="text-sm">Not authorized. Connect as the host wallet to review registrations.</p>
      </main>
    );
  }

  async function approve(index: number) {
    const s = subs[index];
    if (!s) return;

    let qrUrl = s.qrUrl;
    let qrCid = s.qrCid;
    let jsonUrl = s.jsonUrl;
    let jsonCid = s.jsonCid;

    if (!qrUrl || !jsonUrl) {
      const payload = {
        eventId: id,
        eventName: event.name,
        address: s.address,
        ...s.values,
        status: "approved" as const,
        ts: s.at,
        signature: s.signature,
      };
      const qrData = encodeURIComponent(JSON.stringify(payload));
      const qrUpload = await uploadImageToIPFS(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`);
      qrUrl = qrUpload.url; qrCid = qrUpload.cid;
      const jsonUpload = await uploadJsonToIPFS(payload);
      jsonUrl = jsonUpload.url; jsonCid = jsonUpload.cid;
    }

    const next = subs.map((item, i) => i === index ? { ...item, status: "approved", qrUrl, qrCid, jsonUrl, jsonCid } : item);
    setSubs(next);
    localStorage.setItem(SUBMIT_KEY(id), JSON.stringify(next));
  }

  function reject(index: number) {
    const next = subs.map((item, i) => i === index ? { ...item, status: "rejected" } : item);
    setSubs(next);
    localStorage.setItem(SUBMIT_KEY(id), JSON.stringify(next));
  }

  function statusClasses(status: Submission["status"]) {
    if (status === "approved") return "border-green-400 text-green-400";
    if (status === "rejected") return "border-red-400 text-red-400";
    return "border-yellow-400 text-yellow-400";
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Review registrations</h1>
      </div>

      {subs.length === 0 ? (
        <p className="text-sm text-black/70 dark:text-white/70">No registrations yet.</p>
      ) : (
        <ul className="space-y-3">
          {subs.map((s, idx) => (
            <li key={idx} className="rounded-md border border-black/10 dark:border-white/10 p-3 flex items-center justify-between gap-4">
              <div className="text-sm">
                {Object.entries(s.values).map(([k, v]) => (
                  <div key={k}><span className="font-medium">{k}:</span> {v}</div>
                ))}
                <div className="text-xs text-black/60 dark:text-white/60 mt-1">{new Date(s.at).toLocaleString()}</div>
                <div className="text-xs text-black/60 dark:text-white/60">{s.address}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs rounded px-2 py-0.5 border ${statusClasses(s.status)}`}>{s.status}</span>
                {s.status !== "approved" && (
                  <button onClick={() => approve(idx)} className="text-sm rounded-md border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5">Approve</button>
                )}
                {s.status !== "rejected" && (
                  <button onClick={() => reject(idx)} className="text-sm rounded-md border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5">Reject</button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
