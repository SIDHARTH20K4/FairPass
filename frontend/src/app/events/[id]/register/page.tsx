"use client";

import { apiGetEvent } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import CustomDatePicker from "@/components/DatePicker";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";
import { Identity } from "@semaphore-protocol/identity";
import { createUserQR } from "@/Services/Semaphore";
import QRTicket from "@/components/tickets/QRticket";
import { parseEther } from "viem";
import { eventImplementationABI, eventTicketABI } from "../../../../../web3/constants";
import { web3Service } from "@/Services/Web3Service";
import React from "react";

// Removed localStorage - using backend database only

type Submission = {
  id?: string; // Backend submission ID
  values: Record<string, string>;
  at: number;
  status: "pending" | "approved";
  address?: string;
  commitment?: string;
  semaphoreIdentity?: string; // Encrypted Semaphore identity
  qrCid?: string;
  qrUrl?: string;
  jsonCid?: string;
  jsonUrl?: string;
  signature?: string;
};

export default function RegisterForEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const { address, isConnected } = useAccount();
  
  // Event state
  const [event, setEvent] = useState<any>(null);
  const [eventLoading, setEventLoading] = useState(true);
  const { signMessageAsync } = useSignMessage();

  const [values, setValues] = useState<Record<string, string>>({ name: "", dob: "", email: "", phone: "" });
  const [submitted, setSubmitted] = useState<Submission | null>(null);
  const [uploading, setUploading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [loadingRegistration, setLoadingRegistration] = useState(true);
  
  // Payment states
  const [paymentStep, setPaymentStep] = useState<'form' | 'payment' | 'processing' | 'success'>('form');
  const [paymentHash, setPaymentHash] = useState<string | null>(null);
  const [paymentReceipt, setPaymentReceipt] = useState<any>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  
  // NFT creation states
  const [nftCreating, setNftCreating] = useState(false);
  const [nftCreated, setNftCreated] = useState(false);
  const [nftTokenId, setNftTokenId] = useState<string | null>(null);
  const [nftError, setNftError] = useState<string | null>(null);
  const [nftContractAddress, setNftContractAddress] = useState<string | null>(null);
  
  // Web3 hooks for payment
  const { writeContract, data: paymentTxHash, isPending: isPaymentPending, error: paymentTxError } = useWriteContract();
  const { sendTransaction, data: directTxHash, isPending: isDirectPaymentPending, error: directTxError } = useSendTransaction();
  const { isLoading: isPaymentConfirming, isSuccess: isPaymentConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash || directTxHash,
  });

  // Web3 hooks for NFT minting
  const { writeContract: writeNFTContract, data: nftTxHash, isPending: isNFTMinting, error: nftTxError } = useWriteContract({
    mutation: {
      onError: (error) => {
        console.error('❌ NFT minting error:', error);
        setNftError(error.message || 'Failed to mint NFT');
        setNftCreating(false);
      },
      onSuccess: (hash) => {
        console.log('✅ NFT minting transaction submitted:', hash);
      }
    }
  });
  const { isLoading: isNFTConfirming, isSuccess: isNFTCreated } = useWaitForTransactionReceipt({
    hash: nftTxHash,
  });

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        console.log('🔍 Loading event:', id);
        const eventData = await apiGetEvent(id);
        console.log('✅ Event loaded:', eventData);
        setEvent(eventData);
      } catch (error) {
        console.error('❌ Failed to load event:', error);
      } finally {
        setEventLoading(false);
      }
    }
    
    loadEvent();
  }, [id]);

  // Handle NFT transaction confirmation
  useEffect(() => {
    if (isNFTCreated && nftTxHash && nftContractAddress) {
      async function getTokenId() {
        try {
          console.log('🎫 NFT transaction confirmed, getting token ID...');
          
          // Get the transaction receipt to find the token ID from events
          const { getPublicClient } = await import('wagmi/actions');
          const { config } = await import('@/app/config');
          const client = getPublicClient(config);
          
          if (!nftTxHash) {
            console.warn('⚠️ No NFT transaction hash available');
            setNftTokenId('unknown');
            return;
          }
          
          const receipt = await client.getTransactionReceipt({ hash: nftTxHash as `0x${string}` });
          console.log('📋 NFT transaction receipt:', receipt);
          
          // Look for TicketMinted event in the logs (emitted by EventTicket contract via EventImplementation)
          const { decodeEventLog } = await import('viem');
          const ticketMintedEvent = receipt.logs.find((log: any) => {
            try {
              const decoded = decodeEventLog({
                abi: eventTicketABI,
                data: log.data,
                topics: log.topics,
              });
              return decoded.eventName === 'TicketMinted';
            } catch {
              return false;
            }
          });
          
          if (ticketMintedEvent) {
            const decoded = decodeEventLog({
              abi: eventTicketABI,
              data: ticketMintedEvent.data,
              topics: ticketMintedEvent.topics,
            });
            
            const tokenId = (decoded.args as any).tokenId;
            console.log('🎫 NFT Token ID:', tokenId);
            setNftTokenId(tokenId.toString());
            setNftCreated(true); // Mark NFT as successfully created
            
            // Verify NFT metadata
            if (nftContractAddress) {
              console.log('🔍 Verifying NFT metadata...');
              console.log('📋 NFT Details:', {
                contractAddress: nftContractAddress,
                tokenId: tokenId.toString(),
                metadataURI: 'Check transaction logs for metadata URI'
              });
            }
          } else {
            console.warn('⚠️ TicketMinted event not found in transaction logs');
            setNftTokenId('unknown');
            setNftCreated(true); // Still mark as created even if we can't get token ID
          }
        } catch (error) {
          console.error('❌ Failed to get NFT token ID:', error);
          setNftTokenId('error');
        }
      }
      
      getTokenId();
    }
  }, [isNFTCreated, nftTxHash, nftContractAddress]);

  // Handle NFT transaction confirmation even without contract address
  useEffect(() => {
    if (isNFTCreated && nftTxHash && !nftContractAddress) {
      console.log('🎫 NFT transaction confirmed but no contract address, marking as created');
      setNftCreated(true);
      setNftTokenId('confirmed');
    }
  }, [isNFTCreated, nftTxHash, nftContractAddress]);

  // Load existing registration from backend on mount
  useEffect(() => {
    async function loadExistingRegistration() {
      if (!address) {
        setLoadingRegistration(false);
        return;
      }

      try {
        console.log('🔍 Checking registration status for:', { address: address.toLowerCase(), eventId: id });
        const response = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
        console.log('📡 Registration check response:', { status: response.status, ok: response.ok });
        
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Found existing registration:', data);
          const existingSubmission: Submission = {
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
          setSubmitted(existingSubmission);
        } else {
          console.log('ℹ️ No existing registration found (status:', response.status, ')');
        }
      } catch (error) {
        console.error('❌ Error checking registration status:', error);
      } finally {
        setLoadingRegistration(false);
      }
    }

    loadExistingRegistration();
  }, [address, id]);

  // Handle payment for paid events
  async function handlePayment() {
    if (!event?.isPaid || !event?.price) {
      console.error('Event is not properly configured for payment');
      return;
    }

    if (!address) {
      console.error('No wallet address available');
      return;
    }

    try {
      setPaymentStep('processing');
      setPaymentError(null);

      // Convert price to wei
      const priceInWei = parseEther(event.price.toString());

      if (event?.blockchainEventAddress) {
        // Event is published - call the contract
        console.log('Paying via contract:', event.blockchainEventAddress);
        writeContract({
          address: event.blockchainEventAddress as `0x${string}`,
          abi: eventImplementationABI,
          functionName: 'buyTicket',
          args: [address], // User address
          value: priceInWei,
        });
      } else {
        // Event not published - send payment directly to organizer
        console.log('Paying directly to organizer:', event.hostAddress);
        if (!event.hostAddress) {
          throw new Error('Organizer wallet address not available');
        }
        
        // Use sendTransaction for direct ETH transfer
        sendTransaction({
          to: event.hostAddress as `0x${string}`,
          value: priceInWei,
        });
      }

    } catch (error: any) {
      console.error('Payment failed:', error);
      setPaymentError(error.message || 'Payment failed');
      setPaymentStep('payment');
    }
  }

  // Watch for payment transaction completion
  useEffect(() => {
    if (paymentTxHash) {
      setPaymentHash(paymentTxHash);
    }
  }, [paymentTxHash]);

  useEffect(() => {
    if (directTxHash) {
      setPaymentHash(directTxHash);
    }
  }, [directTxHash]);

  useEffect(() => {
    if (isPaymentConfirmed && paymentHash) {
      setPaymentReceipt({ hash: paymentHash, confirmed: true });
      setPaymentStep('success');
      // Proceed with registration after successful payment
      proceedWithRegistration();
    }
  }, [isPaymentConfirmed, paymentHash]);

  // Proceed with registration after payment
  async function proceedWithRegistration() {
    // This will be called after successful payment
    try {
      // Only create NFT ticket for published events
      if (event?.blockchainEventAddress) {
        await createNFTTicket();
      }
      
      // Then proceed with regular registration
      await submitRegistration();
    } catch (error) {
      console.error('Error in proceedWithRegistration:', error);
      // Still proceed with registration even if NFT creation fails
      await submitRegistration();
    }
  }

  // Create NFT ticket after successful payment
  async function createNFTTicket() {
    if (!address) {
      console.log('Skipping NFT creation - no wallet address');
      setNftError('Wallet not connected');
      return;
    }

    if (isNFTMinting) {
      console.log('NFT minting already in progress');
      return;
    }

    try {
      setNftCreating(true);
      setNftError(null);

      console.log('🎫 Starting NFT creation process...');

      let ticketContractAddress: string;

      if (event?.blockchainEventAddress) {
        // Event is published - get EventTicket contract address from EventImplementation
        console.log('📋 Event is published, getting EventTicket contract address...');
        const { readContract, getPublicClient } = await import('wagmi/actions');
        const { config } = await import('@/app/config');
        const client = getPublicClient(config);
        
        console.log('🔍 Getting EventTicket contract address from EventImplementation...');
        ticketContractAddress = await client.readContract({
          address: event.blockchainEventAddress as `0x${string}`,
          abi: eventImplementationABI,
          functionName: 'ticketNFT'
        }) as string;
        
        console.log('✅ EventTicket contract address:', ticketContractAddress);
      } else {
        // Event is not published - we need to deploy a standalone EventTicket contract
        console.log('📋 Event is not published, creating standalone EventTicket contract...');
        // For now, we'll skip NFT creation for unpublished events
        // In a full implementation, you would deploy a new EventTicket contract here
        console.log('⚠️ NFT creation skipped for unpublished events');
        setNftError('NFT creation only available for published events');
        return;
      }
      
      setNftContractAddress(ticketContractAddress);

      // Generate Semaphore identity for this event
      const semaphoreData = createUserQR(id);
      const identity = semaphoreData.user;
      const commitment = semaphoreData.commitment;

      // Create QR code data URL
      const qrDataUrl = await new Promise<string>((resolve, reject) => {
        import('qrcode').then(QRCode => {
          QRCode.toDataURL(semaphoreData.qrData, { width: 300 }, (err, dataUrl) => {
            if (err) reject(err);
            else resolve(dataUrl);
          });
        });
      });

      // Upload QR code image to IPFS
      console.log('📤 Uploading QR code image to IPFS...');
      const qrImageUpload = await uploadImageToIPFS(qrDataUrl);
      console.log('✅ QR code image uploaded to IPFS:', qrImageUpload.url);

      // Create metadata for the NFT
      const metadata = {
        name: `${event.name} Ticket`,
        description: `Event ticket for ${event.name}. This NFT contains a QR code for event verification.`,
        image: qrImageUpload.url, // IPFS URL to QR code image
        external_url: `https://fairpass.app/events/${id}`,
        attributes: [
          { trait_type: "Event", value: event.name },
          { trait_type: "Participant", value: values.name || 'Anonymous' },
          { trait_type: "Event Date", value: event.date },
          { trait_type: "Event Time", value: event.time },
          { trait_type: "Location", value: event.location },
          { trait_type: "Price Paid", value: event.price?.toString() || '0' },
          { trait_type: "Currency", value: event.currency || 'SONIC' },
          { trait_type: "Commitment", value: commitment },
          { trait_type: "Event ID", value: id },
          { trait_type: "QR Code", value: "Event Verification QR" },
          { trait_type: "Ticket Type", value: "NFT QR Ticket" }
        ]
      };

      // Upload metadata to IPFS
      console.log('📤 Uploading NFT metadata to IPFS...');
      console.log('🔍 Metadata content:', {
        name: metadata.name,
        description: metadata.description,
        image: metadata.image,
        attributes: metadata.attributes.length
      });
      
      const metadataUpload = await uploadJsonToIPFS(metadata);
      const metadataURI = metadataUpload.url;

      console.log('✅ Uploaded NFT metadata to IPFS:', metadataURI);
      console.log('🔗 Metadata URL:', metadataURI);
      console.log('🖼️ QR Image URL:', qrImageUpload.url);

      // Mint the NFT using the EventImplementation contract's buyTicket function
      // This handles both FREE and PAID events automatically
      console.log('🎨 Minting NFT via EventImplementation buyTicket...');
      writeNFTContract({
        address: event.blockchainEventAddress as `0x${string}`,
        abi: eventImplementationABI,
        functionName: 'buyTicket',
        args: [metadataURI], // metadataURI
        value: event.price ? parseEther(event.price.toString()) : BigInt(0) // Include payment for paid events
      });

      console.log('✅ NFT minting transaction submitted');
      // Don't set nftCreated here - wait for transaction confirmation
      setNftTokenId('pending'); // We'll update this when we get the token ID

    } catch (error: any) {
      console.error('❌ NFT creation failed:', error);
      setNftError(error.message || 'Failed to create NFT ticket');
    } finally {
      setNftCreating(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet to register.");
      return;
    }

    // Check if already registered by calling backend API
    try {
      const checkResponse = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (checkResponse.ok) {
      alert("You have already registered with this wallet.");
      return;
      }
    } catch (error) {
      // If check fails, continue with registration
      console.log('Could not check existing registration, proceeding...');
    }

    // If it's a paid event, go to payment step
    console.log('Event payment check:', { 
      isPaid: event?.isPaid, 
      price: event?.price, 
      blockchainEventAddress: event?.blockchainEventAddress 
    });
    
    if (event?.isPaid && event?.price && event?.blockchainEventAddress) {
      // For paid published events, go directly to NFT minting (which includes payment)
      console.log('Paid published event - proceeding with NFT minting (includes payment)');
      await submitRegistration();
    } else if (event?.isPaid && event?.price && !event?.blockchainEventAddress) {
      // For paid unpublished events, use the payment flow
      console.log('Paid unpublished event - redirecting to payment step');
      setPaymentStep('payment');
      return;
    } else {
      // For free events, proceed directly with registration
      console.log('Free event - proceeding with registration');
      await submitRegistration();
    }
  }

  async function submitRegistration() {
    setUploading(true);
    try {
      const needsApproval = !!event?.approvalNeeded;
      const status: Submission["status"] = needsApproval ? "pending" : "approved";
      const payload = {
        eventId: id,
        eventName: event?.name,
        address: address!.toLowerCase(),
        ...values,
        status,
        ts: Date.now(),
      };

      const message = JSON.stringify(payload);
      const signature = await signMessageAsync({ message });

      let qrImageUrl: string | undefined;
      let qrCid: string | undefined;
      let jsonUrl: string | undefined;
      let jsonCid: string | undefined;

      // Generate Semaphore identity for this event
      const semaphoreData = createUserQR(id);
      const identity = semaphoreData.user;
      const commitment = semaphoreData.commitment;
      
      // Encrypt the identity for secure storage (in production, use proper encryption)
      const encryptedIdentity = btoa(identity.toString()); // Simple base64 encoding

      // Generate QR ticket data for all events (both free and paid)
      // QR codes are needed for all approved registrations
      if (status === "approved") {
        console.log('🎫 Generating QR ticket for approved registration...');
        const qrData = encodeURIComponent(JSON.stringify({ eventId: id, commitment }));
        const qrUrlData = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
        console.log('📱 QR data:', { eventId: id, commitment });
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
        
        const qrUpload = await uploadImageToIPFS(qrUrlData);
        qrImageUrl = qrUpload.url; qrCid = qrUpload.cid;
        console.log('✅ QR uploaded to IPFS:', { url: qrImageUrl, cid: qrCid });

        const jsonUpload = await uploadJsonToIPFS({ eventId: id, commitment });
        jsonUrl = jsonUpload.url; jsonCid = jsonUpload.cid;
        console.log('✅ JSON uploaded to IPFS:', { url: jsonUrl, cid: jsonCid });
      } else {
        console.log('⏳ Approval needed, QR will be generated after approval');
      }

      // Send registration to backend with commitment, encrypted identity, and QR data
      const backendPayload: any = { 
        address: address!.toLowerCase(), 
        values, 
        signature, 
        commitment,
        semaphoreIdentity: encryptedIdentity
      };

      // Include QR data for non-approval events
      if (!needsApproval && qrImageUrl && qrCid) {
        backendPayload.qrUrl = qrImageUrl;
        backendPayload.qrCid = qrCid;
        backendPayload.jsonUrl = jsonUrl;
        backendPayload.jsonCid = jsonCid;
        console.log('📤 Including QR data in backend request:', { qrUrl: qrImageUrl, qrCid, jsonUrl, jsonCid });
      }

      const backendResponse = await fetch(`http://localhost:4000/api/events/${id}/registrations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });
      
      if (!backendResponse.ok) {
        const errorText = await backendResponse.text();
        console.error('Backend registration error:', backendResponse.status, errorText);
        throw new Error(`Failed to register with backend: ${backendResponse.status} - ${errorText}`);
      }
      
      const backendData = await backendResponse.json();
      console.log('Backend registration successful:', backendData);
      console.log('🔍 Backend returned QR data:', { 
        qrUrl: backendData.qrUrl, 
        qrCid: backendData.qrCid,
        jsonUrl: backendData.jsonUrl,
        jsonCid: backendData.jsonCid
      });

      // Use the data returned from backend instead of creating local entry
      const entry: Submission = {
        id: backendData.id,
        values: backendData.values,
        at: new Date(backendData.createdAt).getTime(),
        status: backendData.status,
        address: backendData.address,
        qrCid: backendData.qrCid,
        qrUrl: backendData.qrUrl,
        jsonCid: backendData.jsonCid,
        jsonUrl: backendData.jsonUrl,
        signature: backendData.signature,
      };

      setSubmitted(entry);
      
      // After successful registration, mint NFT if event is published
      if (event?.blockchainEventAddress) {
        console.log('🎫 Registration successful, now minting NFT for published event...');
        await createNFTTicket();
      } else {
        console.log('📋 Registration successful, but event is not published - no NFT minting');
      }
    } catch (err: any) {
      alert(err?.message || "Registration failed");
    } finally {
      setUploading(false);
    }
  }

  // Function to check approval status from backend
  const checkApprovalStatus = useCallback(async () => {
    if (!address || !submitted) return;
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`http://localhost:4000/api/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'approved' && data.qrUrl) {
          // Update local submission with backend data
          const updatedSubmission = {
            ...submitted,
            status: 'approved' as const,
            qrUrl: data.qrUrl,
            qrCid: data.qrCid,
            jsonUrl: data.jsonUrl,
            jsonCid: data.jsonCid
          };
          setSubmitted(updatedSubmission);
        }
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [address, submitted, id]);

  // Check approval status periodically for pending registrations
  useEffect(() => {
    if (submitted?.status === 'pending' && address) {
      const interval = setInterval(checkApprovalStatus, 10000); // Check every 10 seconds
      return () => clearInterval(interval);
    }
  }, [submitted?.status, address, checkApprovalStatus]);

  // Early return after all hooks are called
  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  if (eventLoading || loadingRegistration) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6">
          <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
        </div>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">
            {eventLoading ? 'Loading event...' : 'Loading registration status...'}
          </p>
        </div>
      </main>
    );
  }

  // Debug logging
  console.log('Registration page render:', { 
    event: event ? {
      name: event.name,
      isPaid: event.isPaid,
      price: event.price,
      blockchainEventAddress: event.blockchainEventAddress
    } : null,
    paymentStep,
    submitted: submitted ? {
      id: submitted.id,
      status: submitted.status,
      hasValues: !!submitted.values
    } : null,
    loadingRegistration
  });

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Register for {event.name}</h1>
      
      {/* Debug info - remove this in production */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            Debug: Payment Step = {paymentStep} | 
            Event isPaid = {event.isPaid ? 'true' : 'false'} | 
            Price = {event.price} | 
            Contract = {event.blockchainEventAddress ? 'Yes' : 'No'} | 
            NFT Status = {nftCreating ? 'Creating' : nftCreated ? 'Created' : nftError ? 'Error' : 'Pending'}
          </p>
        </div>
      )}


      {submitted ? (
        <div className="space-y-6">
          {/* Status Information */}
          <div className="card p-4 text-center">
            <div className="space-y-2">
              <p className="text-sm text-foreground/70">Registration Status</p>
              {submitted.status === "pending" ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-yellow-600">⏳ Approval Pending</p>
                  <p className="text-sm text-foreground/70">
                    Your registration has been submitted and is waiting for host approval.
                  </p>
                  {checkingStatus ? (
                    <p className="text-xs text-foreground/60">Checking approval status...</p>
                  ) : (
                    <button 
                      onClick={checkApprovalStatus}
                      className="btn-secondary text-xs px-3 py-1"
                    >
                      Check Status
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {nftCreated && event?.blockchainEventAddress ? (
                    <>
                      <p className="text-lg font-medium text-green-600">✅ Approved Mint NFT QR ticket</p>
                      <p className="text-sm text-foreground/70">
                        Your registration has been approved and NFT ticket has been minted! You can now attend the event!
                      </p>
                    </>
                  ) : nftCreating && event?.blockchainEventAddress ? (
                    <>
                      <p className="text-lg font-medium text-blue-600">⏳ Minting NFT Ticket...</p>
                      <p className="text-sm text-foreground/70">
                        Your registration has been approved. Minting your NFT ticket...
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg font-medium text-green-600">✅ Approved!</p>
                      <p className="text-sm text-foreground/70">
                        Your registration has been approved. You can now attend the event!
                        {!event?.blockchainEventAddress && (
                          <span className="block text-xs text-foreground/60 mt-1">
                            (NFT QR tickets only available for published events)
                          </span>
                        )}
                      </p>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* NFT Ticket Information */}
          {nftCreated && event?.blockchainEventAddress && (
            <div className="card p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">NFT Ticket Created</h3>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                Your event ticket has been minted as an NFT on the blockchain with ZK-based QR code!
              </p>
              <div className="text-xs text-blue-600 dark:text-blue-400">
                <p>Contract: {event.blockchainEventAddress}</p>
                {nftTokenId && nftTokenId !== 'pending' && (
                  <p>Token ID: {nftTokenId}</p>
                )}
              </div>
            </div>
          )}

          {/* QR Ticket Display for Approved Users */}
          {submitted.status === "approved" && (
            <>
              {/* Regular QR Ticket for unpublished events or when no NFT */}
              {submitted.qrUrl && !(nftCreated && event?.blockchainEventAddress) && (
                <QRTicket
                  qrUrl={submitted.qrUrl}
                  eventName={event.name}
                  participantName={submitted.values.name || 'Anonymous'}
                  participantAddress={submitted.address || ''}
                  approvalDate={new Date().toISOString()}
                  isNFTMinted={false}
                />
              )}
              
              {/* NFT QR Ticket for published events */}
              {nftCreated && event?.blockchainEventAddress && (
                <QRTicket
                  qrUrl="NFT_MINTED"
                  eventName={event.name}
                  participantName={submitted.values.name || 'Anonymous'}
                  participantAddress={submitted.address || ''}
                  approvalDate={new Date().toISOString()}
                  isNFTMinted={true}
                  nftTokenId={nftTokenId || undefined}
                  nftContractAddress={nftContractAddress || undefined}
                />
              )}
            </>
          )}

          {/* Registration Details */}
          <div className="card p-4">
            <h3 className="text-sm font-medium mb-3">Registration Details</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(submitted.values).map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="text-foreground/70 capitalize">{key}:</span>
                  <span className="font-medium">{value}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-foreground/70">Wallet Address:</span>
                <span className="font-mono text-xs">{submitted.address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-foreground/70">Submitted:</span>
                <span>{new Date(submitted.at).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Registration Form */}
          {paymentStep === 'form' && (
            <form onSubmit={submit} className="card p-6 space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor="name">Full name</label>
                <input 
                  id="name" 
                  type="text" 
                  required 
                  value={values.name} 
                  onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} 
                  className="input" 
                  placeholder="Enter your full name"
                />
              </div>
              <div className="space-y-2">
                <SimpleDatePicker 
                  value={values.dob} 
                  onChange={(dob) => setValues((v) => ({ ...v, dob }))} 
                  label="Date of birth" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor="email">Email</label>
                <input 
                  id="email" 
                  type="email" 
                  required 
                  value={values.email} 
                  onChange={(e) => setValues((v) => ({ ...v, email: e.target.value }))} 
                  className="input" 
                  placeholder="Enter your email address"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground" htmlFor="phone">Phone number</label>
                <input 
                  id="phone" 
                  type="tel" 
                  required 
                  value={values.phone} 
                  onChange={(e) => setValues((v) => ({ ...v, phone: e.target.value }))} 
                  className="input" 
                  placeholder="Enter your phone number"
                />
              </div>
              <button 
                disabled={uploading} 
                type="submit" 
                className="btn-primary w-full"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  "Continue to Registration"
                )}
              </button>
            </form>
          )}

          {/* Payment Step */}
          {paymentStep === 'payment' && (
            <div className="space-y-6">
              <div className="card p-6 text-center">
                <h3 className="text-lg font-semibold mb-4">Payment Required</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-2xl font-bold text-foreground">{event.price}</span>
                    <div className="flex items-center gap-2 px-3 py-1 bg-foreground/5 rounded-lg border border-foreground/10">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-foreground">Sonic Tokens</span>
                    </div>
                  </div>
                  <p className="text-sm text-foreground/70">
                    Pay {event.price} Sonic Tokens to complete your registration
                  </p>
                  {!event?.blockchainEventAddress && (
                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <p className="text-sm text-blue-800 dark:text-blue-200">
                        💡 This event hasn't been published to the blockchain yet. Payment will be sent directly to the organizer's wallet.
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex gap-3">
                <button 
                  onClick={() => setPaymentStep('form')}
                  className="btn-secondary flex-1"
                >
                  Back to Form
                </button>
                <button 
                  onClick={handlePayment}
                  disabled={isPaymentPending || isDirectPaymentPending}
                  className="btn-primary flex-1"
                >
                  {(isPaymentPending || isDirectPaymentPending) ? (
                    <>
                      <div className="w-4 h-4 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mr-2"></div>
                      Processing Payment...
                    </>
                  ) : (
                    "Pay with Sonic Tokens"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Payment Processing */}
          {paymentStep === 'processing' && (
            <div className="card p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 border-4 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto"></div>
                <h3 className="text-lg font-semibold">Processing Payment</h3>
                <p className="text-sm text-foreground/70">
                  Please confirm the transaction in your wallet
                </p>
                {paymentHash && (
                  <div className="mt-4 p-3 bg-foreground/5 rounded-lg">
                    <p className="text-xs text-foreground/60 mb-1">Transaction Hash:</p>
                    <p className="font-mono text-xs text-foreground break-all">{paymentHash}</p>
                  </div>
                )}
                
                {/* NFT Creation Status - Only for Published Events */}
                {event?.blockchainEventAddress && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">NFT Ticket Creation</h4>
                    
                    {nftCreating && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Creating NFT Ticket with ZK QR Code...</p>
                        </div>
                        {isNFTMinting && (
                          <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Minting on blockchain...</p>
                        )}
                        {isNFTConfirming && (
                          <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Waiting for confirmation...</p>
                        )}
                      </div>
                    )}
                    
                    {nftCreated && !nftCreating && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm text-green-600 dark:text-green-400">NFT Ticket Created!</p>
                        </div>
                        
                        {nftContractAddress && (
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium">Contract:</p>
                            <p className="font-mono break-all">{nftContractAddress}</p>
                          </div>
                        )}
                        
                        {nftTokenId && nftTokenId !== 'pending' && (
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium">Token ID:</p>
                            <p className="font-mono">{nftTokenId}</p>
                          </div>
                        )}
                        
                        {nftTxHash && (
                          <div className="text-xs text-blue-700 dark:text-blue-300">
                            <p className="font-medium">Transaction:</p>
                            <p className="font-mono break-all">{nftTxHash}</p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {nftError && (
                      <div className="flex items-center justify-center gap-2">
                        <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        <p className="text-sm text-red-600 dark:text-red-400">NFT Creation Failed: {nftError}</p>
                      </div>
                    )}
                    
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Success */}
          {paymentStep === 'success' && (
            <div className="card p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
                <p className="text-sm text-foreground/70">
                  Your payment has been confirmed. Completing registration...
                </p>
                {paymentReceipt && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Transaction Receipt:</p>
                    <p className="font-mono text-xs text-green-800 dark:text-green-200 break-all">{paymentReceipt.hash}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Error Display */}
          {paymentError && (
            <div className="card p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <p className="text-sm text-red-800 dark:text-red-200">{paymentError}</p>
              </div>
              <button 
                onClick={() => setPaymentStep('payment')}
                className="mt-2 text-xs text-red-600 dark:text-red-400 hover:underline"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
