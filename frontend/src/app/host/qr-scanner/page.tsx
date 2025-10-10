"use client";

import { useState } from "react";
import Link from "next/link";
import QRScanner from "@/components/QRScanner";
import { ZKProofService } from "@/Services/ZKProofService";
import MobileSidebar from "@/components/MobileSidebar";

type QRData = {
  eventId: string;
  commitment: string;
  type: string;
};

type LegacyQRData = {
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
  participantName?: string;
  eventName?: string;
  checkedInAt?: string;
  nullifierHash?: string;
};

export default function QRScannerPage() {
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<{id: string, name: string, contractAddress: string, date: string} | null>(null);
  const [copiedCommitment, setCopiedCommitment] = useState(false);
  const [copiedEventId, setCopiedEventId] = useState(false);

  const handleQRScan = async (result: any) => {
    setIsValidating(true);
    setValidationResult(null);

    try {
      // The QRScanner component already provides parsed data
      const scannedData = result;
      
      // Check if it's a Semaphore-based QR code (new format)
      if (scannedData.commitment && scannedData.eventId) {
        const qrData: QRData = scannedData;
        
        // Validate the QR code structure
        if (!qrData.eventId || !qrData.commitment || !qrData.type) {
          setValidationResult({
            isValid: false,
            message: "Invalid Semaphore QR code format",
            error: "Missing required fields"
          });
          return;
        }

        // Validate commitment format (should be a valid bigint string)
        try {
          BigInt(qrData.commitment);
        } catch {
          setValidationResult({
            isValid: false,
            message: "Invalid commitment format",
            error: "Commitment must be a valid number"
          });
          return;
        }

        // Check if the commitment is in the event group
        try {
          const eventGroup = await ZKProofService.getEventGroup(qrData.eventId);
          const isMember = eventGroup.members.includes(qrData.commitment);
          
          if (!isMember) {
            setValidationResult({
              isValid: false,
              message: "Invalid ticket",
              error: "Commitment not found in approved members"
            });
            return;
          }

          // Get event details for better validation result
          let eventName = "Unknown Event";
          try {
            const eventResponse = await fetch(`
https://fairpass.onrender.com/api
/events/${qrData.eventId}`);
            if (eventResponse.ok) {
              const eventData = await eventResponse.json();
              eventName = eventData.name;
            }
          } catch (error) {
            console.warn('Failed to fetch event details:', error);
          }

          setValidationResult({
            isValid: true,
            message: "Valid Semaphore ticket - Check-in successful!",
            data: qrData,
            participantName: "Anonymous (ZK Protected)",
            eventName: eventName,
            checkedInAt: new Date().toISOString(),
            nullifierHash: `nullifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
          });
        } catch (error) {
          setValidationResult({
            isValid: false,
            message: "Failed to validate ticket",
            error: error instanceof Error ? error.message : "Unknown error"
          });
        }
      } 
      // Check if it's a legacy QR code (old format)
      else if (scannedData.participantAddress && scannedData.eventName) {
        const legacyData: LegacyQRData = scannedData;
        
        // Validate the legacy QR code structure
        if (!legacyData.eventId || !legacyData.participantAddress || !legacyData.type) {
          setValidationResult({
            isValid: false,
            message: "Invalid legacy QR code format",
            error: "Missing required fields"
          });
          return;
        }

        // Check if the approval date is valid
        const approvalDate = new Date(legacyData.approvalDate);
        
        if (isNaN(approvalDate.getTime())) {
          setValidationResult({
            isValid: false,
            message: "Invalid approval date",
            error: "QR code has invalid date format"
          });
          return;
        }

        // For legacy tickets, we'll consider them valid if they have the right structure
        setValidationResult({
          isValid: true,
          message: "Valid legacy ticket - Check-in successful!",
          data: {
            eventId: legacyData.eventId,
            commitment: legacyData.participantAddress, // Use address as commitment for legacy
            type: legacyData.type
          },
          participantName: legacyData.participantName || "Unknown Participant",
          eventName: legacyData.eventName || "Unknown Event",
          checkedInAt: new Date().toISOString(),
          nullifierHash: `nullifier_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
      } else {
        setValidationResult({
          isValid: false,
          message: "Unknown QR code format",
          error: "QR code doesn't match expected formats"
        });
      }

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
    setCopiedCommitment(false);
    setCopiedEventId(false);
  };

  const copyCommitment = async () => {
    if (validationResult?.data?.commitment) {
      try {
        await navigator.clipboard.writeText(validationResult.data.commitment);
        setCopiedCommitment(true);
        setTimeout(() => setCopiedCommitment(false), 2000); // Reset after 2 seconds
      } catch (error) {
        console.error('Failed to copy commitment:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = validationResult.data.commitment;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedCommitment(true);
        setTimeout(() => setCopiedCommitment(false), 2000);
      }
    }
  };

  const copyEventId = async () => {
    if (validationResult?.data?.eventId) {
      try {
        await navigator.clipboard.writeText(validationResult.data.eventId);
        setCopiedEventId(true);
        setTimeout(() => setCopiedEventId(false), 2000); // Reset after 2 seconds
      } catch (error) {
        console.error('Failed to copy event ID:', error);
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = validationResult.data.eventId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopiedEventId(true);
        setTimeout(() => setCopiedEventId(false), 2000);
      }
    }
  };

  const handleLogout = () => {
    // Add logout functionality here
    window.location.href = '/host/signin';
  };

  const handleRefresh = () => {
    // Add refresh functionality here
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <div className="lg:hidden bg-background border-b border-border px-3 py-2 fixed top-0 left-0 right-0 z-40">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-foreground/10 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <h1 className="text-xs font-medium">QR Scanner</h1>
          <Link href="/host/dashboard" className="text-xs hover:underline flex items-center gap-1 text-foreground/70">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </Link>
        </div>
      </div>

      {/* Desktop Header */}
      <div className="hidden lg:block mx-auto max-w-6xl px-4 py-6">
        <div className="mb-6">
          <Link href="/host/dashboard" className="text-sm hover:underline mb-2 block">
            ← Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Scanner</h1>
          <p className="text-foreground/60">Scan event tickets to validate attendance</p>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      <div className="mx-auto max-w-6xl px-3 pb-6 pt-12 lg:pt-0 lg:px-4 lg:pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 lg:gap-8">
          {/* Scanner Section */}
          <div className="card p-2.5 lg:p-6">
            <h2 className="text-xs lg:text-lg font-medium mb-2 text-foreground">Scan QR Code</h2>
            
            {/* Event Selection */}
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                <strong>Note:</strong> Select an event to enable QR scanning and check-in functionality.
              </p>
              <div className="flex items-center gap-2">
                <select 
                  value={selectedEvent?.id || ''} 
                  onChange={(e) => {
                    if (e.target.value) {
                      // In a real app, you'd fetch event details from the backend
                      setSelectedEvent({
                        id: e.target.value,
                        name: 'Selected Event',
                        contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
                        date: new Date().toISOString()
                      });
                    } else {
                      setSelectedEvent(null);
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
                >
                  <option value="">Select an event...</option>
                  <option value="demo-event">Demo Event (Placeholder)</option>
                </select>
              </div>
            </div>

            {selectedEvent ? (
              <QRScanner 
                eventContractAddress={selectedEvent.contractAddress}
                event={{ name: selectedEvent.name, date: selectedEvent.date }}
                onScanSuccess={handleQRScan}
                onScanError={handleError}
              />
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                  </svg>
                </div>
                <p className="text-foreground/60">Please select an event to start scanning</p>
              </div>
            )}
          </div>

          {/* Validation Results Section */}
          <div className="card p-2.5 lg:p-6">
            <h2 className="text-xs lg:text-lg font-medium mb-2 text-foreground">Validation Results</h2>
          
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

              {/* Check-in Details */}
              {validationResult.isValid && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Check-in Details</h3>
                  <div className="space-y-2 text-sm">
                    {validationResult.participantName && (
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Participant:</span>
                        <span className="font-medium">{validationResult.participantName}</span>
                      </div>
                    )}
                    {validationResult.eventName && (
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Event:</span>
                        <span className="font-medium">{validationResult.eventName}</span>
                      </div>
                    )}
                    {validationResult.checkedInAt && (
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Checked in:</span>
                        <span className="font-medium">
                          {new Date(validationResult.checkedInAt).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    {validationResult.nullifierHash && (
                      <div className="flex justify-between">
                        <span className="text-foreground/60">Check-in ID:</span>
                        <span className="font-mono text-xs">{validationResult.nullifierHash.slice(0, 8)}...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Technical Details */}
              {validationResult.isValid && validationResult.data && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-foreground">Technical Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/60">Event ID:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">{validationResult.data.eventId}</span>
                        <button
                          onClick={copyEventId}
                          className="p-1 hover:bg-foreground/10 rounded transition-colors"
                          title="Copy event ID"
                        >
                          {copiedEventId ? (
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-foreground/60">Commitment:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs">
                          {validationResult.data.commitment.slice(0, 8)}...{validationResult.data.commitment.slice(-8)}
                        </span>
                        <button
                          onClick={copyCommitment}
                          className="p-1 hover:bg-foreground/10 rounded transition-colors"
                          title="Copy full commitment"
                        >
                          {copiedCommitment ? (
                            <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          ) : (
                            <svg className="w-3 h-3 text-foreground/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Type:</span>
                      <span className="font-medium">{validationResult.data.type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-foreground/60">Format:</span>
                      <span className="font-medium">
                        {validationResult.message.includes('Semaphore') ? 'ZK Proof' : 'Legacy'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <button
                  onClick={resetValidation}
                  className="btn-primary flex-1"
                >
                  Scan Another
                </button>
                {validationResult.isValid && (
                  <button
                    onClick={() => {
                      // In a real app, you might want to record this check-in in a database
                      console.log('Check-in recorded:', {
                        participant: validationResult.participantName,
                        event: validationResult.eventName,
                        checkedInAt: validationResult.checkedInAt,
                        nullifierHash: validationResult.nullifierHash
                      });
                      alert('Check-in recorded successfully!');
                    }}
                    className="btn-secondary flex-1"
                  >
                    Record Check-In
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
        </div>


      </div>
    </div>
  );
}
