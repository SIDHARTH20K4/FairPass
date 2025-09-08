"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useReadContract, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { eventTicketABI, eventImplementationABI } from '../../web3/constants';
import { createEventHooks } from '../../web3/implementationConnections';
import { parseEther, formatEther } from 'viem';
import { uploadImageToIPFS, uploadJsonToIPFS } from '@/lib/ipfs';

interface BlockchainNFTTicketProps {
  eventContractAddress: string;
  userAddress: string;
  event: any;
}

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

export default function BlockchainNFTTicket({ 
  eventContractAddress, 
  userAddress, 
  event 
}: BlockchainNFTTicketProps) {
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);
  const [nftMetadata, setNftMetadata] = useState<NFTMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);
  
  // Minting state for Free + Approval events
  const [isMinting, setIsMinting] = useState(false);
  const [mintError, setMintError] = useState<string | null>(null);
  const [mintSuccess, setMintSuccess] = useState(false);
  const [isAutoRefreshing, setIsAutoRefreshing] = useState(false);
  const [nftCreated, setNftCreated] = useState(false);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriedFindingNFT = useRef(false);
  
  // Resale state
  const [showResaleModal, setShowResaleModal] = useState(false);
  const [resalePrice, setResalePrice] = useState('');
  const [resaleLoading, setResaleLoading] = useState(false);
  const [resaleInfo, setResaleInfo] = useState<{
    isListed: boolean;
    price: string;
    resalesDone: number;
    resalesRemaining: number;
  } | null>(null);

  // Resale transfer state
  const [showResaleTransferModal, setShowResaleTransferModal] = useState(false);
  const [transferToAddress, setTransferToAddress] = useState('');
  const [transferPrice, setTransferPrice] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);

  const publicClient = usePublicClient();

  // Get the NFT contract address from the event contract
  const eventHooks = createEventHooks(eventContractAddress);
  const { data: ticketNFTAddress } = eventHooks?.useTicketNFT() || {};
  
  // Check-in functionality
  const { checkIn, hash: checkInHash, isPending: isCheckInPending, error: checkInError } = eventHooks?.useCheckIn() || {};
  
  // Monitor check-in transaction
  const { isLoading: isCheckInTxLoading, isSuccess: isCheckInTxSuccess } = useWaitForTransactionReceipt({
    hash: checkInHash,
    query: { enabled: !!checkInHash }
  });

  // Minting functionality for Free + Approval events (using buyTicket for free events)
  const { buyTicket: mintTicket, hash: mintHash, isPending: isMintPending, error: mintHookError } = eventHooks?.useBuyTicket() || {};
  
  // Monitor minting transaction
  const { isLoading: isMintTxLoading, isSuccess: isMintTxSuccess } = useWaitForTransactionReceipt({
    hash: mintHash,
    query: { enabled: !!mintHash }
  });

  // Resale functionality
  const { writeContract: writeResaleContract, data: resaleTxHash, error: resaleError, isPending: resalePending } = useWriteContract();
  const { data: resaleTxReceipt, isLoading: resaleTxLoading } = useWaitForTransactionReceipt({
    hash: resaleTxHash,
  });

  // Transfer functionality
  const { writeContract: writeTransferContract, data: transferTxHash, error: transferError, isPending: transferPending } = useWriteContract();
  const { data: transferTxReceipt, isLoading: transferTxLoading } = useWaitForTransactionReceipt({
    hash: transferTxHash,
  });

  // Read resale info from smart contract (only for non-approval events)
  const { data: contractResaleInfo, refetch: refetchResaleInfo, isLoading: resaleInfoLoading } = useReadContract({
    address: ticketNFTAddress as `0x${string}`,
    abi: eventTicketABI,
    functionName: 'getResaleInfo',
    args: nftTokenId ? [BigInt(nftTokenId)] : undefined,
    query: {
      enabled: !!(ticketNFTAddress && nftTokenId && !event?.approvalNeeded && event?.price && event.price > 0),
    },
  });

  // Get user's NFT balance
  const { data: nftBalance, refetch: refetchBalance } = useReadContract({
    address: ticketNFTAddress as `0x${string}`,
    abi: eventTicketABI,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!(ticketNFTAddress && userAddress),
    },
  });

  // Get event type from contract
  const { data: eventType } = useReadContract({
    address: eventContractAddress as `0x${string}`,
    abi: eventImplementationABI,
    functionName: 'eventType',
    query: {
      enabled: !!eventContractAddress,
    },
  });

  // Function to fetch NFT metadata from IPFS
  const fetchMetadata = useCallback(async (tokenURI: string): Promise<NFTMetadata | null> => {
    try {
      console.log('🔍 Fetching NFT metadata from:', tokenURI);
      
      // Handle IPFS URLs
      const url = tokenURI.startsWith('ipfs://') 
        ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}`
        : tokenURI;
      
      console.log('🌐 Resolved IPFS URL:', url);
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText} (${response.status})`);
      }
      
      const metadata = await response.json();
      console.log('✅ Successfully fetched NFT metadata:', metadata);
      
      // Validate that the metadata has the expected structure
      if (!metadata.name || !metadata.image) {
        console.warn('⚠️ NFT metadata missing required fields:', metadata);
      }
      
      return metadata;
    } catch (error) {
      console.error('❌ Error fetching NFT metadata:', error);
      console.error('❌ Token URI was:', tokenURI);
      return null;
    }
  }, []);

  // Function to find user's NFT token using proper ABI functions
  const findUserNFT = useCallback(async () => {
    if (!ticketNFTAddress || !userAddress || !publicClient) {
      setLoading(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (hasTriedFindingNFT.current) {
      console.log('🔄 NFT search already in progress, skipping...');
      return;
    }
    
    hasTriedFindingNFT.current = true;

    try {
      setLoading(true);
      setError(null);

      // Set a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('⏰ NFT search timeout - stopping loading');
        setLoading(false);
        setError('NFT search timed out. Please try refreshing.');
      }, 15000); // Reduced to 15 seconds
      
      loadingTimeoutRef.current = timeout;

      console.log('🔍 Starting NFT search for user:', userAddress);
      console.log('📋 Using ticket NFT contract:', ticketNFTAddress);

      // First, get the user's balance
      let currentBalance = nftBalance;
      if (!currentBalance || Number(currentBalance) === 0) {
        console.log('🔍 Balance not available from hook, fetching directly...');
        currentBalance = await publicClient.readContract({
          address: ticketNFTAddress as `0x${string}`,
          abi: eventTicketABI,
          functionName: 'balanceOf',
          args: [userAddress as `0x${string}`],
        });
        console.log('📊 Direct balance fetch result:', currentBalance);
      }

      if (!currentBalance || Number(currentBalance) === 0) {
        console.log('📊 No NFT balance found for user');
        setLoading(false);
        return;
      }

      console.log('✅ User has NFT balance:', currentBalance.toString());

      // Try to get total supply to determine search range
      let maxTokens = 50; // Reduced default range
      try {
        const totalSupply = await publicClient.readContract({
          address: ticketNFTAddress as `0x${string}`,
          abi: eventTicketABI,
          functionName: 'totalSupply',
        });
        maxTokens = Math.min(Number(totalSupply) + 5, 50); // Smaller buffer
        console.log('📊 Total supply:', totalSupply, 'Searching up to token:', maxTokens);
      } catch (error) {
        console.log('⚠️ Could not get total supply, using default range of 50');
      }
      
      // Search for the user's token more efficiently
      let foundToken = null;
      
      // Try to get recent Transfer events to find user's tokens
      try {
        console.log('🔍 Checking recent Transfer events for user tokens...');
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
              const owner = await publicClient.readContract({
                address: ticketNFTAddress as `0x${string}`,
                abi: eventTicketABI,
                functionName: 'ownerOf',
                args: [BigInt(tokenId)],
              });
              
              if ((owner as string).toLowerCase() === userAddress.toLowerCase()) {
                foundToken = tokenId;
                console.log('🎯 Found user NFT via Transfer event:', foundToken);
                break;
              }
            } catch (error) {
              // Token might not exist anymore, continue
              continue;
            }
          }
        }
      } catch (error) {
        console.log('⚠️ Could not get Transfer events, falling back to manual search');
      }
      
      // If not found via events, do manual search
      if (!foundToken) {
        console.log('🔍 Performing manual token search...');
        const searchPromises = [];
        
        // Create search promises in batches
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

        // Wait for all searches to complete
        const results = await Promise.all(searchPromises);
        
        // Find the token owned by the user
        for (const result of results) {
          if (result.owner && (result.owner as string).toLowerCase() === userAddress.toLowerCase()) {
            foundToken = result.tokenId.toString();
            console.log('🎯 Found user NFT with token ID:', foundToken);
            break;
          }
        }
      }

      if (foundToken) {
        setNftTokenId(foundToken);
        
        // Get token URI
        try {
          console.log('🔍 Fetching token URI for token:', foundToken);
          const tokenURI = await publicClient.readContract({
            address: ticketNFTAddress as `0x${string}`,
            abi: eventTicketABI,
            functionName: 'tokenURI',
            args: [BigInt(foundToken)],
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
      } else {
        console.log('❌ No NFT found for user in range 1-' + maxTokens);
        setError('No NFT found in your wallet. Please try minting again.');
      }
    } catch (error) {
      console.error('❌ Error finding user NFT:', error);
      setError('Failed to load NFT data: ' + (error as Error).message);
    } finally {
      // Clear timeout
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
        loadingTimeoutRef.current = null;
      }
      hasTriedFindingNFT.current = false;
      setLoading(false);
    }
  }, [ticketNFTAddress, userAddress, nftBalance, publicClient, fetchMetadata]);

  // Function to manually refresh NFT data
  const refreshNFTData = useCallback(async () => {
    console.log('🔄 Manual refresh triggered');
    setLoading(true);
    setError(null);
    setMintSuccess(false);
    setIsAutoRefreshing(false); // Reset auto-refresh flag
    hasTriedFindingNFT.current = false; // Reset NFT search flag
    
    try {
      // First refetch the balance
      console.log('🔄 Refetching balance...');
      await refetchBalance();
      
      // Wait a bit for balance to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Then find the NFT
      console.log('🔄 Finding NFT...');
      await findUserNFT();
      
    } catch (error) {
      console.error('❌ Error during refresh:', error);
      setError('Failed to refresh NFT data');
    } finally {
      setLoading(false);
    }
  }, [refetchBalance, findUserNFT]);

  // Load NFT data when component mounts or dependencies change
  useEffect(() => {
    // Add a small delay to prevent rapid calls
    const timeoutId = setTimeout(() => {
      findUserNFT();
    }, 100);
    
    return () => clearTimeout(timeoutId);
  }, [findUserNFT]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, []);

  // Auto-refresh when we detect balance but no NFT details (for newly minted NFTs)
  useEffect(() => {
    const hasBalanceButNoDetails = nftBalance && Number(nftBalance) > 0 && (!nftTokenId || !nftMetadata);
    if (hasBalanceButNoDetails && !loading && !isAutoRefreshing) {
      console.log('🔄 Auto-refreshing for newly minted NFT...');
      setIsAutoRefreshing(true);
      const timeoutId = setTimeout(() => {
        refreshNFTData();
      }, 2000); // Increased delay to prevent rapid calls
      
      return () => clearTimeout(timeoutId);
    }
  }, [nftBalance, nftTokenId, nftMetadata, loading, isAutoRefreshing, refreshNFTData]);

  // Handle minting success
  useEffect(() => {
    if (isMintTxSuccess) {
      console.log('✅ NFT minting successful!');
      setMintSuccess(true);
      setIsMinting(false);
      setMintError(null);
      setNftCreated(true);
      // Refresh NFT data after successful minting
      setTimeout(() => {
        console.log('🔄 Refreshing NFT data after minting...');
        refreshNFTData();
      }, 2000); // Wait 2 seconds for blockchain to update
    }
  }, [isMintTxSuccess, refreshNFTData]);

  // Handle minting error
  useEffect(() => {
    if (mintHookError) {
      console.error('❌ Minting error:', mintHookError);
      let errorMessage = 'Failed to mint NFT';
      
      // Provide more specific error messages
      if (mintHookError.message) {
        if (mintHookError.message.includes('Internal JSON-RPC error')) {
          errorMessage = 'Contract error. This event may require organizer approval for minting.';
        } else if (mintHookError.message.includes('Approval-based: organizer must mint')) {
          errorMessage = 'This is an approval-based event. Only the organizer can mint tickets.';
        } else if (mintHookError.message.includes('reverted')) {
          errorMessage = 'Transaction failed. Please ensure you have the required permissions.';
        } else if (mintHookError.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds for transaction.';
        } else {
          errorMessage = mintHookError.message;
        }
      }
      
      setMintError(errorMessage);
      setIsMinting(false);
    }
  }, [mintHookError]);

  // Function to mint NFT for Free + Approval events
  const handleMintNFT = async () => {
    if (!mintTicket || !userAddress) {
      setMintError('Minting not available');
      return;
    }

    // Validate required data
    if (!eventContractAddress) {
      setMintError('Event contract address not available');
      return;
    }

    if (!event?.name) {
      setMintError('Event name not available');
      return;
    }

    try {
      setIsMinting(true);
      setMintError(null);
      setMintSuccess(false);

      // Create QR code data
      const qrPayload = {
        eventId: event.id || eventContractAddress,
        eventName: event.name,
        participantAddress: userAddress,
        participantName: 'Event Participant',
        approvalDate: new Date().toISOString(),
        type: 'event-ticket'
      };
      
      // Create QR code image URL
      const qrData = encodeURIComponent(JSON.stringify(qrPayload));
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}&format=png&margin=10`;
      
      console.log('📤 Uploading QR code image to IPFS...');
      // Upload QR code image to IPFS
      const qrImageUpload = await uploadImageToIPFS(qrImageUrl);
      console.log('✅ QR code image uploaded to IPFS:', qrImageUpload.url);
      
      // Create metadata for the NFT
      const metadata = {
        name: `${event.name} - Event Ticket`,
        description: `Official ticket for ${event.name} event`,
        image: qrImageUpload.url, // Use IPFS URL instead of direct QR server URL
        attributes: [
          { trait_type: "Event", value: event.name },
          { trait_type: "Type", value: "Event Ticket" },
          { trait_type: "Status", value: "Valid" },
          { trait_type: "Participant", value: userAddress }
        ]
      };

      console.log('📤 Uploading NFT metadata to IPFS...');
      // Upload metadata to IPFS
      const metadataUpload = await uploadJsonToIPFS(metadata);
      const metadataURI = metadataUpload.url;
      console.log('✅ NFT metadata uploaded to IPFS:', metadataURI);
      
      console.log('🎨 Minting free NFT ticket for user:', userAddress);
      console.log('📄 Metadata URI:', metadataURI);
      console.log('🎫 QR Code URL:', qrImageUpload.url);
      console.log('📋 Contract Address:', eventContractAddress);
      console.log('💰 Payment Amount: 0 wei (free event)');
      
      // Call the buyTicket function for free events (no payment required)
      mintTicket(metadataURI, BigInt(0)); // For free events, 0 wei payment
      
    } catch (error) {
      console.error('❌ Error preparing NFT mint:', error);
      setMintError(`Failed to prepare NFT minting: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsMinting(false);
    }
  };

  // Define fetchResaleInfo function before it's used
  const fetchResaleInfo = useCallback(async () => {
    if (!ticketNFTAddress || !nftTokenId) {
      return;
    }

    try {
      // Refetch resale info from smart contract
      await refetchResaleInfo();
    } catch (error) {
      console.error('Failed to fetch resale info:', error);
    }
  }, [ticketNFTAddress, nftTokenId, refetchResaleInfo]);

  // Handle resale transaction completion
  useEffect(() => {
    if (resaleTxReceipt && resaleTxReceipt.status === 'success') {
      console.log('✅ Resale transaction confirmed:', resaleTxReceipt);
      setResaleLoading(false);
      setShowResaleModal(false);
      setResalePrice('');
      // Refresh resale info
      fetchResaleInfo();
      alert('Resale operation completed successfully!');
    } else if (resaleTxReceipt && resaleTxReceipt.status === 'reverted') {
      console.error('❌ Resale transaction failed:', resaleTxReceipt);
      setResaleLoading(false);
      alert('Resale operation failed. Please try again.');
    }
  }, [resaleTxReceipt, fetchResaleInfo]);

  // Handle transfer transaction completion
  useEffect(() => {
    if (transferTxReceipt && transferTxReceipt.status === 'success') {
      console.log('✅ Transfer transaction confirmed:', transferTxReceipt);
      setTransferLoading(false);
      setShowResaleTransferModal(false);
      setTransferToAddress('');
      setTransferPrice('');
      // Refresh NFT data
      refreshNFTData();
      alert('NFT transferred successfully!');
    } else if (transferTxReceipt && transferTxReceipt.status === 'reverted') {
      console.error('❌ Transfer transaction failed:', transferTxReceipt);
      setTransferLoading(false);
      alert('Transfer failed. Please try again.');
    }
  }, [transferTxReceipt, refreshNFTData]);

  // Process contract resale info and update local state
  useEffect(() => {
    if (contractResaleInfo) {
      const [isListed, price, resalesDone, resalesRemaining] = contractResaleInfo as [boolean, bigint, number, number];
      
      setResaleInfo({
        isListed,
        price: formatEther(price),
        resalesDone,
        resalesRemaining
      });
      
      console.log('📊 Resale info from contract:', {
        isListed,
        price: formatEther(price),
        resalesDone,
        resalesRemaining
      });
    }
  }, [contractResaleInfo]);

  // Fetch resale info when NFT data is available (only for non-approval paid events)
  useEffect(() => {
    if (ticketNFTAddress && nftTokenId && !event?.approvalNeeded && event?.price && event.price > 0) {
      fetchResaleInfo();
    }
  }, [ticketNFTAddress, nftTokenId, event?.approvalNeeded, event?.price, fetchResaleInfo]);

  // Handle check-in transaction success
  useEffect(() => {
    if (isCheckInTxSuccess) {
      console.log('✅ Check-in successful!');
      setCheckInSuccess(true);
      setIsCheckingIn(false);
    }
  }, [isCheckInTxSuccess]);

  // Handle check-in function
  const handleCheckIn = () => {
    if (!checkIn || !nftTokenId) {
      console.error('Check-in function or token ID not available');
      return;
    }

    try {
      setIsCheckingIn(true);
      console.log('🎫 Checking in with token ID:', nftTokenId);
      checkIn(BigInt(nftTokenId));
    } catch (error) {
      console.error('Error during check-in:', error);
      setIsCheckingIn(false);
    }
  };

  // Resale functions
  const handleListForResale = async () => {
    if (!resalePrice || !ticketNFTAddress || !nftTokenId) {
      return;
    }

    const price = parseFloat(resalePrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    setResaleLoading(true);
    try {
      await writeResaleContract({
        address: ticketNFTAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'listForResale',
        args: [BigInt(nftTokenId), parseEther(resalePrice)],
      });
    } catch (error) {
      console.error('Resale listing failed:', error);
      alert('Failed to list for resale. Please try again.');
      setResaleLoading(false);
    }
  };

  const handleCancelResale = async () => {
    if (!ticketNFTAddress || !nftTokenId) {
      return;
    }

    setResaleLoading(true);
    try {
      await writeResaleContract({
        address: ticketNFTAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'cancelResale',
        args: [BigInt(nftTokenId)],
      });
    } catch (error) {
      console.error('Resale cancellation failed:', error);
      alert('Failed to cancel resale. Please try again.');
      setResaleLoading(false);
    }
  };

  // Transfer NFT to another wallet
  const handleTransferNFT = async () => {
    if (!ticketNFTAddress || !nftTokenId || !transferToAddress || !transferPrice) {
      alert('Please fill in all fields');
      return;
    }

    // Validate address
    if (!transferToAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert('Please enter a valid wallet address');
      return;
    }

    // Validate price
    const price = parseFloat(transferPrice);
    if (isNaN(price) || price <= 0) {
      alert('Please enter a valid price greater than 0');
      return;
    }

    setTransferLoading(true);
    try {
      // Use transferFrom function from ERC721
      await writeTransferContract({
        address: ticketNFTAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'transferFrom',
        args: [userAddress, transferToAddress as `0x${string}`, BigInt(nftTokenId)],
        value: parseEther(transferPrice), // Send payment with the transfer
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Failed to transfer NFT. Please try again.');
      setTransferLoading(false);
    }
  };

  // Check if today is the event date
  const isEventDate = useCallback(() => {
    if (!event?.date) return false;
    
    try {
      const eventDate = new Date(event.date);
      const today = new Date();
      
      // Set time to start of day for both dates to compare only dates
      const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      return eventDateOnly.getTime() === todayOnly.getTime();
    } catch (error) {
      console.error('Error checking event date:', error);
      return false;
    }
  }, [event?.date]);

  if (loading) {
    return (
      <div className="card p-4">
        <div className="text-center space-y-3">
          <div className="w-48 h-48 border-2 border-foreground/20 rounded-lg overflow-hidden bg-foreground/5 mx-auto flex items-center justify-center">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto"></div>
              <p className="text-xs text-foreground/60">Loading NFT...</p>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-foreground/70">
              Searching for your NFT ticket...
            </p>
            <button 
              onClick={refreshNFTData}
              className="btn-secondary text-xs px-3 py-1"
            >
              Force Refresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card p-4">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="font-medium text-red-600 dark:text-red-400">Error Loading NFT</p>
          <p className="text-sm text-foreground/70 mb-2">{error}</p>
          {error.includes('NFT search timed out') && (
            <p className="text-xs text-foreground/60">
              This usually means the NFT was recently minted. Try refreshing or check if the transaction completed.
            </p>
          )}
          {error.includes('Failed to fetch metadata') && (
            <p className="text-xs text-foreground/60">
              The NFT metadata couldn't be loaded from IPFS. The QR code image might not be available.
            </p>
          )}
          <div className="flex gap-2 justify-center">
            <button 
              onClick={refreshNFTData}
              className="btn-primary text-sm"
            >
              Retry
            </button>
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                findUserNFT();
              }}
              className="btn-secondary text-sm"
            >
              Force Search
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Check if this is a paid event that requires payment
  const isPaidEvent = event?.price && event.price > 0;
  const requiresApproval = event?.approvalNeeded;
  
  // Debug logging
  console.log('🎫 BlockchainNFTTicket render:', {
    eventName: event.name,
    isPaidEvent,
    requiresApproval,
    userAddress,
    eventContractAddress,
    ticketNFTAddress,
    nftBalance: nftBalance?.toString(),
    nftTokenId,
    hasMetadata: !!nftMetadata,
    loading,
    error,
    contractEventType: eventType
  });
  
  console.log('🔍 NFT Detection Debug:', {
    nftBalance: nftBalance?.toString(),
    nftTokenId,
    nftMetadata: !!nftMetadata,
    hasBalance: !!(nftBalance && Number(nftBalance) > 0),
    hasTokenId: !!nftTokenId,
    hasMetadata: !!nftMetadata,
    isPaidEvent,
    requiresApproval
  });
  
  const hasNoNFT = !nftBalance || Number(nftBalance) === 0 || !nftTokenId || !nftMetadata;

  if (hasNoNFT) {
    // For paid events with approval, show payment pending if no NFT found
    if (isPaidEvent && requiresApproval) {
      return (
        <div className="card p-4 text-center">
          <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
            </svg>
          </div>
          <p className="font-medium mb-2">Payment Pending</p>
          <p className="text-sm text-foreground/70 mb-4">
            Your registration has been approved. Please complete payment to receive your NFT ticket.
          </p>
          <div className="space-y-3">
            <div className="text-sm font-medium text-foreground">
              Amount: {event.price} {event.currency || 'ETH'}
            </div>
            <div className="flex gap-2 justify-center">
              <button 
                onClick={() => window.location.href = `/events/${event.id}/register?step=payment`}
                className="btn-primary text-sm"
              >
                Complete Payment
              </button>
              <button 
                onClick={findUserNFT}
                className="btn-secondary text-sm"
              >
                Check Status
              </button>
            </div>
          </div>
        </div>
      );
    }

    // For free events with approval, show mint NFT button OR the NFT if found
    if (!isPaidEvent && requiresApproval) {
      console.log('🔍 Free + Approval event detected');
      console.log('📊 NFT Status:', { nftTokenId, hasMetadata: !!nftMetadata, metadataName: nftMetadata?.name, nftBalance: nftBalance?.toString() });
      console.log('📋 Contract Event Type:', eventType);
      
      // Check if contract is configured as APPROVAL type (only organizer can mint)
      if (eventType === 2) { // 2 = APPROVAL in the enum
        return (
          <div className="card p-4 text-center">
            <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <p className="font-medium mb-2">Registration Approved!</p>
            <p className="text-sm text-foreground/70 mb-4">
              Your registration has been approved. The organizer will mint your NFT ticket.
            </p>
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">
                Event: {event.name}
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  ⏳ Waiting for organizer to mint your NFT ticket...
                </p>
              </div>
              <button 
                onClick={refreshNFTData}
                className="btn-secondary text-sm"
              >
                Check Status
              </button>
            </div>
          </div>
        );
      }
      
      // If we have NFT data, show the NFT instead of mint button
      if (nftTokenId && nftMetadata && nftMetadata.name) {
        console.log('✅ NFT found for Free + Approval event, showing NFT display');
        // Show the actual NFT display - this will be handled by the main return statement below
        // We'll let the component continue to the main NFT display section
      } else {
        console.log('❌ No NFT data found for Free + Approval event, showing mint button');
        // If we have a balance but no token ID/metadata, we might be in the process of detecting a newly minted NFT
        const hasBalanceButNoDetails = nftBalance && Number(nftBalance) > 0 && (!nftTokenId || !nftMetadata);
        
        return (
          <div className="card p-4 text-center">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-medium mb-2">Registration Approved!</p>
            <p className="text-sm text-foreground/70 mb-4">
              Your registration has been approved. You can now mint your free NFT ticket.
            </p>
            <div className="space-y-3">
              <div className="text-sm font-medium text-foreground">
                Event: {event.name}
              </div>
              
              {/* Show minting status */}
              {mintSuccess && (
                <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">
                    ✅ NFT minted successfully! Refreshing...
                  </p>
                </div>
              )}
              
              {/* Show detection in progress */}
              {(hasBalanceButNoDetails || nftCreated) && !mintSuccess && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    🔍 NFT detected but details are loading... Please wait or click "Check Status"
                  </p>
                </div>
              )}
              
              {mintError && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200">
                    ❌ {mintError}
                  </p>
                </div>
              )}
              
              <div className="flex gap-2 justify-center">
                <button 
                  onClick={handleMintNFT}
                  disabled={!!(isMinting || isMintPending || isMintTxLoading || mintSuccess || hasBalanceButNoDetails || nftCreated)}
                  className="btn-primary text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isMinting || isMintPending || isMintTxLoading ? (
                    <span className="flex items-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {isMintTxLoading ? 'Confirming...' : 'Minting...'}
                    </span>
                  ) : mintSuccess || hasBalanceButNoDetails || nftCreated ? (
                    'Minted!'
                  ) : (
                    'Mint NFT Ticket'
                  )}
                </button>
                <button 
                  onClick={refreshNFTData}
                  className="btn-secondary text-sm"
                >
                  Check Status
                </button>
              </div>
            </div>
          </div>
        );
      }
    }

    // For other cases, show the original "No NFT Ticket Found" message
    return (
      <div className="card p-4 text-center">
        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="font-medium mb-2">No NFT Ticket Found</p>
        <p className="text-sm text-foreground/70 mb-4">
          You don't have an NFT ticket for this event yet.
        </p>
        <button 
          onClick={findUserNFT}
          className="btn-primary text-sm"
        >
          Check Again
        </button>
      </div>
    );
  }

  return (
    <div className="card p-4">
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold">NFT Ticket</h3>
        </div>
        
        {/* QR Code */}
        <div className="flex justify-center">
          <div className="w-48 h-48 border-2 border-foreground/20 rounded-lg overflow-hidden bg-foreground/5">
            {nftMetadata.image ? (
              <img 
                src={nftMetadata.image.startsWith('ipfs://') 
                  ? `https://ipfs.io/ipfs/${nftMetadata.image.slice(7)}`
                  : nftMetadata.image
                } 
                alt="NFT QR Code" 
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto"></div>
                  <p className="text-xs text-foreground/60">Loading...</p>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Enhanced Ticket Details */}
        <div className="space-y-3">
          {/* Ticket Header */}
          <div className="text-center pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">NFT TICKET</span>
            </div>
          </div>
          
          {/* Event Details from NFT Metadata */}
          <div className="space-y-2 text-sm">
            {/* Show only relevant and non-duplicate attributes in logical order */}
            {nftMetadata.attributes
              .filter(attr => {
                // Filter out unwanted attributes
                const unwantedAttributes = [
                  'Event', // Already shown in title
                  'Commitment', // Too long and not user-friendly
                  'Event ID', // Internal ID, not useful for users
                  'QR Code', // Redundant
                  'Ticket Type' // Redundant with header
                ];
                return !unwantedAttributes.includes(attr.trait_type);
              })
              .sort((a, b) => {
                // Define preferred order for attributes
                const order = [
                  'Participant',
                  'Event Date', 
                  'Event Time',
                  'Location',
                  'Price Paid',
                  'Currency'
                ];
                
                const aIndex = order.indexOf(a.trait_type);
                const bIndex = order.indexOf(b.trait_type);
                
                // If both are in the order array, sort by their position
                if (aIndex !== -1 && bIndex !== -1) {
                  return aIndex - bIndex;
                }
                
                // If only one is in the order array, prioritize it
                if (aIndex !== -1) return -1;
                if (bIndex !== -1) return 1;
                
                // If neither is in the order array, maintain original order
                return 0;
              })
              .map((attr, index) => {
                // Format certain values for better display
                let displayValue = attr.value;
                
                // Truncate very long values
                if (displayValue.length > 50) {
                  displayValue = `${displayValue.slice(0, 47)}...`;
                }
                
                // Format price values
                if (attr.trait_type === 'Price Paid' && displayValue === '0') {
                  displayValue = 'Free';
                }
                
                return (
                  <div key={index} className="flex justify-between">
                    <span className="text-foreground/70">{attr.trait_type}:</span>
                    <span className="font-medium">{displayValue}</span>
                  </div>
                );
              })}
            
            <div className="flex justify-between">
              <span className="text-foreground/70">Token ID:</span>
              <span className="font-medium">#{nftTokenId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">Contract:</span>
              <span className="font-mono text-xs">
                {ticketNFTAddress ? `${(ticketNFTAddress as string).slice(0, 6)}...${(ticketNFTAddress as string).slice(-4)}` : 'N/A'}
              </span>
            </div>
          </div>
          
          {/* Check-In Section - Only available on event date */}
          {!checkInSuccess ? (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              {isEventDate() ? (
                <div className="space-y-2">
                  <button
                    onClick={handleCheckIn}
                    disabled={isCheckingIn || isCheckInPending || isCheckInTxLoading || !checkIn}
                    className="w-full btn-primary flex items-center justify-center gap-2"
                  >
                    {(isCheckingIn || isCheckInPending || isCheckInTxLoading) ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>Checking In...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Check In to Event</span>
                      </>
                    )}
                  </button>
                  {checkInError && (
                    <p className="text-xs text-red-500 text-center mt-2">
                      Check-in failed. Please try again.
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                      Check-in available on event date
                    </span>
                  </div>
                  <p className="text-xs text-foreground/60">
                    Event Date: {event?.date ? new Date(event.date).toLocaleDateString() : 'TBD'}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-100 dark:bg-green-900/30 rounded-full">
                  <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">Checked In Successfully!</span>
                </div>
                <p className="text-xs text-foreground/50">
                  Welcome to the event! Your ticket has been validated.
                </p>
              </div>
            </div>
          )}
          
          {/* Resale Actions - Only for NON-APPROVAL PAID events */}
          {ticketNFTAddress && !event?.approvalNeeded && event?.price && event.price > 0 && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="space-y-2">
                {resaleInfoLoading ? (
                  <div className="flex-1 text-center text-sm text-foreground/60 py-2 px-3 bg-foreground/5 rounded-lg">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                      Loading resale info...
                    </div>
                  </div>
                ) : resaleInfo ? (
                  resaleInfo.isListed ? (
                    <div className="space-y-2">
                      <div className="flex-1 text-center text-sm text-green-600 dark:text-green-400 py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                        Listed for {resaleInfo.price} SONIC
                      </div>
                      <button
                        onClick={handleCancelResale}
                        disabled={resaleLoading}
                        className="w-full btn-secondary text-sm"
                        title="Cancel resale listing"
                      >
                        {resaleLoading ? '...' : 'Cancel Resale'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowResaleModal(true)}
                        className="w-full btn-secondary text-sm"
                        title="List this NFT for resale"
                        disabled={resaleInfo.resalesRemaining === 0}
                      >
                        {resaleInfo.resalesRemaining === 0 ? 'Max Resales Reached' : 'List for Resale'}
                      </button>
                      <button
                        onClick={() => setShowResaleTransferModal(true)}
                        className="w-full btn-primary text-sm"
                        title="Transfer NFT to another wallet"
                      >
                        Resale Transfer
                      </button>
                    </div>
                  )
                ) : (
                  <div className="flex-1 text-center text-sm text-foreground/60 py-2 px-3 bg-foreground/5 rounded-lg">
                    No resale data available
                  </div>
                )}
              </div>
            </div>
          )}
          
          
          {/* Message for APPROVAL events */}
          {ticketNFTAddress && event?.approvalNeeded && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex-1 text-center text-sm text-foreground/60 py-2 px-3 bg-foreground/5 rounded-lg">
                <div className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* Ticket Footer */}
          <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-foreground/50 text-center">
              Valid blockchain-verified event ticket • Show QR code at event entrance
            </p>
          </div>
        </div>
      </div>
      
      {/* Resale Modal - Only for NON-APPROVAL PAID events */}
      {showResaleModal && !event?.approvalNeeded && event?.price && event.price > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">List for Resale</h3>
              <button
                onClick={() => {
                  setShowResaleModal(false);
                  setResalePrice('');
                }}
                className="text-foreground/60 hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Resale Price (SONIC)
                </label>
                <input
                  type="number"
                  value={resalePrice}
                  onChange={(e) => setResalePrice(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              
              {resaleInfo && (
                <div className="text-xs text-foreground/60 space-y-1">
                  <div className="flex justify-between">
                    <span>Resales Done:</span>
                    <span className="font-mono">{resaleInfo.resalesDone || 0}/3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resales Remaining:</span>
                    <span className="font-mono">{resaleInfo.resalesRemaining || 0}</span>
                  </div>
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResaleModal(false);
                    setResalePrice('');
                  }}
                  className="btn-secondary flex-1"
                  disabled={resaleLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleListForResale}
                  disabled={!resalePrice || resaleLoading}
                  className="btn-primary flex-1"
                >
                  {resaleLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Listing...
                    </div>
                  ) : (
                    'List for Resale'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Resale Transfer Modal */}
      {showResaleTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Transfer NFT</h3>
              <button
                onClick={() => {
                  setShowResaleTransferModal(false);
                  setTransferToAddress('');
                  setTransferPrice('');
                }}
                className="text-foreground/60 hover:text-foreground"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  To Wallet Address
                </label>
                <input
                  type="text"
                  value={transferToAddress}
                  onChange={(e) => setTransferToAddress(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Enter the recipient's wallet address
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Transfer Price (SONIC)
                </label>
                <input
                  type="number"
                  value={transferPrice}
                  onChange={(e) => setTransferPrice(e.target.value)}
                  placeholder="0.0"
                  step="0.01"
                  min="0"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Amount to send with the NFT transfer
                </p>
              </div>

              {transferError && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                  Transfer failed: {transferError.message || 'Unknown error'}
                </div>
              )}
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowResaleTransferModal(false);
                    setTransferToAddress('');
                    setTransferPrice('');
                  }}
                  className="btn-secondary flex-1"
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferNFT}
                  disabled={!transferToAddress || !transferPrice || transferLoading}
                  className="btn-primary flex-1"
                >
                  {transferLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Transferring...
                    </div>
                  ) : (
                    'Transfer NFT'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}