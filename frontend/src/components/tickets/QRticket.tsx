"use client";

import React, { useState, useEffect } from 'react';

interface QRTicketProps {
  qrUrl: string;
  eventName: string;
  participantName: string;
  participantAddress: string;
  approvalDate: string;
  isNFTMinted?: boolean;
  nftTokenId?: string;
  nftContractAddress?: string;
}

export default function QRTicket({ 
  qrUrl, 
  eventName, 
  participantName, 
  participantAddress, 
  approvalDate,
  isNFTMinted = false,
  nftTokenId,
  nftContractAddress
}: QRTicketProps) {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  console.log('🎫 QRTicket component rendered with:', {
    qrUrl,
    eventName,
    participantName,
    participantAddress,
    imageLoading,
    imageError
  });

  // Reset loading state when qrUrl changes
  useEffect(() => {
    setImageLoading(true);
    setImageError(false);
    
    // Test the IPFS URL accessibility
    if (qrUrl) {
      console.log('🔍 Testing IPFS URL accessibility:', qrUrl);
      fetch(qrUrl, { method: 'HEAD' })
        .then(response => {
          console.log('🔍 IPFS URL test response:', { 
            status: response.status, 
            ok: response.ok, 
            contentType: response.headers.get('content-type'),
            contentLength: response.headers.get('content-length')
          });
        })
        .catch(error => {
          console.error('❌ IPFS URL test failed:', error);
        });
    }
  }, [qrUrl]);

  // Timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (imageLoading) {
        console.warn('⏰ QR image loading timeout, setting error state');
        setImageError(true);
        setImageLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [imageLoading]);

  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `ticket-${eventName}-${participantName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error('❌ QR image failed to load:', {
      qrUrl,
      error: e.currentTarget.src,
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight
    });
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.log('✅ QR image loaded successfully:', {
      qrUrl,
      naturalWidth: e.currentTarget.naturalWidth,
      naturalHeight: e.currentTarget.naturalHeight
    });
    setImageError(false);
    setImageLoading(false);
  };

  return (
    <div className="card p-6 max-w-md mx-auto">
      <div className="text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-foreground">Event Ticket</h3>
          <p className="text-sm text-foreground/70">{eventName}</p>
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="w-48 h-48 border-2 border-foreground/20 rounded-lg shadow-lg flex items-center justify-center bg-foreground/5">
            {isNFTMinted && qrUrl === 'NFT_MINTED' ? (
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">NFT Minted!</p>
                <p className="text-xs text-foreground/60">Token ID: {nftTokenId || 'Pending...'}</p>
                <p className="text-xs text-foreground/60">QR code stored in NFT metadata</p>
              </div>
            ) : imageLoading ? (
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto"></div>
                <p className="text-xs text-foreground/60">Loading QR Code...</p>
              </div>
            ) : imageError ? (
              <div className="text-center space-y-2">
                <div className="w-8 h-8 text-red-500 mx-auto">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-xs text-red-500">Failed to load QR Code</p>
                <p className="text-xs text-foreground/60 break-all">{qrUrl}</p>
              </div>
            ) : (
              <img 
                src={qrUrl} 
                alt="Event Ticket QR Code" 
                className="w-full h-full object-contain rounded-lg"
                onError={handleImageError}
                onLoad={handleImageLoad}
              />
            )}
          </div>
        </div>
        
        {/* Ticket Information */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-foreground/70">Participant:</span>
            <span className="font-medium">{participantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Wallet:</span>
            <span className="font-mono text-xs">{participantAddress.slice(0, 6)}...{participantAddress.slice(-4)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-foreground/70">Approved:</span>
            <span>{new Date(approvalDate).toLocaleDateString()}</span>
          </div>
          {isNFTMinted && nftTokenId && (
            <div className="flex justify-between">
              <span className="text-foreground/70">NFT Token ID:</span>
              <span className="font-mono text-xs">{nftTokenId}</span>
            </div>
          )}
          {isNFTMinted && nftContractAddress && (
            <div className="flex justify-between">
              <span className="text-foreground/70">Contract:</span>
              <span className="font-mono text-xs">{nftContractAddress.slice(0, 6)}...{nftContractAddress.slice(-4)}</span>
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          {isNFTMinted ? (
            <>
              <button 
                onClick={downloadQR}
                className="btn-primary flex-1 text-sm"
                disabled
              >
                NFT Minted
              </button>
              <a 
                href={`https://testnet.soniclabs.com/token/${nftContractAddress}/${nftTokenId}`}
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary flex-1 text-sm text-center"
              >
                View NFT
              </a>
            </>
          ) : (
            <>
              <button 
                onClick={downloadQR}
                className="btn-primary flex-1 text-sm"
              >
                Download QR
              </button>
              <a 
                href={qrUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary flex-1 text-sm text-center"
              >
                View Full Size
              </a>
            </>
          )}
        </div>
        

      </div>
    </div>
  );
}
