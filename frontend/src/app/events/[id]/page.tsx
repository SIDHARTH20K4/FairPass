"use client";

import RegisterButton from "@/components/RegisterButton";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/hooks/useEvents";
import Markdown from "@/components/Markdown";
import { useEffect, useState } from "react";
import React from "react";
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

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
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

  if (!event) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center card p-12 max-w-md mx-auto">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Event Not Found</h2>
          <p className="text-foreground/60 mb-6">The event you're looking for doesn't exist or has been removed.</p>
          <Link href="/events" className="btn-primary">
            Browse All Events
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      {/* Hero Banner Section */}
      {event.bannerUrl && (
        <section className="relative h-96 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
          <img 
            src={event.bannerUrl} 
            alt={`${event.name} banner`} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
            <div className="mx-auto max-w-6xl">
              <Link 
                href="/events" 
                className="inline-flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors mb-4 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Events
              </Link>
              
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 drop-shadow-lg">
                {event.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-foreground/90">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{event.time}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="card p-8 fade-in">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium glass border ${
                      event.isPaid ? 'border-foreground/20 text-foreground' : 'border-foreground/10 text-foreground/70'
                    }`}>
                      {event.isPaid ? `$${event.price || 0} ${event.currency || 'USD'}` : 'Free Event'}
                    </span>
                    {event.approvalNeeded && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium glass border border-foreground/10 text-foreground/70">
                        Approval Required
                      </span>
                    )}
                  </div>
                  
                  {myStatus && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium glass border ${
                        myStatus === "approved" 
                          ? 'border-success/20 text-success' 
                          : 'border-warning/20 text-warning'
                      }`}>
                        {myStatus === "approved" ? "✓ Approved" : "⏳ Pending Approval"}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Host Actions */}
                {isHost && (
                  <div className="flex items-center gap-3">
                    {event.approvalNeeded && (
                      <Link 
                        href={`/events/${id}/review`} 
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        Review Registrations
                      </Link>
                    )}
                    <Link 
                      href={`/events/${id}/edit`} 
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Edit Event
                    </Link>
                  </div>
                )}
              </div>

              {/* Event Description */}
              {event.eventDescription && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">About This Event</h2>
                  <div className="prose prose-foreground max-w-none">
                    <Markdown content={event.eventDescription} />
                  </div>
                </div>
              )}

              {/* Organization Info */}
              {(event.organization || event.organizationDescription) && (
                <div className="space-y-4 pt-6 border-t border-foreground/10">
                  <h2 className="text-2xl font-semibold text-foreground">Host Organization</h2>
                  {event.organization && (
                    <h3 className="text-lg font-medium text-foreground">{event.organization}</h3>
                  )}
                  {event.organizationDescription && (
                    <p className="text-foreground/70 leading-relaxed whitespace-pre-wrap">
                      {event.organizationDescription}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Location Map */}
            {(event.lat && event.lng) && (
              <div className="card p-8 fade-in">
                <h2 className="text-2xl font-semibold text-foreground mb-6">Location</h2>
                <div className="rounded-xl overflow-hidden border border-foreground/10">
                  <iframe 
                    title="Event location map" 
                    width="100%" 
                    height="400" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade" 
                    src={`https://www.google.com/maps?q=${encodeURIComponent(String(event.lat)+","+String(event.lng))}&output=embed`} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Registration & QR */}
          <div className="space-y-6">
            {/* Registration Status */}
            <div className="card p-6 fade-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Registration Status</h3>
              
              {myStatus ? (
                <div className="space-y-4">
                  {myStatus === "approved" && mySub?.qrUrl ? (
                    <div className="text-center space-y-3">
                      <div className="glass rounded-xl p-4">
                        <img 
                          src={mySub.qrUrl} 
                          alt="Your QR Code" 
                          className="w-32 h-32 mx-auto rounded-lg"
                        />
                      </div>
                      <p className="text-sm text-foreground/70">Your ticket QR code</p>
                      <a 
                        href={mySub.qrUrl} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="btn-secondary text-sm w-full"
                      >
                        Download QR Code
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-foreground/70">Your registration is pending approval</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-foreground/70 text-center">Ready to join this event?</p>
                  <RegisterButton eventId={id} />
                </div>
              )}
            </div>

            {/* Event Quick Info */}
            <div className="card p-6 fade-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Date</span>
                  <span className="font-medium">{event.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Time</span>
                  <span className="font-medium">{event.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Location</span>
                  <span className="font-medium">{event.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Price</span>
                  <span className="font-medium">
                    {event.isPaid ? `$${event.price || 0} ${event.currency || 'USD'}` : 'Free'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Approval</span>
                  <span className="font-medium">
                    {event.approvalNeeded ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
