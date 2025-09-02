"use client";

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function QRScanner({ onScan, onError, className = "" }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startScanning = async () => {
    try {
      setError(null);
      
      // Initialize the ZXing reader
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      
      // Get available video devices
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      // Prefer back camera if available
      const backCamera = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      );
      
      const deviceId = backCamera?.deviceId || videoInputDevices[0]?.deviceId;
      
      if (videoRef.current) {
        // Start decoding from the video element
        await readerRef.current.decodeFromVideoDevice(
          deviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              onScan(result.getText());
              stopScanning();
            }
            if (error && !(error instanceof Error && error.name === 'NotFoundException')) {
              // NotFoundException is normal when no QR code is detected
              console.warn('QR scan error:', error);
            }
          }
        );
        
        setIsScanning(true);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    if (readerRef.current) {
      readerRef.current.reset();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-md mx-auto">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
        />

        
        {/* Scanning overlay */}
        {isScanning && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets - responsive sizing */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 sm:w-48 sm:h-48">
              <div className="absolute top-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 sm:border-t-4 border-l-2 sm:border-l-4 border-white rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-t-2 sm:border-t-4 border-r-2 sm:border-r-4 border-white rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 sm:border-b-4 border-l-2 sm:border-l-4 border-white rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-8 sm:h-8 border-b-2 sm:border-b-4 border-r-2 sm:border-r-4 border-white rounded-br-lg"></div>
            </div>
            
            {/* Scanning line animation */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 sm:w-48 h-0.5 sm:h-1 bg-white/50 animate-pulse"></div>
          </div>
        )}
      </div>
      
      {/* Controls */}
      <div className="mt-4 flex flex-col sm:flex-row justify-center gap-3">
        {!isScanning ? (
          <button
            onClick={startScanning}
            className="btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="hidden sm:inline">Start Scanning</span>
            <span className="sm:hidden">Start Camera</span>
          </button>
        ) : (
          <button
            onClick={stopScanning}
            className="btn-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">Stop Scanning</span>
            <span className="sm:hidden">Stop Camera</span>
          </button>
        )}
      </div>
      
      {/* Error message */}
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      {/* Instructions */}
      <div className="mt-2 text-center text-xs text-foreground/60">
        <p className="hidden sm:block text-xs">Point your camera at a QR code to scan it</p>
        <p className="sm:hidden text-xs">Point camera at QR code</p>
        <p className="text-xs mt-1 opacity-60">Make sure the QR code is well-lit and in focus</p>
      </div>
    </div>
  );
}
