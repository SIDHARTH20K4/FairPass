"use client";

import { useEvents } from "@/hooks/useEvents";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useSignMessage } from "wagmi";
import CustomDatePicker from "@/components/DatePicker";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";
import { Identity } from "@semaphore-protocol/identity";
import QRTicket from "@/components/tickets/QRticket";
import React from "react";

// Removed localStorage - using backend database only

type Submission = {
  id?: string; // Backend submission ID
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

export default function RegisterForEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();

  const [values, setValues] = useState<Record<string, string>>({ name: "", dob: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(true);

  // Load existing registration from backend on mount
  useEffect(() => {
    async function loadExistingRegistration() {
      if (!address) {
        setLoadingRegistration(false);
        return;
      }

      try {
        const response = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
        if (response.ok) {
          const data = await response.json();
          const existingSubmission: Submission = {
            id: data.id,
            values: data.values,
            at: new Date(data.createdAt).getTime(),
            status: data.status,
            address: data.address,
            qrCid: data.qrCid,
            qrUrl: data.qrUrl,
            jsonCid: data.jsonCid,
            jsonUrl: data.jsonUrl,
            signature: data.signature,
          };
          setSubmitted(existingSubmission);
        }
      } catch (error) {
        console.log('No existing registration found');
      } finally {
        setLoadingRegistration(false);
      }
    }

    loadExistingRegistration();
  }, [address, id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet to register.");
      return;
    }

    // Check if already registered by calling backend API
    try {
      const checkResponse = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (checkResponse.ok) {
      alert("You have already registered with this wallet.");
      return;
      }
    } catch (error) {
      // If check fails, continue with registration
      console.log('Could not check existing registration, proceeding...');
    }

    setUploading(true);
    try {
      const needsApproval = !!event?.approvalNeeded;
      const status: Submission["status"] = needsApproval ? "pending" : "approved";
      const payload = {
        eventId: id,
        eventName: event?.name,
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

      // Create or reuse user Identity for this event
      // Persist minimal identity trapdoor/nonce in localStorage per event
      const IDENTITY_KEY = `fairpass.identity.${id}`;
      let identityJson = localStorage.getItem(IDENTITY_KEY);
      let identity: Identity;
      if (identityJson) {
        identity = new Identity(identityJson);
      } else {
        identity = new Identity();
        localStorage.setItem(IDENTITY_KEY, identity.toString());
      }
      const commitment = identity.commitment.toString();

      // Send registration to backend with commitment included
      const backendResponse = await fetch(`http://localhost:4000/api/events/${id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.toLowerCase(), values, signature, commitment }),
      });
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('Backend registration error:', backendResponse.status, errorText);
        throw new Error(`Failed to register with backend: ${backendResponse.status} - ${errorText}`);
      }
      
      const backendData = await backendResponse.json();
      console.log('Backend registration successful:', backendData);

      if (!needsApproval) {
        // For non-approval events, generate QR for { eventId, commitment }
        const qrData = encodeURIComponent(JSON.stringify({ eventId: id, commitment }));
        const qrUrlData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
        const qrUpload = await uploadImageToIPFS(qrUrlData);
        qrImageUrl = qrUpload.url; qrCid = qrUpload.cid;

        const jsonUpload = await uploadJsonToIPFS({ eventId: id, commitment });
        jsonUrl = jsonUpload.url; jsonCid = jsonUpload.cid;
      }

      // Use the data returned from backend instead of creating local entry
      const entry: Submission = {
        id: backendData.id,
        values: backendData.values,
        at: new Date(backendData.createdAt).getTime(),
        status: backendData.status,
        address: backendData.address,
        qrCid: backendData.qrCid,
        qrUrl: backendData.qrUrl,
        jsonCid: backendData.jsonCid,
        jsonUrl: backendData.jsonUrl,
        signature: backendData.signature,
      };

      setSubmitted(entry);
    } catch (err: any) {
      alert(err?.message || "Registration failed");
    } finally {
      setUploading(false);
    }
  }

  // Function to check approval status from backend
  const checkApprovalStatus = useCallback(async () => {
    if (!address || !submitted) return;
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'approved' && data.qrUrl) {
          // Update local submission with backend data
          const updatedSubmission = {
            ...submitted,
            status: 'approved' as const,
            qrUrl: data.qrUrl,
            qrCid: data.qrCid,
            jsonUrl: data.jsonUrl,
            jsonCid: data.jsonCid
          };
          setSubmitted(updatedSubmission);
        }
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [address, submitted, id]);

  // Check approval status periodically for pending registrations
  useEffect(() => {
    if (submitted?.status === 'pending' && address) {
      const interval = setInterval(checkApprovalStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [submitted?.status, address, checkApprovalStatus]);

  // Early return after all hooks are called
  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  if (loadingRegistration) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6">
          <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
        </div>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading registration status...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Register for {event.name}</h1>

      {submitted ? (
        <div className="space-y-6">
          {/* Status Information */}
          <div className="card p-4 text-center">
            <div className="space-y-2">
              <p className="text-sm text-foreground/70">Registration Status</p>
              {submitted.status === "pending" ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-yellow-600">⏳ Approval Pending</p>
                  <p className="text-sm text-foreground/70">
                    Your registration has been submitted and is waiting for host approval.
                  </p>
                  {checkingStatus ? (
                    <p className="text-xs text-foreground/60">Checking approval status...</p>
                  ) : (
                    <button 
                      onClick={checkApprovalStatus}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Check Status
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-green-600">✅ Approved!</p>
                  <p className="text-sm text-foreground/70">
                    Your registration has been approved. You can now attend the event!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* QR Ticket Display for Approved Users */}
          {submitted.status === "approved" && submitted.qrUrl && (
            <QRTicket
              qrUrl={submitted.qrUrl}
              eventName={event.name}
              participantName={submitted.values.name || 'Anonymous'}
              participantAddress={submitted.address || ''}
              approvalDate={new Date().toISOString()}
            />
          )}

          {/* Registration Details */}
          <div className="card p-4">
            <h3 className="text-sm font-medium mb-3">Registration Details</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(submitted.values).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-foreground/70 capitalize">{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-foreground/70">Wallet Address:</span>
                <span className="font-mono text-xs">{submitted.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Submitted:</span>
                <span>{new Date(submitted.at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="card p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="name">Full name</label>
            <input 
              id="name" 
              type="text" 
              required 
              value={values.name} 
              onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} 
              className="input" 
              placeholder="Enter your full name"
            />
          </div>
          <div className="space-y-2">
            <SimpleDatePicker 
              value={values.dob} 
              onChange={(dob) => setValues((v) => ({ ...v, dob }))} 
              label="Date of birth" 
              required 
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="email">Email</label>
            <input 
              id="email" 
              type="email" 
              required 
              value={values.email} 
              onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} 
              className="input" 
              placeholder="Enter your email address"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground" htmlFor="phone">Phone number</label>
            <input 
              id="phone" 
              type="tel" 
              required 
              value={values.phone} 
              onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} 
              className="input" 
              placeholder="Enter your phone number"
            />
          </div>
          <button 
            disabled={uploading} 
            type="submit" 
            className="btn-primary w-full"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-2"></div>
                Submitting...
              </>
            ) : (
              "Submit Registration"
            )}
          </button>
        </form>
      )}
    </main>
  );
}
