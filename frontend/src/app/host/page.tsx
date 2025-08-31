"use client";

import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";
import { useEvents } from "@/hooks/useEvents";
import ImageDropzone from "@/components/ImageDropzone";
import CustomDatePicker from "@/components/DatePicker";
import CustomTimePicker from "@/components/TimePicker";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import SimpleTimePicker from "@/components/SimpleTimePicker";
import LocationMap from "@/components/LocationMap";
import { uploadImageToIPFS } from "@/lib/ipfs";

const LOCATIONS = [
  "Singapore",
  "Mumbai",
  "Bengaluru",
  "Delhi",
  "Jakarta",
  "Seoul",
  "Tokyo",
  "Sydney",
  "Taipei",
  "Dubai",
  "London",
  "Paris",
  "Berlin",
  "Lisbon",
  "Amsterdam",
  "San Francisco",
  "New York",
  "Toronto",
  "Austin",
  "Buenos Aires",
  "São Paulo",
  "Cape Town",
  "Nairobi",
  "Worldwide",
];

export default function HostPage() {
  const { isConnected, address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const router = useRouter();
  const { addEvent } = useEvents();
  const [orgExists, setOrgExists] = useState<boolean | null>(null);
  const [orgName, setOrgName] = useState("");
  const [orgEmail, setOrgEmail] = useState("");
  const [orgDescription, setOrgDescription] = useState("");
  // Check if organization exists for connected wallet
  async function checkOrganization() {
    if (!address) return;
    try {
      const res = await fetch(`/api/organizations/${address.toLowerCase()}`);
      setOrgExists(res.ok);
    } catch {
      setOrgExists(false);
    }
  }
  
  if (isConnected && orgExists === null) {
    // fire and forget initial check
    checkOrganization();
  }

  async function registerOrganization(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected || !address) {
      alert('Connect wallet first');
      return;
    }
    const payload = {
      address: address.toLowerCase(),
      name: orgName,
      description: orgDescription,
      email: orgEmail,
    };
    const message = JSON.stringify(payload);
    const signature = await signMessageAsync({ message });
    const res = await fetch('/api/organizations', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payload, signature })
    });
    if (!res.ok) {
      alert('Failed to register organization');
      return;
    }
    setOrgExists(true);
  }


  const [name, setName] = useState("");
  const [bannerDataUrl, setBannerDataUrl] = useState("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("USD");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState(LOCATIONS[0]);
  const [organization, setOrganization] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isConnected) {
      alert("Please connect your wallet to create events.");
      return;
    }
    if (!bannerDataUrl) {
      alert("Please add a banner image.");
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
        organization,
        organizationDescription,
        eventDescription,
        lat: lat ? Number(lat) : undefined,
        lng: lng ? Number(lng) : undefined,
        hostAddress: address?.toLowerCase(),
        ts: Date.now(),
        status: 'draft' as const,
      };

      const msg = JSON.stringify(payload);
      await signMessageAsync({ message: msg });

      const { cid, url } = await uploadImageToIPFS(bannerDataUrl);

      // Create event as draft via backend
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          bannerUrl: url,
          bannerCid: cid,
        }),
      });
      if (!res.ok) throw new Error('Failed to create event');
      const created = await res.json();
      router.push(`/host/${address?.toLowerCase()}`);
    } catch (err: any) {
      alert(err?.message || "Failed to create event");
    } finally {
      setSubmitting(false);
    }
  }

  const isValid =
    name.trim().length > 0 &&
    bannerDataUrl.trim().length > 0 &&
    date.trim().length > 0 &&
    time.trim().length > 0 &&
    location.trim().length > 0;

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Become a host</h1>

      {!isConnected && (
        <div className="mb-6">
          <ConnectButton />
        </div>
      )}

      {isConnected && orgExists === false && (
        <form onSubmit={registerOrganization} className="space-y-6">
          <div className="rounded-md border border-black/10 dark:border-white/10 p-4">
            <h2 className="text-lg font-medium mb-2">Register your organization</h2>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="orgName">Organization name</label>
              <input id="orgName" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" required />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="orgEmail">Contact email</label>
              <input id="orgEmail" type="email" value={orgEmail} onChange={(e) => setOrgEmail(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="orgAbout">Description</label>
              <textarea id="orgAbout" value={orgDescription} onChange={(e) => setOrgDescription(e.target.value)} rows={3} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
            </div>
            <div className="mt-3">
              <button type="submit" className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">Sign & Register</button>
            </div>
          </div>
        </form>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="name">Event name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" placeholder="e.g. FairPass Launch Party" required />
        </div>

        <ImageDropzone value={bannerDataUrl} onChange={setBannerDataUrl} label="Event banner image" />

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="org">Host organization</label>
          <input id="org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" placeholder="Organization name" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="orgdesc">Organization description</label>
          <textarea id="orgdesc" value={organizationDescription} onChange={(e) => setOrganizationDescription(e.target.value)} rows={3} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20" placeholder="Brief description of the organization" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Event description (Markdown)</label>
          <textarea value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={6} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none" placeholder="Write details here..." />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="location">Location</label>
          <select id="location" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20">
            {LOCATIONS.map((loc) => (<option key={loc} value={loc}>{loc}</option>))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SimpleDatePicker 
              value={date} 
              onChange={setDate} 
              label="Event Date" 
              required 
            />
          </div>
          <div className="space-y-2">
            <SimpleTimePicker 
              value={time} 
              onChange={setTime} 
              label="Event Time" 
              required 
            />
          </div>
        </div>

        <LocationMap 
          lat={lat ? Number(lat) : undefined}
          lng={lng ? Number(lng) : undefined}
          onLocationChange={(lat, lng) => {
            setLat(lat.toString());
            setLng(lng.toString());
          }}
        />

        <div className="space-y-2">
          <span className="block text-sm font-medium">Pricing</span>
          <div className="flex items-center gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="pricing" checked={!isPaid} onChange={() => setIsPaid(false)} />
              Free
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="radio" name="pricing" checked={isPaid} onChange={() => setIsPaid(true)} />
              Paid
            </label>
          </div>
          {isPaid && (
            <div className="grid grid-cols-3 gap-2 mt-2">
              <input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price" className="col-span-2 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
              <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm">
                <option value="USD">USD</option>
                <option value="INR">INR</option>
                <option value="THB">THB</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={approvalNeeded} onChange={(e) => setApprovalNeeded(e.target.checked)} />
            Approval required
          </label>
        </div>

        <div>
          <button type="submit" disabled={!isValid || submitting} className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">{submitting ? "Creating..." : "Create event"}</button>
        </div>
      </form>
    </main>
  );
}
