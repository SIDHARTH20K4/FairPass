"use client";

import RegisterButton from "@/components/RegisterButton";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/hooks/useEvents";
import Markdown from "@/components/Markdown";

export default function EventDetailPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-6">
        <Link href="/events" className="text-sm hover:underline">
          ← Back to events
        </Link>
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
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
              <p className="text-sm text-black/70 dark:text-white/70">
                {event.location} • {event.date} {event.time} • {event.isPaid ? "Paid" : "Free"}
                {event.approvalNeeded ? " • Approval required" : ""}
              </p>
            </div>
            <RegisterButton eventId={id} />
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
