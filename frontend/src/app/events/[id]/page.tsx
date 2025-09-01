"use client";

import RegisterButton from "@/components/RegisterButton";
import Link from "next/link";
import Image from "next/image";
import { useEvents } from "@/hooks/useEvents";
import Markdown from "@/components/Markdown";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import { useAccount } from "wagmi";
import QRTicket from "@/components/tickets/QRticket";
import Toast from "@/components/Toast";

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
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Function to check registration status from backend
  const checkRegistrationStatus = useCallback(async () => {
    if (!address || !mySub) return;
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/registrations/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        
        // Update local state with backend data
        const updatedSubmission = {
          ...mySub,
          status: data.status,
          qrUrl: data.qrUrl,
          qrCid: data.qrCid,
          jsonUrl: data.jsonUrl,
          jsonCid: data.jsonCid
        };
        
        // Check if status changed
        const statusChanged = myStatus !== data.status;
        
        setMySub(updatedSubmission);
        setMyStatus(data.status);
        
        // Update localStorage
        const subs: Submission[] = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
        const updated = subs.map(s => s.address === address.toLowerCase() ? updatedSubmission : s);
        localStorage.setItem(SUBMIT_KEY(id), JSON.stringify(updated));
        
        setLastChecked(new Date());
        
        // Show notification if status changed
        if (statusChanged) {
          if (data.status === 'approved') {
            setToast({ 
              message: '🎉 Your registration has been approved! You can now attend the event.', 
              type: 'success' 
            });
          } else if (data.status === 'rejected') {
            setToast({ 
              message: '❌ Your registration has been rejected. Please contact the event host for more information.', 
              type: 'error' 
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check registration status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [address, id, mySub]);

  // Check status from localStorage on mount
  useEffect(() => {
    const subs: Submission[] = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
    const mine = subs.filter((s) => s.address && s.address === address?.toLowerCase());
    const last = mine[mine.length - 1];
    setMyStatus(last?.status || null);
    setMySub(last || null);
  }, [id, address]);

  // Auto-check status every 15 seconds for pending registrations
  useEffect(() => {
    if (myStatus === 'pending' && address) {
      const interval = setInterval(checkRegistrationStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [myStatus, address, checkRegistrationStatus]);

  // Check status when component mounts if user has a pending registration
  useEffect(() => {
    if (myStatus === 'pending' && address) {
      checkRegistrationStatus();
    }
  }, [myStatus, address, checkRegistrationStatus]);

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
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Registration Status</h3>
                {myStatus && (
                  <div className="flex items-center gap-2">
                    {checkingStatus ? (
                      <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                    ) : (
                      <button 
                        onClick={checkRegistrationStatus}
                        className="text-xs text-primary hover:underline"
                        title="Check for status updates"
                      >
                        Refresh
                      </button>
                    )}
                    {lastChecked && (
                      <span className="text-xs text-foreground/50">
                        {lastChecked.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {myStatus ? (
                <div className="space-y-4">
                  {myStatus === "approved" && mySub?.qrUrl ? (
                    <div className="space-y-4">
                      {/* Status Badge */}
                      <div className="text-center">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          ✅ Approved
                        </span>
                      </div>
                      
                      {/* QR Ticket */}
                      <QRTicket
                        qrUrl={mySub.qrUrl}
                        eventName={event.name}
                        participantName={mySub.values.name || 'Anonymous'}
                        participantAddress={mySub.address || ''}
                        approvalDate={new Date().toISOString()}
                        qrCid={mySub.qrCid}
                        jsonCid={mySub.jsonCid}
                      />
                      
                      {/* Last Updated Info */}
                      {lastChecked && (
                        <div className="text-center text-xs text-foreground/60">
                          Last updated: {lastChecked.toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  ) : myStatus === "pending" ? (
                    <div className="text-center py-8 space-y-4">
                      <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto">
                        <svg className="w-8 h-8 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="space-y-2">
                        <p className="text-foreground font-medium">⏳ Approval Pending</p>
                        <p className="text-sm text-foreground/70">
                          Your registration has been submitted and is waiting for host approval.
                        </p>
                        <p className="text-xs text-foreground/60">
                          We'll automatically check for updates every 15 seconds.
                        </p>
                      </div>
                      
                      {/* Registration Details */}
                      {mySub && (
                        <div className="text-left bg-foreground/5 rounded-lg p-4 space-y-2">
                          <p className="text-sm font-medium text-foreground">Registration Details:</p>
                          {Object.entries(mySub.values).map(([key, value]) => (
                            <div key={key} className="flex justify-between text-xs">
                              <span className="text-foreground/70 capitalize">{key}:</span>
                              <span className="font-medium">{value}</span>
                            </div>
                          ))}
                          <div className="flex justify-between text-xs">
                            <span className="text-foreground/70">Submitted:</span>
                            <span>{new Date(mySub.at).toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-16 h-16 bg-foreground/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <p className="text-foreground/70">Registration status unknown</p>
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
