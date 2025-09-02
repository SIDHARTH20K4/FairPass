"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { Identity } from "@semaphore-protocol/identity";
import { ZKProofService } from "@/Services/ZKProofService";
import Link from "next/link";
import React from "react";

export default function CheckInPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { address, isConnected } = useAccount();
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInResult, setCheckInResult] = useState<{
    success: boolean;
    message: string;
    nullifierHash?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isConnected && address) {
      loadIdentity();
    } else {
      setLoading(false);
    }
  }, [isConnected, address]);

  const loadIdentity = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, you would:
      // 1. Fetch the encrypted identity from the backend
      // 2. Decrypt it using the user's wallet signature
      // 3. Reconstruct the Semaphore identity
      
      // For demo purposes, we'll generate a new identity
      // This should be replaced with proper identity retrieval
      const newIdentity = new Identity();
      setIdentity(newIdentity);
      
      console.log('Generated identity for check-in:', newIdentity.commitment.toString());
    } catch (error) {
      console.error('Failed to load identity:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    if (!identity) {
      alert('No identity available for check-in');
      return;
    }

    setCheckingIn(true);
    setCheckInResult(null);

    try {
      const result = await ZKProofService.performCheckIn(id, identity);
      setCheckInResult(result);
    } catch (error) {
      console.error('Check-in failed:', error);
      setCheckInResult({
        success: false,
        message: error instanceof Error ? error.message : 'Check-in failed'
      });
    } finally {
      setCheckingIn(false);
    }
  };

  if (!isConnected) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Check In Required</h1>
          <p className="text-foreground/70 mb-6">
            Please connect your wallet to check in to this event.
          </p>
          <Link href="/" className="btn-primary">
            Connect Wallet
          </Link>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card p-8 text-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/70">Loading your identity...</p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-12">
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-semibold mb-4">Identity Not Found</h1>
          <p className="text-foreground/70 mb-6">
            No Semaphore identity found for this event. Please register first.
          </p>
          <Link href={`/events/${id}/register`} className="btn-primary">
            Register for Event
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8">
        <Link href={`/events/${id}`} className="text-sm hover:underline mb-2 block">
          ← Back to Event
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">Event Check-In</h1>
        <p className="text-foreground/60">Use your Semaphore identity to check in anonymously</p>
      </div>

      <div className="card p-6 space-y-6">
        {/* Identity Info */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Your Identity</h2>
          <div className="bg-foreground/5 p-4 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Commitment:</span>
              <span className="font-mono text-xs">
                {identity.commitment.toString().slice(0, 8)}...{identity.commitment.toString().slice(-8)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Wallet:</span>
              <span className="font-mono text-xs">
                {address?.slice(0, 6)}...{address?.slice(-4)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/60">Event ID:</span>
              <span className="font-mono text-xs">{id}</span>
            </div>
          </div>
        </div>

        {/* Check-In Result */}
        {checkInResult && (
          <div className={`p-4 rounded-lg border-2 ${
            checkInResult.success 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center gap-3">
              {checkInResult.success ? (
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <div>
                <div className="font-semibold">{checkInResult.message}</div>
                {checkInResult.nullifierHash && (
                  <div className="text-sm opacity-80 mt-1">
                    Nullifier: {checkInResult.nullifierHash.slice(0, 8)}...{checkInResult.nullifierHash.slice(-8)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Check-In Button */}
        <div className="space-y-4">
          <button
            onClick={handleCheckIn}
            disabled={checkingIn}
            className="btn-primary w-full"
          >
            {checkingIn ? (
              <>
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                Checking In...
              </>
            ) : (
              'Check In Anonymously'
            )}
          </button>
          
          <p className="text-xs text-foreground/60 text-center">
            Your check-in will be verified using zero-knowledge proofs, ensuring your privacy while confirming your eligibility.
          </p>
        </div>
      </div>

      {/* How It Works */}
      <div className="mt-8 card p-6">
        <h3 className="font-semibold text-foreground mb-3">How ZK Check-In Works</h3>
        <div className="space-y-3 text-sm text-foreground/70">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">1</span>
            </div>
            <div>
              <div className="font-medium">Generate Proof</div>
              <div>Your Semaphore identity creates a zero-knowledge proof that you're an approved member</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">2</span>
            </div>
            <div>
              <div className="font-medium">Verify Anonymously</div>
              <div>The proof is verified without revealing your identity or personal information</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">3</span>
            </div>
            <div>
              <div className="font-medium">Prevent Double Check-In</div>
              <div>A unique nullifier prevents you from checking in multiple times</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
