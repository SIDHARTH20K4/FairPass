"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ImageDropzone from "@/components/ImageDropzone";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import SimpleTimePicker from "@/components/SimpleTimePicker";
import LocationMap from "@/components/LocationMap";
import { uploadImageToIPFS } from "@/lib/ipfs";
import { useAuth } from "@/hooks/useAuth";
import { apiCreateEvent } from "@/lib/api";
import { useEventFactory } from "@/hooks/useWeb3";
import { EventType, web3Service } from "@/services/Web3Service";
import { WEB3_CONFIG } from "@/config/web3";
import WalletConnect from "@/components/WalletConnect";
import TransactionStatus from "@/components/TransactionStatus";

const LOCATIONS = [
  "Singapore","Mumbai","Bengaluru","Delhi","Jakarta","Seoul","Tokyo","Sydney","Taipei","Dubai","London","Paris","Berlin","Lisbon","Amsterdam","San Francisco","New York","Toronto","Austin","Buenos Aires","São Paulo","Cape Town","Nairobi","Worldwide",
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)", symbol: "$" },
  { value: "INR", label: "INR (₹)", symbol: "₹" },
  { value: "THB", label: "THB (฿)", symbol: "฿" },
  { value: "EUR", label: "EUR (€)", symbol: "€" },
  { value: "GBP", label: "GBP (£)", symbol: "£" },
  { value: "SGD", label: "SGD (S$)", symbol: "S$" },
];

export default function CreateEventPage() {
  const router = useRouter();
  const { organization, isAuthenticated, loading: authLoading } = useAuth();
  
  // Web3 integration
  const { isInitialized, isConnected, address, createEvent, error: web3Error } = useEventFactory();

  const [name, setName] = useState("");
  const [bannerDataUrl, setBannerDataUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [organizationName, setOrganizationName] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [useBlockchain, setUseBlockchain] = useState(true); // Always true for blockchain events
  const [blockchainEventAddress, setBlockchainEventAddress] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/host/signin');
    }
  }, [authLoading, isAuthenticated, router]);

  // Auto-populate organization data when available
  useEffect(() => {
    if (organization) {
      setOrganizationName(organization.name);
      setOrganizationDescription(organization.description || "");
    }
  }, [organization]);

  const isValid = name && bannerDataUrl && date && time && location && isConnected;

  const steps = [
    { id: 1, title: "Basic Info", description: "Event name and banner" },
    { id: 2, title: "Details", description: "Description and organization" },
    { id: 3, title: "Location & Time", description: "When and where" },
    { id: 4, title: "Settings", description: "Pricing and approval" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !organization) {
      alert("Please sign in to create events");
      return;
    }

    if (!isConnected) {
      alert("Please connect your wallet to create events");
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload banner image to IPFS
      const { cid, url } = await uploadImageToIPFS(bannerDataUrl);
      
      let blockchainEventAddress: string | null = null;
      
      // Create blockchain event (always required)
      if (isConnected && isInitialized) {
        try {
          // Determine event type
          let eventType: EventType;
          if (approvalNeeded) {
            eventType = EventType.APPROVAL;
          } else if (isPaid && price) {
            eventType = EventType.PAID;
          } else {
            eventType = EventType.FREE;
          }

          // Convert price to wei if paid event
          const ticketPrice = isPaid && price ? web3Service.parseEther(price) : "0";

          // Create event on blockchain
          blockchainEventAddress = await createEvent({
            name,
            eventType,
            ticketPrice
          });

          setBlockchainEventAddress(blockchainEventAddress);
          setTransactionHash(blockchainEventAddress); // For transaction status display
        } catch (blockchainError) {
          console.error('Blockchain event creation failed:', blockchainError);
          alert(`Blockchain event creation failed: ${(blockchainError as Error).message}`);
          return;
        }
      }

      // Create event in backend database
      const payload = {
        name,
        isPaid,
        price: isPaid && price ? Number(price) : undefined,
        currency: isPaid ? currency : undefined,
        approvalNeeded,
        date,
        time,
        location,
        organization: organizationName,
        organizationDescription,
        eventDescription,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        hostAddress: organization.address,
        status: 'draft' as const,
        blockchainEventAddress, // Include blockchain address if created
        useBlockchain
      };
      
      const eventData = { ...payload, bannerUrl: url, bannerCid: cid };
      const createdEvent = await apiCreateEvent(eventData);
      
      // Show success message
      if (blockchainEventAddress) {
        alert(`Event created successfully!\nBlockchain Address: ${blockchainEventAddress}`);
      } else {
        alert('Event created successfully!');
      }
      
      router.replace('/host/dashboard');
    } catch (e: any) {
      alert(e?.message || 'Failed to create event');
    } finally {
      setSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-foreground/20 border-t-foreground rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-foreground/60">Loading...</p>
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect to signin
  }

  return (
    <main className="min-h-screen bg-foreground/2">
      {/* Header Section */}
      <div className="bg-foreground/5 text-foreground py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto mb-6">
            Share your event with the world. All events are deployed as smart contracts with NFT tickets.
          </p>
          
          {/* Testnet Notice */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 max-w-2xl mx-auto mb-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-medium text-blue-900 dark:text-blue-100">Sonic Testnet Mode</p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Currently using Sonic testnet. No real S tokens required for testing.
                </p>
              </div>
            </div>
          </div>
          
          {/* Wallet Connection Notice */}
          {!isConnected && (
            <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 max-w-2xl mx-auto">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="font-medium text-orange-900 dark:text-orange-100">Wallet Required</p>
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Connect your wallet to create blockchain events with NFT tickets
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mx-auto max-w-4xl px-4 -mt-8 mb-8">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                  currentStep >= step.id 
                    ? 'border-foreground bg-foreground text-foreground-foreground' 
                    : 'border-foreground/20 text-foreground/40'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-medium">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-all duration-200 ${
                    currentStep > step.id ? 'bg-foreground' : 'bg-foreground/20'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
          <div className="mt-4 text-center">
            <h3 className="text-lg font-semibold text-foreground">
              {steps[currentStep - 1].title}
            </h3>
            <p className="text-foreground/60">{steps[currentStep - 1].description}</p>
          </div>
        </div>
      </div>

      {/* Form Content */}
      <div className="mx-auto max-w-4xl px-4 pb-16">
        <form onSubmit={submit} className="space-y-8">
          {/* Step 1: Basic Info */}
          {currentStep === 1 && (
            <div className="card p-8 fade-in">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Basic Information</h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="name">
                    Event Name *
                  </label>
                  <input 
                    id="name" 
                    type="text" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    className="input text-lg" 
                    placeholder="Enter your event name"
                    required 
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground">
                    Event Banner Image *
                  </label>
                  <ImageDropzone 
                    value={bannerDataUrl} 
                    onChange={setBannerDataUrl} 
                    label="Upload a banner image for your event" 
                  />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <div></div>
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)}
                  disabled={!name || !bannerDataUrl}
                  className="btn-primary"
                >
                  Next: Event Details
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Details */}
          {currentStep === 2 && (
            <div className="card p-8 fade-in">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Event Details</h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="org">
                    Host Organization
                  </label>
          <input 
            id="org" 
            type="text" 
            value={organizationName} 
            onChange={(e) => setOrganizationName(e.target.value)} 
                    className="input" 
                    placeholder="Your organization name"
          />
        </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="orgdesc">
                    Organization Description
                  </label>
          <textarea 
            id="orgdesc" 
            value={organizationDescription} 
            onChange={(e) => setOrganizationDescription(e.target.value)} 
            rows={3} 
                    className="input resize-none"
                    placeholder="Tell people about your organization"
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground">
                    Event Description (Markdown supported)
                  </label>
                  <textarea 
                    value={eventDescription} 
                    onChange={(e) => setEventDescription(e.target.value)} 
                    rows={8} 
                    className="input resize-none"
                    placeholder="Describe your event in detail..."
          />
        </div>
              </div>

              <div className="flex justify-between mt-8">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(1)}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(3)}
                  className="btn-primary"
                >
                  Next: Location & Time
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
              </div>
        </div>
          )}

          {/* Step 3: Location & Time */}
          {currentStep === 3 && (
            <div className="card p-8 fade-in">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Location & Time</h2>
              
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground" htmlFor="location">
                    Location
                  </label>
                  <select 
                    id="location" 
                    value={location} 
                    onChange={(e) => setLocation(e.target.value)} 
                    className="input"
                  >
                    {LOCATIONS.map((loc) => (
                      <option key={loc} value={loc}>{loc}</option>
                    ))}
          </select>
        </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-3">
            <SimpleDatePicker value={date} onChange={setDate} label="Event Date" required />
          </div>
                  <div className="space-y-3">
            <SimpleTimePicker value={time} onChange={setTime} label="Event Time" required />
          </div>
        </div>

                <div className="space-y-3">
                  <label className="block text-lg font-medium text-foreground">
                    Precise Location (Optional)
                  </label>
        <LocationMap 
          lat={lat ? Number(lat) : undefined}
          lng={lng ? Number(lng) : undefined}
          onLocationChange={(lat, lng) => { setLat(lat.toString()); setLng(lng.toString()); }}
        />
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(2)}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(4)}
                  disabled={!date || !time}
                  className="btn-primary"
                >
                  Next: Settings
                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>
          </div>
            </div>
          )}

          {/* Step 4: Settings */}
          {currentStep === 4 && (
            <div className="card p-8 fade-in">
              <h2 className="text-2xl font-semibold text-foreground mb-6">Event Settings</h2>
              
              <div className="space-y-8">
                {/* Event Type Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-foreground">Event Type</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* FREE Event */}
                    <label className={`flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      !isPaid 
                        ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                        : 'border-foreground/20 hover:border-foreground/40'
                    }`}>
                      <input 
                        type="radio" 
                        name="eventType" 
                        checked={!isPaid} 
                        onChange={() => setIsPaid(false)} 
                        className="sr-only"
                      />
                      <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">Free Event</h4>
                      <p className="text-sm text-foreground/60 text-center">Anyone can attend without payment</p>
                    </label>

                    {/* PAID Event */}
                    <label className={`flex flex-col items-center p-4 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                      isPaid 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' 
                        : 'border-foreground/20 hover:border-foreground/40'
                    }`}>
                      <input 
                        type="radio" 
                        name="eventType" 
                        checked={isPaid} 
                        onChange={() => setIsPaid(true)} 
                        className="sr-only"
                      />
                      <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-3">
                        <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <h4 className="font-semibold text-foreground mb-1">Paid Event</h4>
                      <p className="text-sm text-foreground/60 text-center">Attendees pay to participate</p>
                    </label>
                  </div>
                  
                  {/* Approval Setting - Separate from event type */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">Registration Approval</h4>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="checkbox" 
                        checked={approvalNeeded} 
                        onChange={(e) => setApprovalNeeded(e.target.checked)} 
                        className="w-4 h-4 text-purple-600"
                      />
                      <span className="text-sm font-medium group-hover:text-foreground/80 transition-colors">
                        Require manual approval for registrations
                      </span>
                    </label>
                    <p className="text-xs text-foreground/60">
                      If enabled, you'll need to manually approve each registration before participants can attend.
                    </p>
                  </div>
                  
                  {/* Pricing Configuration */}
                  {isPaid && (
                    <div className="glass p-6 rounded-xl space-y-4">
                      <h4 className="font-medium text-foreground">Ticket Pricing</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground/80">Price (ETH)</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60">
                              Ξ
                            </span>
                            <input 
                              type="number" 
                              min="0" 
                              step="0.001" 
                              value={price} 
                              onChange={(e) => setPrice(e.target.value)} 
                              placeholder="0.001" 
                              className="input pl-8" 
                            />
                          </div>
                          <p className="text-xs text-foreground/60">
                            Price in ETH for blockchain tickets
                          </p>
        </div>
        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground/80">Traditional Currency</label>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60">
                                {CURRENCIES.find(c => c.value === currency)?.symbol}
                              </span>
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                placeholder="0.00" 
                                className="input pl-8" 
                                disabled
                              />
                            </div>
                          <select 
                            value={currency} 
                            onChange={(e) => setCurrency(e.target.value)} 
                              className="input w-20"
                              disabled
                          >
                            {CURRENCIES.map((curr) => (
                                <option key={curr.value} value={curr.value}>{curr.value}</option>
                            ))}
                          </select>
                          </div>
                          <p className="text-xs text-foreground/60">
                            For reference only (blockchain uses ETH)
                          </p>
                        </div>
                      </div>
                      
                      {/* Blockchain Features */}
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                        <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Blockchain Features</h5>
                        <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                          <li>• NFT tickets with unique metadata</li>
                          <li>• Resale marketplace (up to 3 times)</li>
                          <li>• Platform fee: 1% on resales</li>
                          <li>• Secure ownership verification</li>
                        </ul>
                      </div>
                    </div>
                  )}

                </div>

                {/* Blockchain Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-foreground">Blockchain Integration</h3>
                  
                  <div className="glass p-4 rounded-lg space-y-4">
                      {!isConnected ? (
                        <div className="text-center py-6">
                          <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                          </div>
                          <p className="text-foreground/70 mb-4">Connect your wallet to deploy the event contract</p>
                          <WalletConnect 
                            onConnect={(address) => {
                              console.log('Wallet connected:', address);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                              <span className="font-medium text-foreground">Wallet Connected</span>
                            </div>
                            <div className="text-xs text-foreground/60 font-mono bg-foreground/5 px-2 py-1 rounded">
                              {address?.slice(0, 6)}...{address?.slice(-4)}
                            </div>
                          </div>
                          
                          {web3Error && (
                            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                              <div className="flex items-start gap-3">
                                <div className="w-5 h-5 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                  </svg>
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                                    {web3Error.includes('timeout') ? 'Transaction Timeout' : 'Contract Not Deployed'}
                                  </p>
                                  <p className="text-sm text-red-800 dark:text-red-200 mb-3">
                                    {web3Error}
                                  </p>
                                  
                                  {web3Error.includes('timeout') ? (
                                    <div className="bg-yellow-100 dark:bg-yellow-900/30 rounded-lg p-3">
                                      <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-2">
                                        Transaction may still be processing:
                                      </p>
                                      <p className="text-xs text-yellow-800 dark:text-yellow-200 mb-2">
                                        Check the transaction status on Sonic Explorer to see if it succeeded.
                                      </p>
                                      <a 
                                        href={`https://testnet.sonicscan.org/tx/${web3Error.includes('0x') ? web3Error.match(/0x[a-fA-F0-9]{64}/)?.[0] || '0x09477358c4455bf52aa683e9c41742ae400d6195572884edef6e570eb11781b1' : '0x09477358c4455bf52aa683e9c41742ae400d6195572884edef6e570eb11781b1'}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-xs text-yellow-600 dark:text-yellow-400 hover:underline"
                                      >
                                        Check Transaction Status
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                      </a>
                                    </div>
                                  ) : (
                                    <div className="bg-red-100 dark:bg-red-900/30 rounded-lg p-3">
                                      <p className="text-xs font-medium text-red-900 dark:text-red-100 mb-2">
                                        Quick Fix:
                                      </p>
                                      <code className="text-xs text-red-800 dark:text-red-200 block">
                                        cd web3 && forge script script/DeploySonicTestnet.s.sol --rpc-url sonic_testnet --broadcast
                                      </code>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {transactionHash && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                              <h5 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Contract Deployment</h5>
                            <TransactionStatus 
                              hash={transactionHash}
                              onSuccess={(receipt) => {
                                  console.log('Contract deployed:', receipt);
                                  setBlockchainEventAddress(receipt.contractAddress);
                              }}
                              onError={(error) => {
                                  console.error('Deployment failed:', error);
                                }}
                              />
                            </div>
                          )}
                          
                          {blockchainEventAddress && (
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                              <h5 className="font-medium text-green-900 dark:text-green-100 mb-2">Contract Deployed Successfully!</h5>
                              <p className="text-sm text-green-800 dark:text-green-200 font-mono break-all">
                                {blockchainEventAddress}
                              </p>
                              <a 
                                href={`https://testnet.sonicscan.org/address/${blockchainEventAddress}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 hover:underline mt-2"
                              >
                                View on SonicScan
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                </div>

              </div>

              <div className="flex justify-between mt-8">
                <button 
                  type="button" 
                  onClick={() => setCurrentStep(3)}
                  className="btn-secondary"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>
                <button 
                  type="submit" 
                  disabled={!isValid || submitting} 
                  className="btn-primary text-lg px-8 py-3"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-foreground-foreground/20 border-t-foreground-foreground rounded-full animate-spin mr-2"></div>
                      Deploying Contract...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                      </svg>
                      Deploy Event Contract
                    </>
                  )}
                </button>
        </div>
        </div>
          )}
      </form>
      </div>
    </main>
  );
}


