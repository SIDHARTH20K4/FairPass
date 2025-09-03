import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { parseEther, formatEther } from 'viem';
import { EventType, web3Service } from '@/services/Web3Service';

export interface CreateEventParams {
  name: string;
  eventType: EventType;
  ticketPrice: string; // in wei as string
}

export interface UseEventFactoryReturn {
  isInitialized: boolean;
  isConnected: boolean;
  address: string | undefined;
  createEvent: (params: CreateEventParams) => Promise<string>;
  error: string | null;
  loading: boolean;
}

export function useEventFactory(): UseEventFactoryReturn {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Initialize Web3 service
  useEffect(() => {
    const init = async () => {
      try {
        await web3Service.initialize();
        setIsInitialized(true);
      } catch (err) {
        console.error('Failed to initialize Web3 service:', err);
        setError('Failed to initialize Web3 service');
      }
    };

    init();
  }, []);

  // Update error state when connection error changes
  useEffect(() => {
    if (connectError) {
      setError(connectError.message);
    } else {
      setError(null);
    }
  }, [connectError]);

  const createEvent = useCallback(async (params: CreateEventParams): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!isInitialized) {
      throw new Error('Web3 service not initialized');
    }

    setLoading(true);
    setError(null);

    try {
      const eventAddress = await web3Service.createEvent({
        name: params.name,
        eventType: params.eventType,
        ticketPrice: params.ticketPrice,
        eventOwner: address
      });

      return eventAddress;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [isConnected, address, isInitialized]);

  return {
    isInitialized,
    isConnected,
    address,
    createEvent,
    error,
    loading
  };
}

// Wallet connection hook
export function useWalletConnection() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = useCallback(async (connectorId: string = 'injected') => {
    try {
      const connector = connectors.find(c => c.id === connectorId);
      if (connector) {
        await connect({ connector });
      }
    } catch (err) {
      console.error('Failed to connect wallet:', err);
      throw err;
    }
  }, [connect, connectors]);

  const disconnectWallet = useCallback(() => {
    disconnect();
  }, [disconnect]);

  return {
    address,
    isConnected,
    connectWallet,
    disconnectWallet,
    connectors,
    error: connectError
  };
}

