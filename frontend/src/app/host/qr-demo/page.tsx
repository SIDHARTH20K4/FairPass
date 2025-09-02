"use client";

import { useState } from "react";
import Link from "next/link";
import QRCode from "qrcode";

export default function QRDemoPage() {
  const [qrData, setQrData] = useState({
    eventId: "demo-event-123",
    eventName: "Demo Event 2024",
    participantAddress: "0x1234567890123456789012345678901234567890",
    participantName: "John Doe",
    approvalDate: new Date().toISOString(),
    type: "event-ticket"
  });
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

  const generateQRCode = async () => {
    try {
      const qrString = JSON.stringify(qrData);
      const url = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  };

  const updateField = (field: string, value: string) => {
    setQrData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8">
        <Link href="/host/dashboard" className="text-sm hover:underline mb-2 block">
          ← Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Demo</h1>
        <p className="text-foreground/60">Generate demo QR codes to test the scanner</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* QR Data Form */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">QR Code Data</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Event ID</label>
              <input
                type="text"
                value={qrData.eventId}
                onChange={(e) => updateField('eventId', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Event Name</label>
              <input
                type="text"
                value={qrData.eventName}
                onChange={(e) => updateField('eventName', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Participant Name</label>
              <input
                type="text"
                value={qrData.participantName}
                onChange={(e) => updateField('participantName', e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Wallet Address</label>
              <input
                type="text"
                value={qrData.participantAddress}
                onChange={(e) => updateField('participantAddress', e.target.value)}
                className="input font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-foreground/80">Approval Date</label>
              <input
                type="datetime-local"
                value={new Date(qrData.approvalDate).toISOString().slice(0, 16)}
                onChange={(e) => updateField('approvalDate', new Date(e.target.value).toISOString())}
                className="input"
              />
            </div>
            <button
              onClick={generateQRCode}
              className="btn-primary w-full"
            >
              Generate QR Code
            </button>
          </div>
        </div>

        {/* Generated QR Code */}
        <div className="card p-6">
          <h2 className="text-xl font-semibold mb-4 text-foreground">Generated QR Code</h2>
          {qrCodeUrl ? (
            <div className="text-center">
              <img
                src={qrCodeUrl}
                alt="Generated QR Code"
                className="mx-auto border border-foreground/20 rounded-lg"
              />
              <p className="text-sm text-foreground/60 mt-4">
                Scan this QR code with the scanner to test validation
              </p>
              <div className="mt-4 flex gap-3">
                <Link href="/host/qr-scanner" className="btn-primary flex-1">
                  Test Scanner
                </Link>
                <button
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = 'qr-code.png';
                    link.href = qrCodeUrl;
                    link.click();
                  }}
                  className="btn-secondary flex-1"
                >
                  Download
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <p className="text-foreground/60">Click "Generate QR Code" to create a test QR code</p>
            </div>
          )}
        </div>
      </div>

      {/* JSON Preview */}
      <div className="mt-8 card p-6">
        <h3 className="font-semibold text-foreground mb-3">QR Code JSON Data</h3>
        <pre className="bg-foreground/5 p-4 rounded-lg text-sm overflow-x-auto">
          {JSON.stringify(qrData, null, 2)}
        </pre>
      </div>
    </main>
  );
}
