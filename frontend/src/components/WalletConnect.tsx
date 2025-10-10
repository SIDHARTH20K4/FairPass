"use client";

import { useState } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  className?: string;
}

export default function WalletConnect({ onConnect, onDisconnect, className = "" }: WalletConnectProps) {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async (connectorId: string) => {
    try {
      setIsConnecting(true);
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        await connect({ connector });
        if (address && onConnect) {
          onConnect(address);
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    if (onDisconnect) {
      onDisconnect();
    }
  };

  if (isConnected && address) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-foreground/80">
            {`${address.slice(0, 6)}...${address.slice(-4)}`}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="btn-secondary text-sm px-3 py-1"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        onClick={() => handleConnect('injected')}
        disabled={isConnecting}
        className="btn-primary text-sm px-4 py-2"
      >
        {isConnecting ? (
          <>
            <div className="w-4 h-4 border-2 border-foreground-foreground/20 border-t-foreground-foreground rounded-full animate-spin mr-2"></div>
            Connecting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Connect Wallet
          </>
        )}
      </button>
      
      {connectError && (
        <div className="text-xs text-red-500 max-w-xs">
          {connectError.message}
        </div>
      )}
    </div>
  );
}

