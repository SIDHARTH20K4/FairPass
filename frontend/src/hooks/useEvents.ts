import { useCallback, useEffect, useMemo, useState } from "react";
import { apiCreateEvent, apiListEvents, apiUpdateEvent } from "@/lib/api";

export type FormField = {
  id: string;
  label: string;
  type: "text" | "email" | "number";
  required?: boolean;
};

export type EventItem = {
  id: string;
  name: string;
  bannerUrl: string; // gateway URL for the banner image
  bannerCid?: string; // optional raw CID
  isPaid: boolean;
  price?: number;
  currency?: string; // e.g., USD, INR, THB
  approvalNeeded: boolean;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  location: string;
  organization?: string;
  organizationDescription?: string;
  eventDescription?: string;
  lat?: number;
  lng?: number;
  formSchema?: FormField[];
  hostAddress?: string; // organizer wallet address (lowercased)
  createdAt: number;
};

const STORAGE_KEY = "fairpass.events.v1";

function readStored(): EventItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as EventItem[]) : [];
  } catch {
    return [];
  }
}

function writeStored(events: EventItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

const HAS_API = !!process.env.NEXT_PUBLIC_API_URL;

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const loadEvents = useCallback(async (location?: string) => {
    try {
      setLoading(true);
      if (HAS_API) {
        const list = await apiListEvents(location);
        setEvents(list as EventItem[]);
      } else {
        const stored = readStored();
        if (location && location !== 'Worldwide') {
          setEvents(stored.filter(e => e.location === location));
        } else {
          setEvents(stored);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const addEvent = useCallback(async (e: Omit<EventItem, "id" | "createdAt">) => {
    if (HAS_API) {
      const created = await apiCreateEvent(e);
      setEvents((prev) => [created as EventItem, ...prev]);
      return (created as EventItem).id;
    }
    const id = `${Date.now()}`;
    const next = [{ id, createdAt: Date.now(), ...e }, ...readStored()];
    setEvents(next);
    writeStored(next);
    return id;
  }, []);

  const updateEvent = useCallback(async (id: string, patch: Partial<EventItem>) => {
    if (HAS_API) {
      const updated = await apiUpdateEvent(id, patch);
      setEvents((prev) => prev.map((ev) => (ev.id === id ? (updated as EventItem) : ev)));
      return;
    }
    const current = readStored();
    const next = current.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev));
    setEvents(next);
    writeStored(next);
  }, []);

  const clearAll = useCallback(() => {
    setEvents([]);
    writeStored([]);
  }, []);

  return {
    events,
    loading,
    addEvent,
    updateEvent,
    clearAll,
    loadEvents
  };
}
