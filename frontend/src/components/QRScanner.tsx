"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { createEventHooks } from '../../web3/implementationConnections';
import jsQR from 'jsqr';

interface QRScannerProps {
  eventContractAddress: string;
  event?: {
    date?: string;
    name?: string;
  };
  onScanSuccess?: (result: any) => void;
  onScanError?: (error: string) => void;
}

interface ScannedTicketData {
  eventId: string;
  eventName: string;
  participantAddress: string;
  participantName: string;
  approvalDate: string;
  type: string;
}

export default function QRScanner({ 
  eventContractAddress, 
  event,
  onScanSuccess, 
  onScanError 
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedTicketData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const { address } = useAccount();
  const eventHooks = createEventHooks(eventContractAddress);
  const { checkIn, isPending: isCheckInPending, error: checkInError } = eventHooks?.useCheckIn() || {};

  // Check if today is the event date
  const isEventDate = () => {
    if (!event?.date) return true; // If no date provided, allow scanning
    
    try {
      const eventDate = new Date(event.date);
      const today = new Date();
      
      // Set time to start of day for both dates to compare only dates
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return eventDateOnly.getTime() === todayOnly.getTime();
    } catch (error) {
      console.error('Error checking event date:', error);
      return true; // If error, allow scanning
    }
  };

  // Start camera and QR scanning
  const startScanning = async () => {
    try {
      setError(null);
      setIsScanning(true);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera if available
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start QR code detection
        scanIntervalRef.current = setInterval(scanQRCode, 1000);
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Failed to access camera. Please ensure camera permissions are granted.');
      setIsScanning(false);
    }
  };

  // Stop camera and scanning
  const stopScanning = () => {
    setIsScanning(false);

    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  };

  // Scan QR code from video stream
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code detection
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Use jsQR library for QR code detection (we'll need to install this)
    try {
      // For now, we'll use a simple approach with manual input
      // In production, you'd use a library like jsQR
      checkForQRCode(imageData);
    } catch (error) {
      console.error('QR scanning error:', error);
    }
  };

  // Check for QR code in image data using jsQR
  const checkForQRCode = (imageData: ImageData) => {
    try {
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      
      if (code) {
        console.log('QR Code detected:', code.data);
        processQRData(code.data);
      }
    } catch (error) {
      console.error('QR detection error:', error);
    }
  };

  // Process scanned QR data
  const processQRData = (qrData: string) => {
    try {
      const ticketData: ScannedTicketData = JSON.parse(qrData);
      
      if (ticketData.type === 'event-ticket') {
        setScanResult(ticketData);
        stopScanning();
        onScanSuccess?.(ticketData);
      } else {
        throw new Error('Invalid ticket QR code');
      }
    } catch (error) {
      const errorMsg = 'Invalid QR code format';
      setError(errorMsg);
      onScanError?.(errorMsg);
    }
  };

  // Handle check-in for scanned ticket
  const handleCheckInScanned = async () => {
    if (!scanResult || !checkIn) return;

    // Check if today is the event date
    if (!isEventDate()) {
      setError('Check-in is only available on the event date');
      return;
    }

    try {
      setIsProcessingCheckIn(true);
      
      // For this demo, we'll use token ID 1
      // In a real implementation, you'd extract the token ID from the QR data
      // or look it up based on the participant address
      const tokenId = BigInt(1);
      
      checkIn(tokenId);
      setCheckInSuccess(true);
      
    } catch (error) {
      console.error('Check-in error:', error);
      setError('Failed to check in participant');
    } finally {
      setIsProcessingCheckIn(false);
    }
  };

  // Manual QR input for testing
  const [manualInput, setManualInput] = useState('');
  const handleManualInput = () => {
    if (manualInput.trim()) {
      processQRData(manualInput.trim());
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold mb-2">QR Scanner</h2>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Scan participant tickets to check them in
        </p>
      </div>

      {!isScanning && !scanResult ? (
        <div className="space-y-4">
          {/* Camera Scanner */}
          <button
            onClick={startScanning}
            className="w-full btn-primary flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Start Camera Scanner
          </button>

          {/* Manual Input for Testing */}
          <div className="border-t pt-4">
            <label className="block text-sm font-medium mb-2">
              Manual QR Data Input (for testing)
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualInput}
                onChange={(e) => setManualInput(e.target.value)}
                placeholder="Paste QR data here..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700"
              />
              <button
                onClick={handleManualInput}
                className="btn-secondary"
              >
                Scan
              </button>
            </div>
          </div>
        </div>
      ) : isScanning ? (
        <div className="space-y-4">
          {/* Video Preview */}
          <div className="relative">
            <video
              ref={videoRef}
              className="w-full rounded-lg"
              autoPlay
              muted
              playsInline
            />
            <canvas
              ref={canvasRef}
              className="hidden"
            />
            
            {/* Scanning Overlay */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-48 h-48 border-2 border-blue-500 rounded-lg flex items-center justify-center">
                <div className="w-32 h-32 border-2 border-blue-300 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          <button
            onClick={stopScanning}
            className="w-full btn-secondary"
          >
            Stop Scanning
          </button>
        </div>
      ) : scanResult ? (
        <div className="space-y-4">
          {/* Scan Result */}
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-medium text-green-800 dark:text-green-200">Ticket Scanned Successfully</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Participant:</span>
                <span className="font-medium">{scanResult.participantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Event:</span>
                <span className="font-medium">{scanResult.eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Address:</span>
                <span className="font-mono text-xs">
                  {scanResult.participantAddress.slice(0, 6)}...{scanResult.participantAddress.slice(-4)}
                </span>
              </div>
            </div>
          </div>

          {/* Check-in Actions */}
          {!checkInSuccess ? (
            <div className="space-y-3">
              {isEventDate() ? (
                <button
                  onClick={handleCheckInScanned}
                  disabled={isProcessingCheckIn || isCheckInPending}
                  className="w-full btn-primary flex items-center justify-center gap-2"
                >
                  {(isProcessingCheckIn || isCheckInPending) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Processing Check-In...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Check In Participant</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Check-in available on event date
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60">
                    Event Date: {event?.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              )}
              
              <button
                onClick={() => {
                  setScanResult(null);
                  setCheckInSuccess(false);
                }}
                className="w-full btn-secondary"
              >
                Scan Another Ticket
              </button>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Participant Checked In!
                </span>
              </div>
              
              <button
                onClick={() => {
                  setScanResult(null);
                  setCheckInSuccess(false);
                }}
                className="w-full btn-primary"
              >
                Scan Next Ticket
              </button>
            </div>
          )}
        </div>
      ) : null}

      {/* Error Display */}
      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}