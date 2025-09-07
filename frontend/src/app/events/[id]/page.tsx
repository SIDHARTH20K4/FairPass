"use client";

import RegisterButton from "@/components/RegisterButton";
import Link from "next/link";
import Image from "next/image";
import { apiGetEvent } from "@/lib/api";
import Markdown from "@/components/Markdown";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { eventTicketABI } from "../../../../web3/constants";
import NFTDisplay from "@/components/tickets/NFTDisplay";
import Toast from "@/components/Toast";
import BlockchainNFTTicket from "@/components/BlockchainNFTTicket";
import { createUserQR } from "@/Services/Semaphore";

// Removed localStorage - using backend database only

type Submission = {
  id?: string; // Backend submission ID
  values: Record<string, string>;
  at: number;
  status: "pending" | "approved";
  address?: string;
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature?: string;
  // NFT fields
  nftContractAddress?: string;
  nftTokenId?: string;
  nftMetadataURI?: string;
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { address } = useAccount();
  
  // Event state
  const [event, setEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(true);
  
  // Registration state
  const [myStatus, setMyStatus] = useState<Submission["status"] | null>(null);
  const [mySub, setMySub] = useState<Submission | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);
  
  // NFT state
  const [nftData, setNftData] = useState<{
    contractAddress?: string;
    tokenId?: string;
    metadataURI?: string;
    qrImageUrl?: string;
  } | null>(null);
  const [nftLoading, setNftLoading] = useState(false);
  
  // Transfer modal state
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferLoading, setTransferLoading] = useState(false);
  
  // Resale modal state
  const [showResaleModal, setShowResaleModal] = useState(false);
  const [resalePrice, setResalePrice] = useState('');
  const [resaleLoading, setResaleLoading] = useState(false);
  const [resaleInfo, setResaleInfo] = useState<{
    isListed: boolean;
    price: string;
    resalesDone: number;
    resalesRemaining: number;
  } | null>(null);

  // Wagmi hooks for resale functionality
  const { writeContract: writeResaleContract, data: resaleTxHash, error: resaleError, isPending: resalePending } = useWriteContract();
  const { data: resaleTxReceipt, isLoading: resaleTxLoading } = useWaitForTransactionReceipt({
    hash: resaleTxHash,
  });

  // Wagmi hooks for transfer functionality
  const { writeContract: writeTransferContract, data: transferTxHash, error: transferError, isPending: transferPending } = useWriteContract();
  const { data: transferTxReceipt, isLoading: transferTxLoading } = useWaitForTransactionReceipt({
    hash: transferTxHash,
  });

  // Read resale info from smart contract (only for non-approval events)
  const { data: contractResaleInfo, refetch: refetchResaleInfo, isLoading: resaleInfoLoading } = useReadContract({
    address: event?.blockchainEventAddress as `0x${string}`,
    abi: eventTicketABI,
    functionName: 'getResaleInfo',
    args: mySub?.nftTokenId ? [BigInt(mySub.nftTokenId)] : undefined,
    query: {
      enabled: !!(event?.blockchainEventAddress && mySub?.nftTokenId && !event?.approvalNeeded && event?.price && event.price > 0),
    },
  });

  // Transfer NFT function
  const handleTransferNFT = async () => {
    if (!transferRecipient || !event?.blockchainEventAddress || !mySub?.nftTokenId) {
      return;
    }

    // Validate address format
    if (transferRecipient.length !== 42 || !transferRecipient.startsWith('0x')) {
      alert('Please enter a valid Ethereum address (0x...)');
      return;
    }

    setTransferLoading(true);
    try {
      // Call the smart contract transferFrom function
      await writeTransferContract({
        address: event.blockchainEventAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'transferFrom',
        args: [address as `0x${string}`, transferRecipient as `0x${string}`, BigInt(mySub.nftTokenId)],
      });
    } catch (error) {
      console.error('Transfer failed:', error);
      alert('Transfer failed. Please try again.');
      setTransferLoading(false);
    }
  };

  // Resale functions
  const handleListForResale = async () => {
    if (!resalePrice || !event?.blockchainEventAddress || !mySub?.nftTokenId) {
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
        address: event.blockchainEventAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'listForResale',
        args: [BigInt(mySub.nftTokenId), parseEther(resalePrice)],
      });
    } catch (error) {
      console.error('Resale listing failed:', error);
      alert('Failed to list for resale. Please try again.');
      setResaleLoading(false);
    }
  };

  const handleCancelResale = async () => {
    if (!event?.blockchainEventAddress || !mySub?.nftTokenId) {
      return;
    }

    setResaleLoading(true);
    try {
      await writeResaleContract({
        address: event.blockchainEventAddress as `0x${string}`,
        abi: eventTicketABI,
        functionName: 'cancelResale',
        args: [BigInt(mySub.nftTokenId)],
      });
    } catch (error) {
      console.error('Resale cancellation failed:', error);
      alert('Failed to cancel resale. Please try again.');
      setResaleLoading(false);
    }
  };

  const fetchResaleInfo = useCallback(async () => {
    if (!event?.blockchainEventAddress || !mySub?.nftTokenId) {
      return;
    }

    try {
      // Refetch resale info from smart contract
      await refetchResaleInfo();
    } catch (error) {
      console.error('Failed to fetch resale info:', error);
    }
  }, [event?.blockchainEventAddress, mySub?.nftTokenId, refetchResaleInfo]);

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        console.log('🔍 Loading event for detail page:', id);
        const eventData = await apiGetEvent(id);
        console.log('✅ Event loaded for detail page:', eventData);
        setEvent(eventData);
      } catch (error) {
        console.error('❌ Failed to load event for detail page:', error);
      } finally {
        setEventLoading(false);
      }
    }
    
    loadEvent();
  }, [id]);

  // Function to check registration status from backend
  const checkRegistrationStatus = useCallback(async () => {
    if (!address || !mySub) return;
    
    try {
      const response = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        
        // Update local state with backend data
        const updatedSubmission = {
          ...mySub,
          status: data.status,
          qrUrl: data.qrUrl,
          qrCid: data.qrCid,
          jsonUrl: data.jsonUrl,
          jsonCid: data.jsonCid
        };
        
        // Check if status changed
        const statusChanged = myStatus !== data.status;
        
        setMySub(updatedSubmission);
        setMyStatus(data.status);
        
        // No localStorage needed - data is stored in backend
        
        setLastChecked(new Date());
        
        // Show notification if status changed
        if (statusChanged) {
          if (data.status === 'approved') {
            setToast({ 
              message: '🎉 Your registration has been approved! You can now attend the event.', 
              type: 'success' 
            });
          } else if (data.status === 'rejected') {
            setToast({ 
              message: '❌ Your registration has been rejected. Please contact the event host for more information.', 
              type: 'error' 
            });
          }
        }
      }
    } catch (error) {
      console.error('Failed to check registration status:', error);
    }
  }, [address, id, mySub]);

  // Load registration status from backend on mount
  useEffect(() => {
    async function loadRegistrationStatus() {
      if (!address) {
        console.log('ℹ️ No wallet address, clearing registration status');
        setMyStatus(null);
        setMySub(null);
        return;
      }

      try {
        console.log('🔍 Checking registration status for detail page:', { address: address.toLowerCase(), eventId: id });
        const response = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
        console.log('📡 Registration check response for detail page:', { status: response.status, ok: response.ok });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Found existing registration for detail page:', data);
          console.log('🔍 Registration data details:', {
            id: data.id,
            status: data.status,
            qrUrl: data.qrUrl,
            qrCid: data.qrCid,
            values: data.values,
            address: data.address,
            nftContractAddress: data.nftContractAddress,
            nftTokenId: data.nftTokenId,
            nftMetadataURI: data.nftMetadataURI
          });
          
          const submission: Submission = {
            id: data.id,
            values: data.values,
            at: new Date(data.createdAt).getTime(),
            status: data.status,
            address: data.address,
            qrCid: data.qrCid,
            qrUrl: data.qrUrl,
            jsonCid: data.jsonCid,
            jsonUrl: data.jsonUrl,
            signature: data.signature,
            // NFT fields
            nftContractAddress: data.nftContractAddress,
            nftTokenId: data.nftTokenId,
            nftMetadataURI: data.nftMetadataURI,
          };
          setMyStatus(data.status);
          setMySub(submission);
          console.log('✅ Registration status set for detail page:', { 
            status: data.status, 
            hasQrUrl: !!data.qrUrl,
            submission: submission
          });
        } else {
          console.log('ℹ️ No existing registration found for detail page (status:', response.status, ')');
          setMyStatus(null);
          setMySub(null);
        }
      } catch (error) {
        console.error('❌ Error checking registration status for detail page:', error);
        setMyStatus(null);
        setMySub(null);
      }
    }

    loadRegistrationStatus();
  }, [id, address]);

  // Auto-check status every 15 seconds for pending registrations
  useEffect(() => {
    if (myStatus === 'pending' && address) {
      const interval = setInterval(checkRegistrationStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [myStatus, address, checkRegistrationStatus]);

  // Function to regenerate QR data for existing approved registrations
  const regenerateQRData = async () => {
    if (!mySub || !address) return;
    
    try {
      console.log('🔄 Regenerating QR data for existing registration...');
      
      // Generate Semaphore identity for this event
      const semaphoreData = createUserQR(id);
      const commitment = semaphoreData.commitment;
      
      // Generate QR data
      const qrData = encodeURIComponent(JSON.stringify({ eventId: id, commitment }));
      const qrUrlData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
      console.log('📱 Generated QR data:', { eventId: id, commitment });
      console.log('🔗 QR URL:', qrUrlData);
      
      // Test the QR URL before uploading to IPFS
      try {
        console.log('🧪 Testing QR URL before IPFS upload...');
        const testResponse = await fetch(qrUrlData);
        console.log('🔍 QR URL test response:', { 
          status: testResponse.status, 
          ok: testResponse.ok, 
          contentType: testResponse.headers.get('content-type') 
        });
        
        if (!testResponse.ok) {
          throw new Error(`QR URL test failed: ${testResponse.status}`);
        }
        
        const qrBlob = await testResponse.blob();
        console.log('✅ QR URL test successful, blob size:', qrBlob.size, 'type:', qrBlob.type);
      } catch (error) {
        console.error('❌ QR URL test failed:', error);
        throw new Error(`QR generation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      // Upload QR to IPFS
      const { uploadImageToIPFS, uploadJsonToIPFS } = await import('@/lib/ipfs');
      const qrUpload = await uploadImageToIPFS(qrUrlData);
      const jsonUpload = await uploadJsonToIPFS({ eventId: id, commitment });
      
      console.log('✅ QR uploaded to IPFS:', { qrUrl: qrUpload.url, qrCid: qrUpload.cid });
      
      // Update the registration with QR data
      const updateResponse = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/${mySub.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'approved',
          qrUrl: qrUpload.url,
          qrCid: qrUpload.cid,
          jsonUrl: jsonUpload.url,
          jsonCid: jsonUpload.cid
        })
      });
      
      if (updateResponse.ok) {
        console.log('✅ QR data updated successfully');
        // Reload registration status
        const response = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
        if (response.ok) {
          const data = await response.json();
          const submission: Submission = {
            id: data.id,
            values: data.values,
            at: new Date(data.createdAt).getTime(),
            status: data.status,
            address: data.address,
            qrCid: data.qrCid,
            qrUrl: data.qrUrl,
            jsonCid: data.jsonCid,
            jsonUrl: data.jsonUrl,
            signature: data.signature,
          };
          setMyStatus(data.status);
          setMySub(submission);
          console.log('✅ Registration status reloaded after QR update:', { 
            status: data.status, 
            hasQrUrl: !!data.qrUrl 
          });
        }
      } else {
        console.error('❌ Failed to update QR data:', await updateResponse.text());
      }
    } catch (error) {
      console.error('❌ Error regenerating QR data:', error);
    }
  };

  // Function to fetch NFT data for published events
  const fetchNFTData = useCallback(async () => {
    if (!event?.blockchainEventAddress || !mySub || myStatus !== 'approved') {
      return;
    }

    try {
      setNftLoading(true);
      console.log('🔍 Fetching NFT data for published event...');
      
      // For now, we'll simulate NFT data since we don't have a direct way to fetch it
      // In a real implementation, you would query the blockchain for the user's NFTs
      // or store NFT data in the backend when minting
      
      // Check if we have NFT data stored in the registration
      if (mySub.nftContractAddress && mySub.nftTokenId) {
        setNftData({
          contractAddress: mySub.nftContractAddress,
          tokenId: mySub.nftTokenId,
          metadataURI: mySub.nftMetadataURI,
          qrImageUrl: mySub.qrUrl
        });
        console.log('✅ NFT data found in registration:', {
          contractAddress: mySub.nftContractAddress,
          tokenId: mySub.nftTokenId
        });
      } else {
        // For published events, we can try to fetch NFT data from the blockchain
        // This would require implementing a function to query user's NFTs
        console.log('ℹ️ No NFT data found in registration, would need to query blockchain');
      }
    } catch (error) {
      console.error('❌ Failed to fetch NFT data:', error);
    } finally {
      setNftLoading(false);
    }
  }, [event?.blockchainEventAddress, mySub, myStatus]);

  // Fetch NFT data when conditions are met
  useEffect(() => {
    if (event?.blockchainEventAddress && mySub && myStatus === 'approved') {
      console.log('🔍 Conditions met for NFT data fetch:', {
        hasBlockchainAddress: !!event?.blockchainEventAddress,
        hasMySub: !!mySub,
        status: myStatus,
        nftContractAddress: mySub?.nftContractAddress,
        nftTokenId: mySub?.nftTokenId
      });
      fetchNFTData();
    }
  }, [event?.blockchainEventAddress, mySub, myStatus, fetchNFTData]);

  // Preload QR image for faster display
  useEffect(() => {
    if (mySub?.qrUrl) {
      console.log('🚀 Preloading QR image for faster display...');
      const preloadImage = new window.Image();
      preloadImage.src = mySub.qrUrl;
      preloadImage.onload = () => {
        console.log('✅ QR image preloaded successfully');
      };
      preloadImage.onerror = () => {
        console.warn('⚠️ QR image preload failed');
      };
    }
  }, [mySub?.qrUrl]);

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
      setShowTransferModal(false);
      setTransferRecipient('');
      alert(`NFT transferred successfully to ${transferRecipient}!`);
    } else if (transferTxReceipt && transferTxReceipt.status === 'reverted') {
      console.error('❌ Transfer transaction failed:', transferTxReceipt);
      setTransferLoading(false);
      alert('Transfer failed. Please try again.');
    }
  }, [transferTxReceipt, transferRecipient]);

  // Handle transfer errors
  useEffect(() => {
    if (transferError) {
      console.error('❌ Transfer error:', transferError);
      setTransferLoading(false);
      alert(`Transfer failed: ${transferError.message || 'Unknown error'}`);
    }
  }, [transferError]);

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
    if (event?.blockchainEventAddress && mySub?.nftTokenId && !event?.approvalNeeded && event?.price && event.price > 0) {
      fetchResaleInfo();
    }
  }, [event?.blockchainEventAddress, mySub?.nftTokenId, event?.approvalNeeded, event?.price, fetchResaleInfo]);

  // Early return for loading states (after all hooks)
  if (eventLoading) {
  return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading event...</p>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  const isHost = event?.hostAddress && event.hostAddress === address?.toLowerCase();

  return (
    <main className="min-h-screen">
      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      {/* Hero Banner Section */}
      {event.bannerUrl && (
        <section className="relative h-96 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10"></div>
          <img 
            src={event.bannerUrl} 
            alt={`${event.name} banner`} 
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 z-20 p-8">
            <div className="mx-auto max-w-6xl">
              <Link 
                href="/events" 
                className="inline-flex items-center gap-2 text-foreground/80 hover:text-foreground transition-colors mb-4 group"
              >
                <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back to Events
            </Link>
              
              <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 drop-shadow-lg">
                {event.name}
              </h1>
              
              <div className="flex flex-wrap items-center gap-4 text-foreground/90">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.009-5.824-2.562M15 9.75a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium">{event.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium">{event.date}</span>
                </div>
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium">{event.time}</span>
                </div>
        </div>
      </div>
            </div>
        </section>
      )}

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Event Details */}
            <div className="card p-8 fade-in">
              <div className="flex items-start justify-between mb-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium glass border ${
                      event.isPaid ? 'border-foreground/20 text-foreground' : 'border-foreground/10 text-foreground/70'
                    }`}>
                      {event.isPaid ? `${event.price || 0} ${event.currency || 'SONIC'} Tokens` : 'Free Event'}
                    </span>
                    {event.approvalNeeded && (
                      <span className="px-3 py-1 rounded-full text-sm font-medium glass border border-foreground/10 text-foreground/70">
                        Approval Required
                </span>
              )}
            </div>
                  
                  {myStatus && (
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium glass border ${
                        myStatus === "approved" 
                          ? 'border-success/20 text-success' 
                          : 'border-warning/20 text-warning'
                      }`}>
                        {myStatus === "approved" ? "✓ Approved" : "⏳ Pending Approval"}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Host Actions */}
                {isHost && (
                  <div className="flex items-center gap-3">
                    {event.approvalNeeded && (
                      <Link 
                        href={`/events/${id}/review`} 
                        className="btn-secondary text-sm px-4 py-2"
                      >
                        Review Registrations
                      </Link>
                    )}
                    <Link 
                      href={`/events/${id}/edit`} 
                      className="btn-primary text-sm px-4 py-2"
                    >
                      Edit Event
                    </Link>
                </div>
            )}
              </div>

              {/* Event Description */}
          {event.eventDescription && (
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold text-foreground">About This Event</h2>
                  <div className="prose prose-foreground max-w-none">
              <Markdown content={event.eventDescription} />
                  </div>
                </div>
          )}

              {/* Organization Info */}
          {(event.organization || event.organizationDescription) && (
                <div className="space-y-4 pt-6 border-t border-foreground/10">
                  <h2 className="text-2xl font-semibold text-foreground">Host Organization</h2>
              {event.organization && (
                    <h3 className="text-lg font-medium text-foreground">{event.organization}</h3>
              )}
              {event.organizationDescription && (
                    <p className="text-foreground/70 leading-relaxed whitespace-pre-wrap">
                  {event.organizationDescription}
                </p>
              )}
                </div>
          )}
            </div>

            {/* Location Map */}
          {(event.lat && event.lng) && (
              <div className="card p-8 fade-in">
                <h2 className="text-2xl font-semibold text-foreground mb-6">Location</h2>
                <div className="rounded-xl overflow-hidden border border-foreground/10">
                  <iframe 
                    title="Event location map" 
                    width="100%" 
                    height="400" 
                    loading="lazy" 
                    referrerPolicy="no-referrer-when-downgrade" 
                    src={`https://www.google.com/maps?q=${encodeURIComponent(String(event.lat)+","+String(event.lng))}&output=embed`} 
                  />
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Registration & QR */}
          <div className="space-y-6">
            {/* Registration Status */}
            <div className="card p-6 fade-in">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-foreground">Registration Status</h3>
                {myStatus && (
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={checkRegistrationStatus}
                        className="text-xs text-primary hover:underline"
                        title="Check for status updates"
                      >
                        Refresh
                      </button>
                    {lastChecked && (
                      <span className="text-xs text-foreground/50">
                        {lastChecked.toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                )}
              </div>
              
              {myStatus ? (
                <div className="space-y-4">
                  {(() => {
                    console.log('🔍 Rendering registration status:', { 
                      myStatus, 
                      hasQrUrl: !!mySub?.qrUrl, 
                      mySub: mySub 
                    });
                    return null;
                  })()}
                  {myStatus === "approved" ? (
                    <div className="space-y-4">
                      {/* Simple Status */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="font-medium">Registration Approved</span>
                        </div>
                      </div>
                      
                      {/* Blockchain-based NFT Ticket Display */}
                      {event?.blockchainEventAddress && address ? (
                        <BlockchainNFTTicket 
                          eventContractAddress={event.blockchainEventAddress} 
                          userAddress={address}
                          event={event}
                        />
                      ) : (
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
                                {mySub.qrUrl ? (
                                  <img 
                                    src={mySub.qrUrl} 
                                    alt="Event QR Code" 
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
                            
                            {/* Quick Info */}
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
                              
                              {/* Enhanced Event Details */}
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Event:</span>
                                  <span className="font-medium">{event.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Date:</span>
                                  <span className="font-medium">{event.date}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Time:</span>
                                  <span className="font-medium">{event.time}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Location:</span>
                                  <span className="font-medium">{event.location}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Participant:</span>
                                  <span className="font-medium">{mySub.values.name || 'Anonymous'}</span>
                                </div>
                                {event.isPaid && event.price && (
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Price Paid:</span>
                                    <span className="font-medium text-green-600">{event.price} {event.currency || 'SONIC'}</span>
                                  </div>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-foreground/70">Status:</span>
                                  <span className="text-green-600 dark:text-green-400 font-medium">✓ Approved</span>
                                </div>
                                {mySub.nftTokenId && mySub.nftTokenId !== 'pending' && mySub.nftTokenId !== 'qr-generated' && (
                                  <div className="flex justify-between">
                                    <span className="text-foreground/70">Token ID:</span>
                                    <span className="font-mono text-sm">#{mySub.nftTokenId}</span>
                                  </div>
                                )}
                              {event.blockchainEventAddress && (
                                <div className="flex justify-between items-center">
                                  <span className="text-foreground/70">Contract:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-foreground/80">
                                      {event.blockchainEventAddress.slice(0, 6)}...{event.blockchainEventAddress.slice(-4)}
                        </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(event.blockchainEventAddress!);
                                        // You could add a toast notification here
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      title="Copy contract address"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                      </div>
                      
                            {/* Action Buttons */}
                            <div className="space-y-2">
                              {/* Primary Actions */}
                              <div className="flex gap-2">
                                {event.blockchainEventAddress && (
                                  <>
                                    <a
                                      href={`https://testnet.soniclabs.com/address/${event.blockchainEventAddress}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-primary flex-1 text-sm"
                                    >
                                      View NFT
                                    </a>
                                    <button
                                      onClick={() => setShowTransferModal(true)}
                                      className="btn-secondary flex-1 text-sm"
                                      title="Transfer this NFT to another address"
                                    >
                                      Transfer NFT
                                    </button>
                                  </>
                                )}
                              </div>
                              
                              {/* Resale Actions - Only for NON-APPROVAL PAID events */}
                              {event.blockchainEventAddress && !event.approvalNeeded && event.price && event.price > 0 && (
                                <div className="flex gap-2">
                                  {resaleInfoLoading ? (
                                    <div className="flex-1 text-center text-sm text-foreground/60 py-2 px-3 bg-foreground/5 rounded-lg">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin"></div>
                                        Loading resale info...
                                      </div>
                                    </div>
                                  ) : resaleInfo ? (
                                    resaleInfo.isListed ? (
                                      <>
                                        <div className="flex-1 text-center text-sm text-green-600 dark:text-green-400 py-2 px-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                          Listed for {resaleInfo.price} SONIC
                                        </div>
                                        <button
                                          onClick={handleCancelResale}
                                          disabled={resaleLoading}
                                          className="btn-secondary text-sm px-3"
                                          title="Cancel resale listing"
                                        >
                                          {resaleLoading ? '...' : 'Cancel'}
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        onClick={() => setShowResaleModal(true)}
                                        className="btn-secondary w-full text-sm"
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
                              )}
                              
                              
                              {/* Message for APPROVAL events */}
                              {event.blockchainEventAddress && event.approvalNeeded && (
                                <div className="flex-1 text-center text-sm text-foreground/60 py-2 px-3 bg-foreground/5 rounded-lg">
                                  <div className="flex items-center justify-center gap-2">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                    </svg>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Simple QR Ticket for Unpublished Events */
                        <div className="card p-4">
                          <div className="text-center space-y-3">
                            <h3 className="text-lg font-semibold">Event Ticket</h3>
                            
                            {/* QR Code */}
                            <div className="flex justify-center">
                              <div className="w-48 h-48 border-2 border-foreground/20 rounded-lg overflow-hidden bg-foreground/5">
                                {mySub.qrUrl ? (
                                  <img 
                                    src={mySub.qrUrl} 
                                    alt="Event QR Code" 
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
                            
                            {/* Quick Info */}
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-foreground/70">Event:</span>
                                <span className="font-medium">{event.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-foreground/70">Participant:</span>
                                <span className="font-medium">{mySub.values.name || 'Anonymous'}</span>
                              </div>
                              {event.blockchainEventAddress && (
                                <div className="flex justify-between items-center">
                                  <span className="text-foreground/70">Contract:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs text-foreground/80">
                                      {event.blockchainEventAddress.slice(0, 6)}...{event.blockchainEventAddress.slice(-4)}
                                    </span>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(event.blockchainEventAddress!);
                                      }}
                                      className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                      title="Copy contract address"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                    </button>
                                  </div>
                                </div>
                              )}
                              </div>
                              
                              {/* Ticket Footer */}
                              <div className="text-center pt-3 border-t border-gray-200 dark:border-gray-700">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  🎫 Official NFT Event Ticket
                                </span>
                              </div>
                            </div>
                      
                            {/* Action Buttons */}
                            <div className="space-y-2">
                              {/* Primary Actions */}
                              <div className="flex gap-2">
                                {event.blockchainEventAddress && (
                                  <>
                                    <a
                                      href={`https://testnet.soniclabs.com/address/${event.blockchainEventAddress}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="btn-primary flex-1 text-sm"
                                    >
                                      View NFT
                                    </a>
                                    <button
                                      onClick={() => setShowTransferModal(true)}
                                      className="btn-secondary flex-1 text-sm"
                                      title="Transfer this NFT to another address"
                                    >
                                      Transfer NFT
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : myStatus === "pending" ? (
                    <div className="space-y-4">
                      {/* Simple Status */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                          <span className="font-medium">Approval Pending</span>
                      </div>
                      </div>
                      
                      {/* Pending Message */}
                      <div className="card p-4 text-center">
                        <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <p className="font-medium mb-2">Waiting for Approval</p>
                        <p className="text-sm text-foreground/70">
                          Your registration is being reviewed by the event host.
                        </p>
                      </div>
                      
                            </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Simple Status */}
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="font-medium">Status Unknown</span>
                          </div>
                        </div>
                      
                      {/* Unknown Status Message */}
                      <div className="card p-4 text-center">
                        <div className="w-12 h-12 bg-gray-100 dark:bg-gray-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
                          <svg className="w-6 h-6 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                        <p className="font-medium mb-2">Registration Status Unknown</p>
                        <p className="text-sm text-foreground/70">
                          Unable to determine your registration status.
                        </p>
                      </div>
              </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-foreground/70 text-center">Ready to join this event?</p>
                  <RegisterButton eventId={id} />
                </div>
              )}
            </div>

            {/* Event Quick Info */}
            <div className="card p-6 fade-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">Event Details</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Date</span>
                  <span className="font-medium">{event.date}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Time</span>
                  <span className="font-medium">{event.time}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Location</span>
                  <span className="font-medium">{event.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Price</span>
                  <span className="font-medium">
                    {event.isPaid ? `${event.price || 0} ${event.currency || 'SONIC'} Tokens` : 'Free'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-foreground/70">Approval</span>
                  <span className="font-medium">
                    {event.approvalNeeded ? 'Required' : 'Not Required'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transfer NFT Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background border border-border rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Transfer NFT</h3>
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTransferRecipient('');
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
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Enter the Ethereum address to transfer this NFT to
                </p>
              </div>
              
              <div className="bg-foreground/5 rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-2">NFT Details</h4>
                <div className="space-y-1 text-sm text-foreground/70">
                  <div className="flex justify-between">
                    <span>Contract:</span>
                    <span className="font-mono text-xs">
                      {event?.blockchainEventAddress?.slice(0, 6)}...{event?.blockchainEventAddress?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Token ID:</span>
                    <span className="font-mono">{mySub?.nftTokenId || 'N/A'}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setShowTransferModal(false);
                    setTransferRecipient('');
                  }}
                  className="btn-secondary flex-1"
                  disabled={transferLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleTransferNFT}
                  disabled={!transferRecipient || transferLoading || transferPending}
                  className="btn-primary flex-1"
                >
                  {transferLoading || transferPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      {transferPending ? 'Confirming...' : 'Transferring...'}
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
                  className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-xs text-foreground/60 mt-1">
                  Enter the price in SONIC tokens for this NFT
                </p>
              </div>
              
              <div className="bg-foreground/5 rounded-lg p-3">
                <h4 className="text-sm font-medium text-foreground mb-2">NFT Details</h4>
                <div className="space-y-1 text-sm text-foreground/70">
                  <div className="flex justify-between">
                    <span>Contract:</span>
                    <span className="font-mono text-xs">
                      {event?.blockchainEventAddress?.slice(0, 6)}...{event?.blockchainEventAddress?.slice(-4)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Token ID:</span>
                    <span className="font-mono">{mySub?.nftTokenId || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resales Done:</span>
                    <span className="font-mono">{resaleInfo?.resalesDone || 0}/3</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resales Remaining:</span>
                    <span className="font-mono">{resaleInfo?.resalesRemaining || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee:</span>
                    <span className="font-mono">1%</span>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 pt-2">
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
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
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
    </main>
  );
}

