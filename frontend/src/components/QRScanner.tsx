"use client";

import { useEffect, useRef, useState } from 'react';

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

export default function QRScanner({ onScan, onError, className = "" }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple QR code detection using pattern matching
  const detectQRCode = (imageData: ImageData): string | null => {
    // This is a simplified QR detection - in a real app you'd use a proper QR library
    // For now, we'll look for common QR code patterns
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Look for the characteristic finder patterns of QR codes
    // This is a very basic implementation - real QR detection is much more complex
    for (let y = 0; y < height - 7; y++) {
      for (let x = 0; x < width - 7; x++) {
        // Check for 7x7 finder pattern (simplified)
        if (isFinderPattern(data, width, x, y)) {
          // If we find a pattern, try to extract data (simplified)
          const qrData = extractQRData(imageData, x, y);
          if (qrData) {
            return qrData;
          }
        }
      }
    }
    return null;
  };

  const isFinderPattern = (data: Uint8ClampedArray, width: number, x: number, y: number): boolean => {
    // Simplified finder pattern detection
    // Real QR detection would be much more sophisticated
    const pattern = [
      [1,1,1,1,1,1,1],
      [1,0,0,0,0,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,1,1,1,0,1],
      [1,0,0,0,0,0,1],
      [1,1,1,1,1,1,1]
    ];
    
    for (let py = 0; py < 7; py++) {
      for (let px = 0; px < 7; px++) {
        const pixelIndex = ((y + py) * width + (x + px)) * 4;
        const brightness = (data[pixelIndex] + data[pixelIndex + 1] + data[pixelIndex + 2]) / 3;
        const isBlack = brightness < 128;
        
        if ((pattern[py][px] === 1 && !isBlack) || (pattern[py][px] === 0 && isBlack)) {
          return false;
        }
      }
    }
    return true;
  };

  const extractQRData = (imageData: ImageData, x: number, y: number): string | null => {
    // This is a placeholder - real QR data extraction is complex
    // For demo purposes, we'll return a mock QR data
    return JSON.stringify({
      eventId: "demo-event-123",
      eventName: "Demo Event",
      participantAddress: "0x1234567890123456789012345678901234567890",
      participantName: "Demo Participant",
      approvalDate: new Date().toISOString(),
      type: "event-ticket"
    });
  };

  const startScanning = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsScanning(true);
        
        // Start scanning loop
        scanLoop();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to access camera';
      setError(errorMessage);
      onError?.(errorMessage);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanLoop = () => {
    if (!isScanning || !videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Try to detect QR code
    const qrData = detectQRCode(imageData);
    if (qrData) {
      onScan(qrData);
      stopScanning();
      return;
    }
    
    // Continue scanning
    requestAnimationFrame(scanLoop);
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
        <canvas
          ref={canvasRef}
          className="hidden"
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
