"use client";

import { apiGetEvent } from "@/lib/api";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAccount, useSignMessage, useWriteContract, useWaitForTransactionReceipt, useSendTransaction } from "wagmi";
import CustomDatePicker from "@/components/DatePicker";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import { uploadImageToIPFS, uploadJsonToIPFS } from "@/lib/ipfs";
import { Identity } from "@semaphore-protocol/identity";
import { createUserQR } from "@/Services/Semaphore";
import BlockchainNFTTicket from "@/components/BlockchainNFTTicket";
import { parseEther } from "viem";
import { eventImplementationABI, eventTicketABI } from "../../../../../web3/constants";
import { web3Service } from "@/Services/Web3Service";
import { 
  useBuyTicket, 
  useMintForUser, 
  useTicketNFT, 
  createEventHooks,
  getContractAddressFromEvent 
} from "../../../../../web3/implementationConnections";
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
  nftTokenId?: string;
  nftContractAddress?: string;
  signature?: string;
};

export default function RegisterForEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
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
  const [pendingQrUrl, setPendingQrUrl] = useState<string | null>(null); // Store QR URL for saving after mint
  const [pendingTokenId, setPendingTokenId] = useState<string | null>(null); // Store token ID for saving after mint
  
  // Handle URL parameters for payment step
  useEffect(() => {
    const step = searchParams.get('step');
    if (step === 'payment') {
      console.log('🔗 URL parameter detected: step=payment - setting payment step');
      setPaymentStep('payment');
    }
  }, [searchParams]);
  
  // Dynamic contract hooks based on event
  const contractAddress = getContractAddressFromEvent(event);
  const eventHooks = contractAddress ? createEventHooks(contractAddress) : null;
  
  // Payment hooks (must be declared before useWaitForTransactionReceipt)
  const { buyTicket, hash: buyTicketHash, isPending: isBuyTicketPending, error: buyTicketError } = useBuyTicket(contractAddress || '');
  const { mintForUser, hash: mintForUserHash, isPending: isMintForUserPending, error: mintForUserError } = useMintForUser(contractAddress || '');
  
  // NFT contract address hook
  const { data: ticketNFTAddress } = useTicketNFT(contractAddress || '');
  
  // Web3 hooks for payment
  const { writeContract, data: paymentTxHash, isPending: isPaymentPending, error: paymentTxError } = useWriteContract();
  const { sendTransaction, data: directTxHash, isPending: isDirectPaymentPending, error: directTxError } = useSendTransaction();
  const { isLoading: isPaymentConfirming, isSuccess: isPaymentConfirmed } = useWaitForTransactionReceipt({
    hash: paymentTxHash || directTxHash || buyTicketHash,
  });

  // Web3 hooks for NFT minting (fallback for direct contract calls)
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
    hash: nftTxHash || mintForUserHash,
  });

  // Load event data
  useEffect(() => {
    async function loadEvent() {
      try {
        console.log('🔍 Loading event:', id);
        const eventData = await apiGetEvent(id);
        console.log('✅ Event loaded:', eventData);
        console.log('🔍 Event price details:', {
          isPaid: eventData.isPaid,
          price: eventData.price,
          priceType: typeof eventData.price,
          currency: eventData.currency
        });
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
            setPendingTokenId(tokenId.toString()); // Store for database save
            setNftCreated(true); // Mark NFT as successfully created
            
            // Save QR URL and NFT data to database after successful NFT creation
            await saveNFTDataToDatabase();
            
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
            setPendingTokenId('unknown'); // Store for database save
            setNftCreated(true); // Still mark as created even if we can't get token ID
            
            // Save QR URL and NFT data to database after successful NFT creation
            await saveNFTDataToDatabase();
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
      setPendingTokenId('confirmed'); // Store for database save
      
      // Save QR URL and NFT data to database after successful NFT creation
      saveNFTDataToDatabase();
    }
  }, [isNFTCreated, nftTxHash, nftContractAddress]);

  // No auto-redirect for free events after NFT minting
  // Users can manually navigate using the "Go to Event Page" button

  // Load existing registration from backend on mount
  useEffect(() => {
    async function loadExistingRegistration() {
      if (!address) {
        setLoadingRegistration(false);
        return;
      }

      try {
        console.log('🔍 Checking registration status for:', { address: address.toLowerCase(), eventId: id });
        const response = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
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

      if (contractAddress) {
        // Event is published - use dynamic hook
        console.log('Paying via contract using dynamic hook:', contractAddress);
        
        // Create QR code and upload to IPFS for paid events
        console.log('🎫 Creating QR code and metadata for paid event...');
        
        // Create QR code data
        const qrPayload = {
          eventId: id,
          eventName: event.name,
          participantAddress: address,
          participantName: submitted?.values?.name || 'Event Participant',
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
          image: qrImageUpload.url, // Use IPFS URL
          attributes: [
            { trait_type: "Event", value: event.name },
            { trait_type: "Type", value: "Event Ticket" },
            { trait_type: "Status", value: "Valid" },
            { trait_type: "Participant", value: address }
          ]
        };

        console.log('📤 Uploading NFT metadata to IPFS...');
        // Upload metadata to IPFS
        const metadataUpload = await uploadJsonToIPFS(metadata);
        const metadataURI = metadataUpload.url;
        console.log('✅ NFT metadata uploaded to IPFS:', metadataURI);
        
        // Use the dynamic buyTicket hook
        buyTicket(metadataURI, priceInWei);
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

  // Watch for dynamic hook payment completion
  useEffect(() => {
    if (buyTicketError) {
      console.error('❌ Buy ticket error:', buyTicketError);
      setPaymentError(buyTicketError.message || 'Payment failed');
      setPaymentStep('payment');
    }
  }, [buyTicketError]);

  // Watch for mintForUser error
  useEffect(() => {
    if (mintForUserError) {
      console.error('❌ Mint for user error:', mintForUserError);
      setNftError(mintForUserError.message || 'NFT minting failed');
    }
  }, [mintForUserError]);

  // Watch for buyTicket transaction hash
  useEffect(() => {
    if (buyTicketHash) {
      console.log('✅ Buy ticket transaction submitted:', buyTicketHash);
      setPaymentHash(buyTicketHash);
    }
  }, [buyTicketHash]);

  // Watch for mintForUser transaction hash
  useEffect(() => {
    if (mintForUserHash) {
      console.log('✅ Mint for user transaction submitted:', mintForUserHash);
    }
  }, [mintForUserHash]);

  // Debug payment state changes
  useEffect(() => {
    console.log('🔍 Payment state debug:', {
      paymentStep,
      isPaymentConfirmed,
      paymentHash,
      buyTicketHash,
      isPaymentConfirming
    });
  }, [paymentStep, isPaymentConfirmed, paymentHash, buyTicketHash, isPaymentConfirming]);

  useEffect(() => {
    if (isPaymentConfirmed && (paymentHash || buyTicketHash)) {
      const confirmedHash = paymentHash || buyTicketHash;
      setPaymentReceipt({ hash: confirmedHash, confirmed: true });
      setPaymentStep('success');
      console.log('✅ Payment confirmed - setting payment step to success');
      
      // Proceed with registration after successful payment for all event types
      proceedWithRegistration();
    }
  }, [isPaymentConfirmed, paymentHash, buyTicketHash]);

  // Proceed with registration after payment
  async function proceedWithRegistration() {
    // This will be called after successful payment
    try {
      // For non-approved events, proceed with regular registration
      if (!submitted) {
      await submitRegistration();
      }
    } catch (error) {
      console.error('Error in proceedWithRegistration:', error);
      // For non-approved events, still proceed with registration
      if (!submitted) {
      await submitRegistration();
      }
    }
  }


  // Save NFT data (QR URL, Token ID, Contract Address) to database after successful NFT creation
  async function saveNFTDataToDatabase() {
    if (!pendingQrUrl || !submitted?.id) {
      console.log('⚠️ Cannot save NFT data: missing pendingQrUrl or submission ID');
      return;
    }

    try {
      console.log('💾 Saving NFT data to database...');
      
      const updatePayload: any = {
        qrUrl: pendingQrUrl,
        qrCid: 'generated-from-nft', // We could extract this from IPFS if needed
      };

      // Add NFT token ID if available
      if (pendingTokenId) {
        updatePayload.nftTokenId = pendingTokenId;
        console.log('🎫 Including NFT Token ID:', pendingTokenId);
      }

      // Add NFT contract address if available
      if (nftContractAddress) {
        updatePayload.nftContractAddress = nftContractAddress;
        console.log('📜 Including NFT Contract Address:', nftContractAddress);
      }

      const updateResponse = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/${submitted.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      });

      if (updateResponse.ok) {
        console.log('✅ NFT data saved to database successfully');
        // Update local state to reflect the change
        if (submitted) {
          setSubmitted({
            ...submitted,
            qrUrl: pendingQrUrl,
            ...(pendingTokenId && { nftTokenId: pendingTokenId }),
            ...(nftContractAddress && { nftContractAddress })
          });
        }
        // Clear pending data
        setPendingQrUrl(null);
        setPendingTokenId(null);
      } else {
        console.error('❌ Failed to save NFT data to database:', await updateResponse.text());
      }
    } catch (error) {
      console.error('❌ Error saving NFT data to database:', error);
    }
  }

  // Create NFT ticket after successful payment
  async function createNFTTicket() {
    if (!address) {
      console.log('Skipping NFT creation - no wallet address');
      setNftError('Wallet not connected');
      return;
    }

    if (isNFTMinting || isBuyTicketPending || isMintForUserPending) {
      console.log('NFT minting already in progress');
      return;
    }

    try {
      setNftCreating(true);
      setNftError(null);

      console.log('🎫 Starting NFT creation process...');

      if (!contractAddress) {
        console.log('⚠️ NFT creation skipped - no contract address');
        setNftError('NFT creation only available for published events');
        return;
      }

      // Use dynamic hook to get ticket NFT address
      if (ticketNFTAddress && typeof ticketNFTAddress === 'string') {
        console.log('✅ EventTicket contract address from hook:', ticketNFTAddress);
        setNftContractAddress(ticketNFTAddress);
      } else {
        console.log('⏳ Waiting for ticket NFT address...');
        return;
      }

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
      
      // Store QR URL for saving after successful mint
      setPendingQrUrl(qrImageUpload.url);

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

      // Mint the NFT using the appropriate function based on event type
      if (event.isPaid && event.price) {
        // For paid events (with or without approval), use buyTicket with payment
        if (event.approvalNeeded) {
          console.log('🎨 Minting paid + approval NFT via buyTicket hook...');
        } else {
          console.log('🎨 Minting paid NFT via buyTicket hook...');
        }
        const priceInWei = parseEther(event.price.toString());
        buyTicket(metadataURI, priceInWei);
      } else {
        // For free events (with or without approval), use buyTicket with 0 payment
        if (event.approvalNeeded) {
          console.log('🎨 Minting free + approval NFT via buyTicket hook...');
        } else {
          console.log('🎨 Minting free NFT via buyTicket hook...');
        }
        buyTicket(metadataURI, BigInt(0));
      }

      console.log('✅ NFT minting transaction submitted via dynamic hook');
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
      const checkResponse = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
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

      // Generate QR ticket data only for FREE events
      // Paid events should get QR codes after payment, not during registration
      if (status === "approved" && !event?.isPaid) {
        console.log('🎫 Generating QR ticket for FREE event registration...');
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

      const backendResponse = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations`, {
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
      
      // For non-approval events, set payment step to success to show mint button
      if (!needsApproval) {
        console.log('📋 Non-approval event registration successful - showing mint button');
        setPaymentStep('success');
      } else {
        console.log('📋 Registration successful - waiting for approval');
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
      const response = await fetch(`
https://fairpass.onrender.com/api
/events/${id}/registrations/user/${address.toLowerCase()}`);
      if (response.ok) {
        const data = await response.json();
        if (data.status === 'approved') {
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
          
          // Handle different event types after approval
          if (event?.isPaid && event?.price && !paymentReceipt) {
            // For paid events (with or without approval), trigger payment flow
            if (event?.approvalNeeded) {
              console.log('🎉 Registration approved for paid + approval event - triggering payment flow');
            } else {
              console.log('🎉 Registration approved for paid event - triggering payment flow');
            }
            setPaymentStep('payment');
          } else if (!event?.isPaid) {
            // For free events (with or without approval), show mint button after approval
            if (event?.approvalNeeded) {
              console.log('🎉 Registration approved for free + approval event - showing mint button');
            } else {
              console.log('🎉 Registration approved for free event - showing mint button');
            }
            setPaymentStep('success'); // Show success step with mint button
          }
        }
      }
    } catch (error) {
      console.error('Failed to check approval status:', error);
    } finally {
      setCheckingStatus(false);
    }
  }, [address, submitted, id, event, paymentReceipt]);

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
                    {event?.isPaid && event?.price && (
                      <span className="block text-xs text-foreground/60 mt-1">
                        Payment of {event.price} Sonic Tokens will be required after approval.
                      </span>
                    )}
                    {!event?.isPaid && (
                      <span className="block text-xs text-foreground/60 mt-1">
                        {event?.blockchainEventAddress 
                          ? "You can mint your NFT ticket after approval."
                          : "Your ticket will be ready immediately after approval."
                        }
                      </span>
                    )}
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
              ) : paymentStep === 'payment' && event?.isPaid && event?.price ? (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-blue-600">💰 Payment Required</p>
                  <p className="text-sm text-foreground/70">
                    Your registration has been approved! Please complete payment to finalize your ticket.
                  </p>
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
                  ) : paymentStep === 'success' ? (
                    <>
                      <p className="text-lg font-medium text-green-600">✅ Registration Complete!</p>
                      <p className="text-sm text-foreground/70">
                        Your registration has been approved and is now complete! You can attend the event.
                      </p>
                    </>
                  ) : event?.isPaid && event?.price ? (
                    <>
                      <p className="text-lg font-medium text-orange-600">💰 Payment Required</p>
                      <p className="text-sm text-foreground/70">
                        Your registration has been approved! Please complete payment to finalize your ticket.
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

          {/* Payment Step for Approved Paid Events */}
          {submitted.status === "approved" && paymentStep === 'payment' && event?.isPaid && event?.price && (
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
                    Pay {event.price} Sonic Tokens to complete your registration and receive your ticket
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
                  Back to Details
                </button>
                <button 
                  onClick={handlePayment}
                  disabled={isPaymentPending || isDirectPaymentPending || isBuyTicketPending || isMintForUserPending}
                  className="btn-primary flex-1"
                >
                  {(isPaymentPending || isDirectPaymentPending || isBuyTicketPending || isMintForUserPending) ? (
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

          {/* Payment Processing for Approved Events */}
          {submitted.status === "approved" && paymentStep === 'processing' && event?.isPaid && event?.price && (
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
              </div>
            </div>
          )}

          {/* Payment Success for Approved Events */}
          {submitted.status === "approved" && paymentStep === 'success' && event?.isPaid && event?.price && (
            <div className="card p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-600">Payment Successful!</h3>
                <p className="text-sm text-foreground/70">
                  {event?.approvalNeeded ? 
                    'Your payment has been confirmed! You can now view your NFT ticket on the event page.' :
                    'Your payment has been confirmed. You can now mint your NFT QR ticket.'
                  }
                </p>
                {event?.approvalNeeded && (
                  <div className="space-y-3">
                    <button
                      onClick={() => window.location.href = `/events/${id}`}
                      className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      View Event Page
                    </button>
                  </div>
                )}
                <div className="text-xs text-foreground/50">
                  Debug: Payment Step = {paymentStep} | Event isPaid = {event?.isPaid?.toString()} | Price = {event?.price}
                </div>
                
                {/* Mint NFT Button for Paid Events */}
                {!nftCreated && !nftCreating && !isNFTMinting && !isBuyTicketPending && !isMintForUserPending && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                        Ready to create your NFT QR ticket?
                      </p>
                      <button
                        onClick={createNFTTicket}
                        disabled={nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating NFT...
                          </div>
                        ) : (
                          'Mint NFT QR Ticket'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* NFT QR Code Status */}
                {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Creating NFT QR Ticket...</p>
                    </div>
                    {(isNFTMinting || isBuyTicketPending || isMintForUserPending) && (
                      <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Minting on blockchain...</p>
                    )}
                    {isNFTConfirming && (
                      <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Waiting for confirmation...</p>
                    )}
                  </div>
                ) : nftCreated ? (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm text-green-600 dark:text-green-400">NFT QR Ticket Created!</p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 text-center mb-4">
                      Your blockchain NFT ticket with QR code has been successfully minted.
                    </p>
                    
                    {/* Minted Ticket Display */}
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-green-300 dark:border-green-600">
                      <div className="text-center">
                        <div className="mb-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">NFT TICKET</span>
                          </div>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{event.name}</h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p><span className="font-medium">Date:</span> {event.date}</p>
                          <p><span className="font-medium">Time:</span> {event.time}</p>
                          <p><span className="font-medium">Location:</span> {event.location}</p>
                          <p><span className="font-medium">Participant:</span> {values.name || 'Anonymous'}</p>
                          {nftTokenId && nftTokenId !== 'pending' && nftTokenId !== 'qr-generated' && (
                            <p><span className="font-medium">Token ID:</span> #{nftTokenId}</p>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            This NFT serves as your official event ticket
                          </p>
                          {nftContractAddress && (
                            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 break-all">
                              Contract: {nftContractAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : nftError ? (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-sm text-red-600 dark:text-red-400">NFT Creation Failed</p>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 text-center mb-2">{nftError}</p>
                    <button
                      onClick={createNFTTicket}
                      disabled={nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending}
                      className="btn-primary text-xs px-3 py-1 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retry NFT Creation
                    </button>
                  </div>
                ) : null}

                {paymentReceipt && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-xs text-green-600 dark:text-green-400 mb-1">Transaction Receipt:</p>
                    <p className="font-mono text-xs text-green-800 dark:text-green-200 break-all">{paymentReceipt.hash}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Free Event Completion for Approved Events */}
          {submitted.status === "approved" && paymentStep === 'success' && !event?.isPaid && (
            <div className="card p-6 text-center">
              <div className="space-y-4">
                <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-green-600">
                  {event?.approvalNeeded ? 'Registration Approved!' : 'Registration Complete!'}
                </h3>
                <p className="text-sm text-foreground/70">
                  {event?.approvalNeeded 
                    ? 'Your registration has been approved. You can now mint your NFT ticket.'
                    : 'Your registration is complete. You can now mint your NFT ticket.'
                  }
                </p>
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-xs text-green-600 dark:text-green-400 mb-1">Event Details:</p>
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">{event.name}</p>
                  <p className="text-xs text-green-700 dark:text-green-300">
                    {event.date} at {event.time}
                  </p>
                </div>
                
                {/* Manual NFT Minting for Published Events */}
                {event?.blockchainEventAddress && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">NFT Ticket</h4>
              </div>
                    
                    {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                          <p className="text-sm text-blue-600 dark:text-blue-400">Creating NFT Ticket...</p>
                        </div>
                        {(isNFTMinting || isBuyTicketPending || isMintForUserPending) && (
                          <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Minting on blockchain...</p>
                        )}
                        {isNFTConfirming && (
                          <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Waiting for confirmation...</p>
                        )}
                      </div>
                    ) : nftCreated ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <p className="text-sm text-green-600 dark:text-green-400">NFT Ticket Created!</p>
                        </div>
                        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                          Your blockchain ticket with QR code has been successfully minted.
                        </p>
                      </div>
                    ) : nftError ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <p className="text-sm text-red-600 dark:text-red-400">NFT Creation Failed</p>
                        </div>
                        <p className="text-xs text-red-600 dark:text-red-400 text-center mb-2">{nftError}</p>
                        <button
                          onClick={createNFTTicket}
                          disabled={nftCreating || isNFTMinting}
                          className="btn-primary text-xs px-3 py-1 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Retry NFT Creation
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-xs text-blue-700 dark:text-blue-300 text-center">
                          This event is published on the blockchain. Click the button below to mint your NFT ticket.
                        </p>
                        <button
                          onClick={createNFTTicket}
                          disabled={nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending}
                          className="btn-primary text-sm px-4 py-2 w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              Minting...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                              Mint NFT Ticket
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* NFT Ticket Information */}
          {nftCreated && event?.blockchainEventAddress && (
            <div className="card p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">NFT Ticket Minted!</h3>
              </div>
              <p className="text-xs text-green-700 dark:text-green-300 mb-3">
                Your event ticket has been successfully minted as an NFT on the blockchain with ZK-based QR code!
              </p>
              <div className="text-xs text-green-600 dark:text-green-400 mb-4">
                <p>Contract: {event.blockchainEventAddress}</p>
                {nftTokenId && nftTokenId !== 'pending' && (
                  <p>Token ID: {nftTokenId}</p>
                )}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => router.push(`/events/${id}`)}
                  className="btn-primary text-sm px-4 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  View Event Page
                </button>
                <Link
                  href="/"
                  className="btn-secondary text-sm px-4 py-2 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                  </svg>
                  Explore Events
                </Link>
              </div>
            </div>
          )}

          {/* NFT Ticket Display for Approved Users - Fetch from Wallet */}
          {submitted.status === "approved" && nftCreated && event?.blockchainEventAddress && address && (
            <BlockchainNFTTicket
              eventContractAddress={event.blockchainEventAddress}
              userAddress={address}
              event={{
                name: event.name,
                date: event.date,
                time: event.time,
                location: event.location,
                price: event.price || 0,
                currency: event.currency || 'SONIC',
                approvalNeeded: event.approvalNeeded
              }}
            />
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
                  disabled={isPaymentPending || isDirectPaymentPending || isBuyTicketPending || isMintForUserPending}
                  className="btn-primary flex-1"
                >
                  {(isPaymentPending || isDirectPaymentPending || isBuyTicketPending || isMintForUserPending) ? (
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

          {/* Payment Success with QR Code */}
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
                  Your payment has been confirmed. You can now mint your NFT QR ticket.
                </p>
                
                {/* Mint NFT Button for Paid Events */}
                {!nftCreated && !nftCreating && !isNFTMinting && !isBuyTicketPending && !isMintForUserPending && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="text-center">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-3">
                        Ready to create your NFT QR ticket?
                      </p>
                      <button
                        onClick={createNFTTicket}
                        disabled={nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending}
                        className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Creating NFT...
                          </div>
                        ) : (
                          'Mint NFT QR Ticket'
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* NFT QR Code Status */}
                {nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending ? (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <p className="text-sm text-blue-600 dark:text-blue-400">Creating NFT QR Ticket...</p>
                    </div>
                    {(isNFTMinting || isBuyTicketPending || isMintForUserPending) && (
                      <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Minting on blockchain...</p>
                    )}
                    {isNFTConfirming && (
                      <p className="text-xs text-blue-500 dark:text-blue-300 text-center">Waiting for confirmation...</p>
                    )}
                  </div>
                ) : nftCreated ? (
                  <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <p className="text-sm text-green-600 dark:text-green-400">NFT QR Ticket Created!</p>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 text-center mb-4">
                      Your blockchain NFT ticket with QR code has been successfully minted.
                    </p>
                    
                    {/* Minted Ticket Display */}
                    <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border-2 border-dashed border-green-300 dark:border-green-600">
                      <div className="text-center">
                        <div className="mb-4">
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9a2 2 0 012-2m0 0V7a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">NFT TICKET</span>
                          </div>
                        </div>
                        
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{event.name}</h4>
                        <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                          <p><span className="font-medium">Date:</span> {event.date}</p>
                          <p><span className="font-medium">Time:</span> {event.time}</p>
                          <p><span className="font-medium">Location:</span> {event.location}</p>
                          <p><span className="font-medium">Participant:</span> {values.name || 'Anonymous'}</p>
                          {nftTokenId && nftTokenId !== 'pending' && nftTokenId !== 'qr-generated' && (
                            <p><span className="font-medium">Token ID:</span> #{nftTokenId}</p>
                          )}
                        </div>
                        
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                            This NFT serves as your official event ticket
                          </p>
                          {nftContractAddress && (
                            <p className="text-xs font-mono text-gray-400 dark:text-gray-500 break-all">
                              Contract: {nftContractAddress}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : nftError ? (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <p className="text-sm text-red-600 dark:text-red-400">NFT Creation Failed</p>
                    </div>
                    <p className="text-xs text-red-600 dark:text-red-400 text-center mb-2">{nftError}</p>
                    <button
                      onClick={createNFTTicket}
                      disabled={nftCreating || isNFTMinting || isBuyTicketPending || isMintForUserPending}
                      className="btn-primary text-xs px-3 py-1 w-full disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Retry NFT Creation
                    </button>
                  </div>
                ) : null}
                
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
