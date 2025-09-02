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
      alert("Please sign in to create events");
      return;
    }
    try {
      setSubmitting(true);
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
      };
      
      const { cid, url } = await uploadImageToIPFS(bannerDataUrl);
      const eventData = { ...payload, bannerUrl: url, bannerCid: cid };
      const createdEvent = await apiCreateEvent(eventData);
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
          <p className="text-xl text-foreground/80 max-w-2xl mx-auto">
            Share your event with the world. Fill in the details below to get started.
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
                {/* Pricing Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-foreground">Pricing</h3>
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="pricing" 
                        checked={!isPaid} 
                        onChange={() => setIsPaid(false)} 
                        className="w-4 h-4 text-foreground"
                      />
                      <span className="text-lg group-hover:text-foreground/80 transition-colors">Free Event</span>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="pricing" 
                        checked={isPaid} 
                        onChange={() => setIsPaid(true)} 
                        className="w-4 h-4 text-foreground"
                      />
                      <span className="text-lg group-hover:text-foreground/80 transition-colors">Paid Event</span>
                    </label>
                  </div>
                  
                  {isPaid && (
                    <div className="glass p-6 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground/80">Price</label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground/60">
                              {CURRENCIES.find(c => c.value === currency)?.symbol}
                            </span>
                            <input 
                              type="number" 
                              min="0" 
                              step="0.01" 
                              value={price} 
                              onChange={(e) => setPrice(e.target.value)} 
                              placeholder="0.00" 
                              className="input pl-8" 
                            />
                          </div>
        </div>
        <div className="space-y-2">
                          <label className="block text-sm font-medium text-foreground/80">Currency</label>
                          <select 
                            value={currency} 
                            onChange={(e) => setCurrency(e.target.value)} 
                            className="input"
                          >
                            {CURRENCIES.map((curr) => (
                              <option key={curr.value} value={curr.value}>{curr.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Approval Section */}
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-foreground">Registration Settings</h3>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input 
                      type="checkbox" 
                      checked={approvalNeeded} 
                      onChange={(e) => setApprovalNeeded(e.target.checked)} 
                      className="w-4 h-4 text-foreground"
                    />
                    <span className="text-lg group-hover:text-foreground/80 transition-colors">
                      Require approval for registrations
                    </span>
                  </label>
                  <p className="text-foreground/60 text-sm">
                    If enabled, you'll need to manually approve each registration before participants can attend.
                  </p>
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
                      Creating Event...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Create Event
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


