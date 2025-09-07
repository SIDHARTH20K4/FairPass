"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useReadContract, useWriteContract, usePublicClient, useWaitForTransactionReceipt } from 'wagmi';
import { eventTicketABI } from '../../web3/constants';
import { createEventHooks } from '../../web3/implementationConnections';
import { parseEther, formatEther } from 'viem';

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

  // Resale functionality
  const { writeContract: writeResaleContract, data: resaleTxHash, error: resaleError, isPending: resalePending } = useWriteContract();
  const { data: resaleTxReceipt, isLoading: resaleTxLoading } = useWaitForTransactionReceipt({
    hash: resaleTxHash,
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
  const { data: nftBalance } = useReadContract({
    address: ticketNFTAddress as `0x${string}`,
    abi: eventTicketABI,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
    query: {
      enabled: !!(ticketNFTAddress && userAddress),
    },
  });

  // Function to fetch NFT metadata from IPFS
  const fetchMetadata = useCallback(async (tokenURI: string): Promise<NFTMetadata | null> => {
    try {
      // Handle IPFS URLs
      const url = tokenURI.startsWith('ipfs://') 
        ? `https://ipfs.io/ipfs/${tokenURI.slice(7)}`
        : tokenURI;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch metadata: ${response.statusText}`);
      }
      
      const metadata = await response.json();
      return metadata;
    } catch (error) {
      console.error('Error fetching NFT metadata:', error);
      return null;
    }
  }, []);

  // Function to find user's NFT token using blockchain client
  const findUserNFT = useCallback(async () => {
    if (!ticketNFTAddress || !userAddress || !nftBalance || Number(nftBalance) === 0 || !publicClient) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Try to find the token by checking ownership of recent token IDs
      // This assumes token IDs are sequential starting from 1
      let foundToken = null;
      
      for (let tokenId = 1; tokenId <= 100; tokenId++) { // Check first 100 tokens
        try {
          const owner = await publicClient.readContract({
            address: ticketNFTAddress as `0x${string}`,
            abi: eventTicketABI,
            functionName: 'ownerOf',
            args: [BigInt(tokenId)],
          });

          if (owner.toLowerCase() === userAddress.toLowerCase()) {
            foundToken = tokenId.toString();
            break;
          }
        } catch (error) {
          // Token doesn't exist or other error, continue
          continue;
        }
      }

      if (foundToken) {
        setNftTokenId(foundToken);
        
        // Get token URI
        try {
          const tokenURI = await publicClient.readContract({
            address: ticketNFTAddress as `0x${string}`,
            abi: eventTicketABI,
            functionName: 'tokenURI',
            args: [BigInt(foundToken)],
          });

          const metadata = await fetchMetadata(tokenURI as string);
          if (metadata) {
            setNftMetadata(metadata);
          }
        } catch (error) {
          console.error('Error getting token URI:', error);
        }
      }
    } catch (error) {
      console.error('Error finding user NFT:', error);
      setError('Failed to load NFT data');
    } finally {
      setLoading(false);
    }
  }, [ticketNFTAddress, userAddress, nftBalance, publicClient, fetchMetadata]);

  // Load NFT data when component mounts or dependencies change
  useEffect(() => {
    findUserNFT();
  }, [findUserNFT]);

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
          <p className="text-sm text-foreground/70">{error}</p>
          <button 
            onClick={findUserNFT}
            className="btn-secondary text-sm"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if this is a paid event that requires payment
  const isPaidEvent = event?.price && event.price > 0;
  const requiresApproval = event?.approvalNeeded;
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
                {ticketNFTAddress?.slice(0, 6)}...{ticketNFTAddress?.slice(-4)}
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
                    <button
                      onClick={() => setShowResaleModal(true)}
                      className="w-full btn-secondary text-sm"
                      title="List this NFT for resale"
                      disabled={resaleInfo.resalesRemaining === 0}
                    >
                      {resaleInfo.resalesRemaining === 0 ? 'Max Resales Reached' : 'List for Resale'}
                    </button>
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
    </div>
  );
}
