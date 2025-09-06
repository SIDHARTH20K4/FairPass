"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAccount } from "wagmi";
import { useEffect, useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import ImageDropzone from "@/components/ImageDropzone";
import CustomDatePicker from "@/components/DatePicker";
import CustomTimePicker from "@/components/TimePicker";
import SimpleDatePicker from "@/components/SimpleDatePicker";
import SimpleTimePicker from "@/components/SimpleTimePicker";
import LocationMap from "@/components/LocationMap";
import { uploadImageToIPFS } from "@/lib/ipfs";
import React from "react";

export default function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { events, updateEvent } = useEvents();
  const event = events.find((e) => e.id === id);
  const { address } = useAccount();

  const isHost = event?.hostAddress && event.hostAddress === address?.toLowerCase();

  const [name, setName] = useState("");
  const [bannerDataUrl, setBannerDataUrl] = useState<string>("");
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState<string>("");
  const [currency, setCurrency] = useState<string>("SONIC");
  const [approvalNeeded, setApprovalNeeded] = useState(false);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [organization, setOrganization] = useState("");
  const [organizationDescription, setOrganizationDescription] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!event) return;
    setName(event.name || "");
    setIsPaid(!!event.isPaid);
    setPrice(event.price != null ? String(event.price) : "");
    setCurrency(event.currency || "SONIC");
    setApprovalNeeded(!!event.approvalNeeded);
    setDate(event.date || "");
    setTime(event.time || "");
    setLocation(event.location || "");
    setOrganization(event.organization || "");
    setOrganizationDescription(event.organizationDescription || "");
    setEventDescription(event.eventDescription || "");
    setLat(event.lat != null ? String(event.lat) : "");
    setLng(event.lng != null ? String(event.lng) : "");
  }, [event]);

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  if (!isHost) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-6"><Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link></div>
        <p className="text-sm">Not authorized. Connect as the host wallet to edit this event.</p>
      </main>
    );
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    
    try {
      setSaving(true);
      let bannerUrl = event.bannerUrl;
      let bannerCid = event.bannerCid;
      if (bannerDataUrl) {
        const uploaded = await uploadImageToIPFS(bannerDataUrl);
        bannerUrl = uploaded.url;
        bannerCid = uploaded.cid;
      }

      updateEvent(id, {
        name,
        bannerUrl,
        bannerCid,
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
      });

      router.push(`/events/${id}`);
    } catch (err: any) {
      alert(err?.message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
        <h1 className="text-2xl font-semibold tracking-tight">Edit event</h1>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="name">Event name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
        </div>

        <ImageDropzone value={bannerDataUrl} onChange={setBannerDataUrl} label="Replace banner image (optional)" />

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="org">Host organization</label>
          <input id="org" type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="orgdesc">Organization description</label>
          <textarea id="orgdesc" value={organizationDescription} onChange={(e) => setOrganizationDescription(e.target.value)} rows={3} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="eventdesc">Event description</label>
          <textarea id="eventdesc" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} rows={6} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium" htmlFor="location">Location</label>
          <input id="location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <SimpleDatePicker 
              value={date} 
              onChange={setDate} 
              label="Event Date" 
            />
          </div>
          <div className="space-y-2">
            <SimpleTimePicker 
              value={time} 
              onChange={setTime} 
              label="Event Time" 
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
          <button type="submit" disabled={saving} className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50">{saving ? "Saving..." : "Save changes"}</button>
        </div>
      </form>
    </main>
  );
}
