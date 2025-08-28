"use client";

import RegisterButton from "@/components/RegisterButton";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/hooks/useEvents";
import Markdown from "@/components/Markdown";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";

const SUBMIT_KEY = (id: string) => `fairpass.events.submissions.${id}`;

type Submission = {
  values: Record<string, string>;
  at: number;
  status: "pending" | "approved";
  address?: string;
  qrUrl?: string;
  jsonUrl?: string;
};

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address } = useAccount();
  const [myStatus, setMyStatus] = useState<Submission["status"] | null>(null);
  const [mySub, setMySub] = useState<Submission | null>(null);

  useEffect(() => {
    const subs: Submission[] = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
    const mine = subs.filter((s) => s.address && s.address === address?.toLowerCase());
    const last = mine[mine.length - 1];
    setMyStatus(last?.status || null);
    setMySub(last || null);
  }, [id, address]);

  const isHost = event?.hostAddress && event.hostAddress === address?.toLowerCase();

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/events" className="text-sm hover:underline">
          ← Back to events
        </Link>
        <div className="flex items-center gap-4">
          {event?.approvalNeeded && isHost && (
            <Link href={`/events/${id}/review`} className="text-sm hover:underline">
              Review registrations
            </Link>
          )}
          {isHost && (
            <Link href={`/events/${id}/edit`} className="text-sm hover:underline">
              Edit
            </Link>
          )}
        </div>
      </div>

      {!event ? (
        <p className="text-sm text-black/70 dark:text-white/70">Event not found.</p>
      ) : (
        <article className="flex flex-col gap-6">
          {event.bannerUrl && (
            <div className="relative w-full overflow-hidden rounded-md border border-black/10 dark:border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={event.bannerUrl} alt={`${event.name} banner`} className="w-full h-auto" />
            </div>
          )}

          <header className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
              <p className="text-sm text-black/70 dark:text-white/70 truncate">
                {event.location} • {event.date} {event.time} • {event.isPaid ? "Paid" : "Free"}
                {event.approvalNeeded ? " • Approval required" : ""}
              </p>
              {myStatus && (
                <span className={`mt-2 inline-block text-xs rounded px-2 py-0.5 border ${
                  myStatus === "approved" ? "border-green-400 text-green-400" : "border-yellow-400 text-yellow-400"
                }`}>
                  {myStatus === "approved" ? "Approved" : "Approval pending"}
                </span>
              )}
            </div>
            {/* Right side: either Register button, or QR/pending info if already registered */}
            {myStatus ? (
              myStatus === "approved" && mySub?.qrUrl ? (
                <div className="rounded-md border border-black/10 dark:border-white/10 p-2 text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mySub.qrUrl} alt="Your QR" className="w-24 h-24 mx-auto" />
                  <a href={mySub.qrUrl} target="_blank" rel="noreferrer" className="block text-xs mt-1 underline">View QR</a>
                </div>
              ) : (
                <div className="text-xs text-yellow-500">Pending approval</div>
              )
            ) : (
              <RegisterButton eventId={id} />
            )}
          </header>

          {event.eventDescription && (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">About this event</h2>
              <Markdown content={event.eventDescription} />
            </section>
          )}

          {(event.organization || event.organizationDescription) && (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Host organization</h2>
              {event.organization && (
                <p className="text-sm font-medium">{event.organization}</p>
              )}
              {event.organizationDescription && (
                <p className="text-sm leading-6 text-black/80 dark:text-white/80 whitespace-pre-wrap">
                  {event.organizationDescription}
                </p>
              )}
            </section>
          )}

          {(event.lat && event.lng) && (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Location</h2>
              <div className="rounded-md border border-black/10 dark:border-white/10 overflow-hidden">
                <iframe title="map" width="100%" height="300" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={`https://www.google.com/maps?q=${encodeURIComponent(String(event.lat)+","+String(event.lng))}&output=embed`} />
              </div>
            </section>
          )}
        </article>
      )}
    </main>
  );
}
