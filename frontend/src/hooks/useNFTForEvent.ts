import { useState, useEffect, useCallback } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { eventTicketABI } from '../../web3/constants';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface UseNFTForEventProps {
  ticketNFTAddress: string;
  userAddress: string;
  enabled?: boolean;
}

export function useNFTForEvent({ 
  ticketNFTAddress, 
  userAddress, 
  enabled = true 
}: UseNFTForEventProps) {
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const publicClient = usePublicClient();

  // Check user's NFT balance
  const { data: nftBalance, refetch: refetchBalance } = useReadContract({
    address: ticketNFTAddress as `0x${string}`,
    abi: eventTicketABI,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: enabled && !!ticketNFTAddress && !!userAddress,
    },
  });

  // Fetch metadata from IPFS
  const fetchMetadata = useCallback(async (tokenURI: string): Promise<NFTMetadata | null> => {
    try {
      let url = tokenURI;
      if (tokenURI.startsWith('ipfs://')) {
        url = `https://ipfs.io/ipfs/${tokenURI.slice(7)}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }, []);

  // Find user's NFT token using Transfer events
  const findUserNFT = useCallback(async () => {
    if (!ticketNFTAddress || !userAddress || !publicClient || !enabled) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('🔍 Starting NFT search for Free + Approval event');
      console.log('📋 Contract:', ticketNFTAddress);
      console.log('👤 User:', userAddress);

      // First check if user has any balance
      if (!nftBalance || Number(nftBalance) === 0) {
        console.log('📊 No NFT balance found');
        setLoading(false);
        return;
      }

      console.log('✅ User has NFT balance:', nftBalance.toString());

      // Try to get Transfer events for this user
      try {
        console.log('🔍 Checking Transfer events...');
        const transferEvents = await publicClient.getLogs({
          address: ticketNFTAddress as `0x${string}`,
          event: {
            type: 'event',
            name: 'Transfer',
            inputs: [
              { type: 'address', indexed: true, name: 'from' },
              { type: 'address', indexed: true, name: 'to' },
              { type: 'uint256', indexed: true, name: 'tokenId' }
            ]
          },
          fromBlock: 'earliest',
          toBlock: 'latest',
          args: {
            to: userAddress as `0x${string}`
          }
        });

        console.log('📋 Found Transfer events:', transferEvents.length);

        // Check the most recent transfer events first
        for (const event of transferEvents.reverse()) {
          if (event.args && event.args.tokenId) {
            const tokenId = event.args.tokenId.toString();
            console.log('🔍 Checking token ID from event:', tokenId);

            try {
              // Verify current ownership
              const owner = await publicClient.readContract({
                address: ticketNFTAddress as `0x${string}`,
                abi: eventTicketABI,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
              });

              if (owner.toLowerCase() === userAddress.toLowerCase()) {
                console.log('🎯 Found user NFT via Transfer event:', tokenId);
                setNftTokenId(tokenId);

                // Get token URI and metadata
                try {
                  const tokenURI = await publicClient.readContract({
                    address: ticketNFTAddress as `0x${string}`,
                    abi: eventTicketABI,
                    functionName: 'tokenURI',
                    args: [BigInt(tokenId)],
                  });

                  console.log('📄 Token URI:', tokenURI);
                  const metadata = await fetchMetadata(tokenURI as string);
                  if (metadata) {
                    console.log('✅ NFT metadata loaded:', metadata);
                    setNftMetadata(metadata);
                  } else {
                    console.warn('⚠️ Could not load NFT metadata');
                  }
                } catch (error) {
                  console.error('❌ Error getting token URI:', error);
                }

                setLoading(false);
                return;
              }
            } catch (error) {
              // Token might not exist anymore, continue
              continue;
            }
          }
        }

        // If not found via events, do manual search
        console.log('🔍 Transfer events didn\'t find NFT, doing manual search...');
        
        // Get total supply to limit search range
        let maxTokens = 50;
        try {
          const totalSupply = await publicClient.readContract({
            address: ticketNFTAddress as `0x${string}`,
            abi: eventTicketABI,
            functionName: 'totalSupply',
          });
          maxTokens = Math.min(Number(totalSupply) + 5, 50);
          console.log('📊 Total supply:', totalSupply, 'Searching up to token:', maxTokens);
        } catch (error) {
          console.log('⚠️ Could not get total supply, using default range of 50');
        }

        // Search for tokens manually
        const searchPromises = [];
        for (let tokenId = 1; tokenId <= maxTokens; tokenId++) {
          searchPromises.push(
            publicClient.readContract({
              address: ticketNFTAddress as `0x${string}`,
              abi: eventTicketABI,
              functionName: 'ownerOf',
              args: [BigInt(tokenId)],
            }).then(owner => ({ tokenId, owner }))
            .catch(() => ({ tokenId, owner: null }))
          );
        }

        const results = await Promise.all(searchPromises);
        
        for (const result of results) {
          if (result.owner && result.owner.toLowerCase() === userAddress.toLowerCase()) {
            const tokenId = result.tokenId.toString();
            console.log('🎯 Found user NFT with token ID:', tokenId);
            setNftTokenId(tokenId);

            // Get metadata
            try {
              const tokenURI = await publicClient.readContract({
                address: ticketNFTAddress as `0x${string}`,
                abi: eventTicketABI,
                functionName: 'tokenURI',
                args: [BigInt(tokenId)],
              });

              const metadata = await fetchMetadata(tokenURI as string);
              if (metadata) {
                setNftMetadata(metadata);
              }
            } catch (error) {
              console.error('Error getting token URI:', error);
            }

            setLoading(false);
            return;
          }
        }

        console.log('❌ No NFT found for user');
        setError('No NFT found in your wallet');
      } catch (error) {
        console.error('❌ Error getting Transfer events:', error);
        setError('Failed to search for NFT: ' + (error as Error).message);
      }
    } catch (error) {
      console.error('❌ Error finding user NFT:', error);
      setError('Failed to load NFT data: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [ticketNFTAddress, userAddress, publicClient, nftBalance, enabled, fetchMetadata]);

  // Refresh NFT data
  const refreshNFT = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setIsRefreshing(true);
    setError(null);
    
    try {
      // Refetch balance first
      await refetchBalance();
      
      // Wait a bit for balance to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then find the NFT
      await findUserNFT();
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      setError('Failed to refresh NFT data');
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchBalance, findUserNFT]);

  // Auto-fetch when dependencies change
  useEffect(() => {
    if (enabled && ticketNFTAddress && userAddress) {
      const timeoutId = setTimeout(() => {
        findUserNFT();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [findUserNFT, enabled, ticketNFTAddress, userAddress]);

  // Auto-refresh when balance changes
  useEffect(() => {
    if (nftBalance && Number(nftBalance) > 0 && (!nftTokenId || !nftMetadata)) {
      console.log('🔄 Auto-refreshing for newly detected NFT...');
      const timeoutId = setTimeout(() => {
        findUserNFT();
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [nftBalance, nftTokenId, nftMetadata, findUserNFT]);

  return {
    nftMetadata,
    nftTokenId,
    nftBalance,
    loading,
    error,
    isRefreshing,
    refreshNFT,
    hasNFT: !!(nftTokenId && nftMetadata),
  };
}

