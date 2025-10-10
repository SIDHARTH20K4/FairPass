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

const LOCATIONS = [
  "Singapore","Mumbai","Bengaluru","Delhi","Jakarta","Seoul","Tokyo","Sydney","Taipei","Dubai","London","Paris","Berlin","Lisbon","Amsterdam","San Francisco","New York","Toronto","Austin","Buenos Aires","São Paulo","Cape Town","Nairobi","Worldwide",
];

// Location coordinates mapping
const LOCATION_COORDINATES: { [key: string]: [number, number] } = {
  "Singapore": [1.3521, 103.8198],
  "Mumbai": [19.0760, 72.8777],
  "Bengaluru": [12.9716, 77.5946],
  "Delhi": [28.6139, 77.2090],
  "Jakarta": [-6.2088, 106.8456],
  "Seoul": [37.5665, 126.9780],
  "Tokyo": [35.6762, 139.6503],
  "Sydney": [-33.8688, 151.2093],
  "Taipei": [25.0330, 121.5654],
  "Dubai": [25.2048, 55.2708],
  "London": [51.5074, -0.1278],
  "Paris": [48.8566, 2.3522],
  "Berlin": [52.5200, 13.4050],
  "Lisbon": [38.7223, -9.1393],
  "Amsterdam": [52.3676, 4.9041],
  "San Francisco": [37.7749, -122.4194],
  "New York": [40.7128, -74.0060],
  "Toronto": [43.6532, -79.3832],
  "Austin": [30.2672, -97.7431],
  "Buenos Aires": [-34.6118, -58.3960],
  "São Paulo": [-23.5505, -46.6333],
  "Cape Town": [-33.9249, 18.4241],
  "Nairobi": [-1.2921, 36.8219],
  "Worldwide": [0, 0], // Default center for worldwide
};

const CURRENCIES = [
  { value: "SONIC", label: "Sonic Tokens", symbol: "SONIC" },
];

export default function CreateEventPage() {
  const router = useRouter();
  const { organization, isAuthenticated, loading: authLoading } = useAuth();

  const [name, setName] = useState("");
  const [bannerDataUrl, setBannerDataUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SONIC");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [allowResale, setAllowResale] = useState(true);
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
  const [eventCreated, setEventCreated] = useState(false);

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

  // Redirect to dashboard after event creation
  useEffect(() => {
    if (eventCreated) {
      const timer = setTimeout(() => {
        router.push('/host/dashboard');
      }, 2000); // Redirect after 2 seconds to show success message

      return () => clearTimeout(timer);
    }
  }, [eventCreated, router]);

  const isValid = name && bannerDataUrl && date && time && location;

  const steps = [
    { id: 1, title: "Basic Info", description: "Event name and banner" },
    { id: 2, title: "Details", description: "Description and organization" },
    { id: 3, title: "Location & Time", description: "When and where" },
    { id: 4, title: "Settings", description: "Pricing and approval" },
  ];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated || !organization) {
      console.error("Please sign in to create events");
      return;
    }

    if (submitting) {
      console.log('Form submission already in progress, ignoring duplicate submission');
      return;
    }

    try {
      setSubmitting(true);
      
      // Upload banner image to IPFS
      const { cid, url } = await uploadImageToIPFS(bannerDataUrl);
      
      // Create event in backend database
      const payload = {
        name,
        isPaid,
        price: isPaid && price ? Number(price) : undefined,
        currency: isPaid ? currency : undefined,
        approvalNeeded,
        allowResale: !approvalNeeded ? allowResale : false, // Resale only for non-approval events
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
        blockchainEventAddress: null, // No blockchain integration in event creation
        useBlockchain: false // Not using blockchain for event creation
      };
      
      const eventData = { ...payload, bannerUrl: url, bannerCid: cid };
      const createdEvent = await apiCreateEvent(eventData);
      
      setEventCreated(true);
      console.log('Event created successfully:', createdEvent);
    } catch (e: any) {
      console.error('Failed to create event:', e?.message || 'Unknown error');
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
      {/* Success Banner */}
      {eventCreated && (
        <div className="border-b py-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
          <div className="mx-auto max-w-4xl px-4">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-center">
                <h2 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  Event Created Successfully!
                </h2>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Your event has been saved as a draft. Redirecting to dashboard...
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-foreground/5 text-foreground py-16">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold mb-4">Create Your Event</h1>
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto mb-6">
            Create and manage your events. Set up blockchain integration in your organization settings.
          </p>
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
                    ? 'border-blue-600 bg-blue-600 text-white' 
                    : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                }`}>
                  {currentStep > step.id ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">{step.id}</span>
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-4 transition-all duration-200 ${
                    currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
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
                    selectedLocation={location}
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
                  
                  {/* Resale Settings */}
                  <div className="space-y-4">
                    <h4 className="font-medium text-foreground">NFT Ticket Features</h4>
                    
                    {/* Resale Option - Only for non-approval events */}
                    {!approvalNeeded && (
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input 
                          type="checkbox" 
                          checked={allowResale} 
                          onChange={(e) => setAllowResale(e.target.checked)} 
                          className="w-4 h-4 text-green-600"
                        />
                        <div className="flex-1">
                          <span className="text-sm font-medium group-hover:text-foreground/80 transition-colors">
                            Allow ticket resale
                          </span>
                          <p className="text-xs text-foreground/60">
                            Participants can list their NFT tickets for resale (up to 3 times)
                          </p>
                        </div>
                      </label>
                    )}
                    
                    {/* Info for approval events */}
                    {approvalNeeded && (
                      <div className="flex items-start gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <svg className="w-4 h-4 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <p className="text-xs font-medium text-orange-800 dark:text-orange-200">
                          </p>
                          <p className="text-xs text-orange-700 dark:text-orange-300 mt-1">
                            Only available for FREE and PAID events without approval
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                                     {/* Pricing Configuration */}
                   {isPaid && (
                     <div className="glass p-6 rounded-xl space-y-4">
                       <h4 className="font-medium text-foreground">Ticket Pricing</h4>
                       <div className="space-y-4">
                         <div className="space-y-2">
                           <label className="block text-sm font-medium text-foreground/80">Price</label>
                           <div className="flex items-center gap-3">
                             <div className="relative flex-1">
                               <input 
                                 type="number" 
                                 min="0" 
                                 step="0.01" 
                                 value={price} 
                                 onChange={(e) => setPrice(e.target.value)} 
                                 placeholder="0.00" 
                                 className="input w-full" 
                               />
                             </div>
                             <div className="flex items-center gap-2 px-3 py-2 bg-foreground/5 rounded-lg border border-foreground/10">
                               <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                               <span className="text-sm font-medium text-foreground">Sonic Tokens</span>
                             </div>
                           </div>
                           <p className="text-xs text-foreground/60">
                             Price will be charged in Sonic Tokens on the blockchain
                           </p>
                         </div>
                       </div>
                     </div>
                   )}

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
                {!eventCreated ? (
                  <button 
                    type="submit" 
                    disabled={!isValid || submitting} 
                    className="text-lg px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    {submitting ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mr-2"></div>
                        Creating Event...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Create Event
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    type="button"
                    disabled
                    className="text-lg px-8 py-3 bg-green-600 text-white rounded-lg cursor-not-allowed"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Event Created Successfully!
                  </button>
                )}
        </div>
        </div>
          )}
      </form>
      </div>
    </main>
  );
}


