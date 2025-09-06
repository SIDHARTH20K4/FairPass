import { useState, useEffect, useCallback } from 'react';
import { useAccount, useConnect, useDisconnect, useSignMessage, useWalletClient } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { parseEther, formatEther } from 'viem';
import { EventType, useCreateEvent } from '../../web3/factoryConnections';

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
  transactionHash: string | undefined;
}

export function useEventFactory(): UseEventFactoryReturn {
  const { address, isConnected } = useAccount();
  const { connect, connectors, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();
  
  // Use wagmi hooks for contract interaction
  const { createEvent: createEventContract, hash, isPending, error: contractError } = useCreateEvent();
  
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [eventAddress, setEventAddress] = useState<string | null>(null);

  // Initialize - no need for complex initialization with wagmi
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Update error state when connection error changes
  useEffect(() => {
    if (connectError) {
      setError(connectError.message);
    } else if (contractError) {
      setError(contractError.message);
    } else {
      setError(null);
    }
  }, [connectError, contractError]);

  // Watch for transaction hash changes to track loading state
  useEffect(() => {
    console.log('🔍 useWeb3 hash useEffect triggered:', { hash, isPending, loading });
    if (hash) {
      console.log('✅ Transaction hash updated in useWeb3:', hash);
      setLoading(true);
      setEventAddress(null);
    }
  }, [hash, isPending, loading]);

  const createEvent = useCallback(async (params: CreateEventParams): Promise<string> => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    if (!isInitialized) {
      throw new Error('Web3 service not initialized');
    }

    if (isPending) {
      throw new Error('Transaction already in progress');
    }

    setLoading(true);
    setError(null);
    setEventAddress(null);

    try {
      // Convert ticketPrice from string to BigInt
      const ticketPriceBigInt = BigInt(params.ticketPrice);
      
      // Call the wagmi hook - this will trigger the transaction
      await createEventContract(params.name, params.eventType, ticketPriceBigInt);
      
      // Return a placeholder - the actual hash will be available in the hash state
      // The UI will update when the hash becomes available
      return 'Transaction submitted';
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      setLoading(false);
      throw err;
    }
  }, [isConnected, address, isInitialized, createEventContract, isPending]);

  return {
    isInitialized,
    isConnected,
    address,
    createEvent,
    error,
    loading: loading || isPending,
    transactionHash: hash
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

