"use client";

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface NFTDisplayProps {
  contractAddress: string;
  tokenId: string;
  eventName: string;
  participantName: string;
  participantAddress: string;
  approvalDate: string;
  metadataURI?: string;
  qrImageUrl?: string;
}

export default function NFTDisplay({
  contractAddress,
  tokenId,
  eventName,
  participantName,
  participantAddress,
  approvalDate,
  metadataURI,
  qrImageUrl
}: NFTDisplayProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [fallbackQR, setFallbackQR] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
    }
  };

  const retryImageLoad = () => {
    if (retryCount < 2) {
      setRetryCount(prev => prev + 1);
      setImageError(false);
      setImageLoading(true);
      setImageLoaded(false);
    }
  };

  const generateFallbackQR = async () => {
    try {
      const QRCode = await import('qrcode');
      const qrDataUrl = await QRCode.toDataURL(`${eventName} - ${participantName}`, { 
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setFallbackQR(qrDataUrl);
    } catch (error) {
      console.error('Failed to generate fallback QR:', error);
    }
  };

  // Image preloading and timeout logic
  useEffect(() => {
    if (!qrImageUrl) {
      setImageLoading(false);
      setImageError(false);
      return;
    }

    // Set a timeout for image loading (3 seconds for faster fallback)
    const timeout = setTimeout(() => {
      if (!imageLoaded) {
        console.warn('⚠️ Image loading timeout, showing fallback');
        setImageLoading(false);
        setImageError(true);
      }
    }, 3000);

    setLoadTimeout(timeout);

    // Preload the image
    const preloadImage = new window.Image();
    preloadImage.onload = () => {
      console.log('✅ Image preloaded successfully');
      setImageLoaded(true);
      setImageLoading(false);
      setImageError(false);
      if (timeout) clearTimeout(timeout);
    };
    preloadImage.onerror = () => {
      console.error('❌ Image preload failed');
      setImageLoading(false);
      setImageError(true);
      if (timeout) clearTimeout(timeout);
      // Generate fallback QR code
      generateFallbackQR();
    };
    preloadImage.src = qrImageUrl;

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [qrImageUrl, imageLoaded]);

  return (
    <div className="card p-6 max-w-2xl mx-auto">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-foreground">NFT Event Ticket</h3>
          </div>
          <p className="text-foreground/70">Your event ticket has been minted as an NFT on the blockchain</p>
        </div>

        {/* NFT Image */}
        <div className="flex justify-center">
          <div className="relative w-64 h-64 border-2 border-foreground/20 rounded-xl shadow-2xl overflow-hidden bg-gradient-to-br from-foreground/5 to-foreground/10">
            {imageLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="relative">
                    <div className="w-12 h-12 border-3 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/60">Loading NFT Image...</p>
                  <p className="text-xs text-foreground/40">This may take a moment</p>
                </div>
              </div>
            ) : imageError ? (
              <div className="absolute inset-0 flex items-center justify-center">
                {fallbackQR ? (
                  <Image
                    src={fallbackQR}
                    alt="Fallback QR Code"
                    fill
                    className="object-contain"
                    priority
                    quality={90}
                  />
                ) : (
                  <div className="text-center space-y-3">
                    <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                      <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-sm font-medium text-foreground">NFT Minted!</p>
                    <p className="text-xs text-foreground/60">Token ID: {tokenId}</p>
                    <p className="text-xs text-foreground/60">QR code in metadata</p>
                    {retryCount < 2 && (
                      <button
                        onClick={retryImageLoad}
                        className="text-xs text-blue-600 hover:text-blue-800 underline"
                      >
                        Retry loading image
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : qrImageUrl && imageLoaded ? (
              qrImageUrl.includes('ipfs.io') || qrImageUrl.includes('gateway.pinata.cloud') ? (
                <img
                  ref={imgRef}
                  src={qrImageUrl}
                  alt="Event Ticket QR Code"
                  className="w-full h-full object-contain"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              ) : (
                <Image
                  ref={imgRef}
                  src={qrImageUrl}
                  alt="Event Ticket QR Code"
                  fill
                  className="object-contain"
                  priority
                  quality={90}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  onLoad={handleImageLoad}
                  onError={handleImageError}
                />
              )
            ) : qrImageUrl ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-foreground/60">Preloading image...</p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center space-y-3">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-foreground">NFT Minted!</p>
                  <p className="text-xs text-foreground/60">Token ID: {tokenId}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* NFT Details */}
        <div className="space-y-4">
          {/* Event Info */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Event Details
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-foreground/70">Event:</span>
                <span className="font-medium">{eventName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Participant:</span>
                <span className="font-medium">{participantName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Approved:</span>
                <span>{new Date(approvalDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Blockchain Info */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4">
            <h4 className="font-semibold text-foreground mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Blockchain Details
            </h4>
            <div className="space-y-3">
              {/* Contract Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground/70">Contract Address:</span>
                  <button
                    onClick={() => copyToClipboard(contractAddress, 'contract')}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {copied === 'contract' ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-xs bg-foreground/5 rounded px-2 py-1 break-all">
                  {contractAddress}
                </p>
              </div>

              {/* Token ID */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-foreground/70">Token ID:</span>
                  <button
                    onClick={() => copyToClipboard(tokenId, 'token')}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    {copied === 'token' ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Copied!
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Copy
                      </>
                    )}
                  </button>
                </div>
                <p className="font-mono text-sm font-medium">{tokenId}</p>
              </div>

              {/* Standard */}
              <div>
                <span className="text-sm text-foreground/70">Standard:</span>
                <span className="ml-2 text-sm font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                  ERC721
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <a
            href={`https://testnet.soniclabs.com/token/${contractAddress}/${tokenId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View on Explorer
          </a>
          
          {metadataURI && (
            <a
              href={metadataURI}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary flex-1 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Metadata
            </a>
          )}
        </div>

        {/* Disclaimer */}
        <div className="text-xs text-foreground/60 bg-foreground/5 rounded-lg p-3">
          <p className="font-medium mb-1">ℹ️ About this NFT:</p>
          <p>
            This NFT contains a QR code for event verification. The QR code is stored in the NFT metadata on IPFS. 
            You can use this NFT as proof of registration and for event check-in.
          </p>
        </div>
      </div>
    </div>
  );
}
