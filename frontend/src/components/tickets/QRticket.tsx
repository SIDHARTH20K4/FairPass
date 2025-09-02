"use client";

import React from 'react';

interface QRTicketProps {
  qrUrl: string;
  eventName: string;
  participantName: string;
  participantAddress: string;
  approvalDate: string;
}

export default function QRTicket({ 
  qrUrl, 
  eventName, 
  participantName, 
  participantAddress, 
  approvalDate
}: QRTicketProps) {
  const downloadQR = () => {
    const link = document.createElement('a');
    link.href = qrUrl;
    link.download = `ticket-${eventName}-${participantName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <img 
            src={qrUrl} 
            alt="Event Ticket QR Code" 
            className="w-48 h-48 border-2 border-foreground/20 rounded-lg shadow-lg"
          />
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
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
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
        </div>
        

      </div>
    </div>
  );
}
