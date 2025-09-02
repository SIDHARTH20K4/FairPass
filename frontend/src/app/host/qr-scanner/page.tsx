"use client";

import { useState } from "react";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";

type QRData = {
  eventId: string;
  eventName: string;
  participantAddress: string;
  participantName: string;
  approvalDate: string;
  type: string;
};

type ValidationResult = {
  isValid: boolean;
  message: string;
  data?: QRData;
  error?: string;
};

export default function QRScannerPage() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);

  const handleQRScan = async (qrDataString: string) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      // Parse the QR code data
      const qrData: QRData = JSON.parse(qrDataString);
      
      // Validate the QR code structure
      if (!qrData.eventId || !qrData.participantAddress || !qrData.type) {
        setValidationResult({
          isValid: false,
          message: "Invalid QR code format",
          error: "Missing required fields"
        });
        return;
      }

      // Check if it's an event ticket
      if (qrData.type !== 'event-ticket') {
        setValidationResult({
          isValid: false,
          message: "Not a valid event ticket",
          error: "QR code is not an event ticket"
        });
        return;
      }

      // Check if the approval date is valid
      const approvalDate = new Date(qrData.approvalDate);
      const now = new Date();
      
      if (isNaN(approvalDate.getTime())) {
        setValidationResult({
          isValid: false,
          message: "Invalid approval date",
          error: "QR code has invalid date format"
        });
        return;
      }

      // For demo purposes, we'll consider all valid QR codes as valid
      // In a real implementation, you might want to:
      // - Check against a database of approved tickets
      // - Verify the signature
      // - Check if the ticket has been used before
      // - Validate against the event details

      setValidationResult({
        isValid: true,
        message: "Valid event ticket",
        data: qrData
      });

    } catch (error) {
      setValidationResult({
        isValid: false,
        message: "Failed to parse QR code",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleError = (error: string) => {
    setValidationResult({
      isValid: false,
      message: "Camera error",
      error: error
    });
  };

  const resetValidation = () => {
    setValidationResult(null);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <Link href="/host/dashboard" className="text-sm hover:underline mb-2 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Scanner</h1>
          <p className="text-foreground/60">Scan event tickets to validate attendance</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Section */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Scan QR Code</h2>
          <QRScanner 
            onScan={handleQRScan}
            onError={handleError}
            className="w-full"
          />
        </div>

        {/* Validation Results Section */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Validation Results</h2>
          
          {isValidating && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-foreground/60">Validating ticket...</p>
            </div>
          )}

          {!isValidating && !validationResult && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-foreground/60">Scan a QR code to validate</p>
            </div>
          )}

          {validationResult && (
            <div className="space-y-4">
              {/* Validation Status */}
              <div className={`p-4 rounded-lg border-2 ${
                validationResult.isValid 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center gap-3">
                  {validationResult.isValid ? (
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  <div>
                    <div className="font-semibold">{validationResult.message}</div>
                    {validationResult.error && (
                      <div className="text-sm opacity-80 mt-1">{validationResult.error}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Ticket Details */}
              {validationResult.isValid && validationResult.data && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Ticket Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Event:</span>
                      <span className="font-medium">{validationResult.data.eventName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Participant:</span>
                      <span className="font-medium">{validationResult.data.participantName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Wallet:</span>
                      <span className="font-mono text-xs">
                        {validationResult.data.participantAddress.slice(0, 6)}...{validationResult.data.participantAddress.slice(-4)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Approved:</span>
                      <span className="font-medium">
                        {new Date(validationResult.data.approvalDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Event ID:</span>
                      <span className="font-mono text-xs">{validationResult.data.eventId}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={resetValidation}
                  className="btn-primary flex-1"
                >
                  Scan Another
                </button>
                {validationResult.isValid && (
                  <button
                    onClick={() => {
                      // In a real app, you might want to mark this ticket as used
                      alert('Ticket validated successfully!');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Mark as Used
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 card p-6">
        <h3 className="font-semibold text-foreground mb-3">How to Use</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-foreground/70">
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">1</span>
            </div>
            <div>
              <div className="font-medium">Start Scanning</div>
              <div>Click "Start Scanning" and allow camera access</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">2</span>
            </div>
            <div>
              <div className="font-medium">Point at QR Code</div>
              <div>Position the QR code within the scanning area</div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
              <span className="text-xs font-semibold text-primary">3</span>
            </div>
            <div>
              <div className="font-medium">View Results</div>
              <div>Check validation results and ticket details</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
