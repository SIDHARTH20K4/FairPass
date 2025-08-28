import { useCallback, useEffect, useMemo, useState } from "react";

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

export function useEvents() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    setEvents(readStored());
  }, []);

  const addEvent = useCallback((e: Omit<EventItem, "id" | "createdAt">) => {
    const id = `${Date.now()}`;
    const next = [{ id, createdAt: Date.now(), ...e }, ...readStored()];
    setEvents(next);
    writeStored(next);
    return id;
  }, []);

  const updateEvent = useCallback((id: string, patch: Partial<EventItem>) => {
    const current = readStored();
    const next = current.map((ev) => (ev.id === id ? { ...ev, ...patch } : ev));
    setEvents(next);
    writeStored(next);
  }, []);

  const clearAll = useCallback(() => {
    setEvents([]);
    writeStored([]);
  }, []);

  const byLocation = useCallback(
    (loc: string | "All") =>
      (loc === "All" ? events : events.filter((e) => e.location === loc)),
    [events]
  );

  const locations = useMemo(() => {
    const set = new Set(events.map((e) => e.location));
    return ["All", ...Array.from(set)];
  }, [events]);

  return { events, addEvent, updateEvent, clearAll, byLocation, locations };
}
