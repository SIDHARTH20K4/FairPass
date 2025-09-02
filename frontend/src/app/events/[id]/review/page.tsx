"use client";

import Link from "next/link";
import { useEvents } from "@/hooks/useEvents";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";
import { apiUpdateEvent } from "@/lib/api";
import React from "react";

const SUBMIT_KEY = (id: string) => `fairpass.events.submissions.${id}`;

type Submission = {
  id?: string; // Backend submission ID
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

export default function ReviewSubmissionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { events, loading } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address, isConnected: isWalletConnected } = useAccount();
  const [subs, setSubs] = useState<Submission[]>([]);

  useEffect(() => {
    async function load() {
      try {
        // Use backend API to get registrations
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${id}/registrations`);
        
        if (!res.ok) {
          throw new Error(`Failed to fetch registrations: ${res.status}`);
        }
        
        const data = await res.json();
        
        // Map backend data to local type
        const mapped: Submission[] = (data || []).map((s: any) => ({
          id: s.id, // Include the backend ID
          values: s.values || {},
          at: new Date(s.createdAt || Date.now()).getTime(),
          status: s.status || "pending",
          address: s.address,
          qrCid: s.qrCid,
          qrUrl: s.qrUrl,
          jsonCid: s.jsonCid,
          jsonUrl: s.jsonUrl,
          signature: s.signature,
        }));
        
        setSubs(mapped);
      } catch (e) {
        console.error('Failed to load registrations from backend:', e);
        // If backend fails, show empty state
        setSubs([]);
      }
    }
    load();
  }, [id]);





  if (!event) {
    if (loading) {
      return (
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-foreground/60">Loading event...</p>
          </div>
        </main>
      );
    }
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  // Check wallet connection first
  if (!isWalletConnected) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6"><Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link></div>
        <div className="space-y-4">
          <p className="text-sm">Wallet not connected. Please connect your wallet to review registrations.</p>
          <p className="text-sm text-foreground/70">Make sure you're connected with the same wallet that created this event.</p>
        </div>
      </main>
    );
  }



  const isHost = event.hostAddress && event.hostAddress === address?.toLowerCase();
  if (!isHost) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6"><Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link></div>
        <div className="space-y-4">
        <p className="text-sm">Not authorized. Connect as the host wallet to review registrations.</p>
          
          
        </div>
      </main>
    );
  }

  async function approve(index: number) {
    const s = subs[index];
    if (!s) return;

    try {
      // Generate QR code with event and participant information
      const qrPayload = {
        eventId: id,
        eventName: event.name,
        participantAddress: s.address,
        participantName: s.values.name || s.values.Name || 'Anonymous',
        approvalDate: new Date().toISOString(),
        type: 'event-ticket'
      };
      
      // Create QR code image
      const qrData = encodeURIComponent(JSON.stringify(qrPayload));
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&format=png&margin=10`;
      
      // Upload QR code to IPFS
      const qrUpload = await uploadImageToIPFS(qrImageUrl);
      
      // Upload QR payload JSON to IPFS
      const jsonUpload = await uploadJsonToIPFS(qrPayload);
      
      // Check if submission has backend ID
      if (!s.id) {
        throw new Error('This registration is missing its backend identifier. Please ensure the participant has completed their registration through the proper channels.');
      }

      // Update submission status in backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${id}/registrations/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          qrCid: qrUpload.cid,
          qrUrl: qrUpload.url,
          jsonCid: jsonUpload.cid,
          jsonUrl: jsonUpload.url
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend response error:', response.status, errorText);
        throw new Error(`Failed to update registration status: ${response.status} - ${errorText}`);
      }
      
      // Update local state
      const next = subs.map((item, i) => i === index ? { 
        ...item, 
        status: "approved", 
        qrUrl: qrUpload.url, 
        qrCid: qrUpload.cid, 
        jsonUrl: jsonUpload.url, 
        jsonCid: jsonUpload.cid 
      } : item);
    setSubs(next);
      
    } catch (error) {
      console.error('Failed to approve registration:', error);
      alert('Failed to approve registration. Please try again.');
    }
  }

  async function reject(index: number) {
    const s = subs[index];
    if (!s) return;

    try {
      // Check if submission has backend ID
      if (!s.id) {
        throw new Error('This registration is missing its backend identifier. Please ensure the participant has completed their registration through the proper channels.');
      }
      
      // Update submission status in backend
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/events/${id}/registrations/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Backend response error:', response.status, errorText);
        throw new Error(`Failed to update registration status: ${response.status} - ${errorText}`);
      }
      
      // Update local state
    const next = subs.map((item, i) => i === index ? { ...item, status: "rejected" } : item);
    setSubs(next);
      
    } catch (error) {
      console.error('Failed to reject registration:', error);
      alert('Failed to reject registration. Please try again.');
    }
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
        <div className="text-center py-8">
          <p className="text-sm text-black/70 dark:text-white/70 mb-2">No registrations yet.</p>
          <p className="text-xs text-black/50 dark:text-white/50">Registrations will appear here once participants sign up for your event.</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {subs.map((s, idx) => (
            <li key={idx} className="card p-4 space-y-3">
              {/* Participant Information */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="text-sm space-y-1">
                {Object.entries(s.values).map(([k, v]) => (
                  <div key={k}><span className="font-medium">{k}:</span> {v}</div>
                ))}
                  </div>
                                  <div className="text-xs text-foreground/60 space-y-1">
                  <div>Registered: {new Date(s.at).toLocaleString()}</div>
                  <div>Wallet: {s.address}</div>
                </div>
              </div>
                
                {/* Status and Actions */}
              <div className="flex items-center gap-2">
                  <span className={`text-xs rounded px-2 py-1 border ${statusClasses(s.status)}`}>
                    {s.status}
                  </span>
                {s.status !== "approved" && (
                    <button 
                      onClick={() => approve(idx)} 
                      className="btn-primary text-xs px-3 py-1"
                    >
                      Approve
                    </button>
                )}
                {s.status !== "rejected" && (
                    <button 
                      onClick={() => reject(idx)} 
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Reject
                    </button>
                )}
              </div>
              </div>
              
              {/* QR Code Display for Approved Participants */}
              {s.status === "approved" && s.qrUrl && (
                <div className="border-t border-foreground/10 pt-3">
                  <div className="flex items-center gap-3">
                    <div className="text-sm font-medium text-foreground">Event Ticket QR Code:</div>
                    <a 
                      href={s.qrUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline"
                    >
                      View Full Size
                    </a>
                  </div>
                  <div className="mt-2 flex items-center gap-4">
                    <img 
                      src={s.qrUrl} 
                      alt="Event Ticket QR Code" 
                      className="w-24 h-24 border border-foreground/20 rounded-lg"
                    />
                    <div className="text-xs text-foreground/70 space-y-1">
                      <div><strong>Event:</strong> {event.name}</div>
                      <div><strong>Participant:</strong> {s.values.name || s.values.Name || 'Anonymous'}</div>
                      <div><strong>Status:</strong> Approved</div>
                      <div><strong>QR CID:</strong> {s.qrCid}</div>
                    </div>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
