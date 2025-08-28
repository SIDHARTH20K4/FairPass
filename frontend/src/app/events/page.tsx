"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/hooks/useEvents";
import LocationExplorer from "@/components/LocationExplorer";
import EventTimeline from "@/components/EventTimeline";

export default function EventsPage() {
  const { events, byLocation } = useEvents();
  const [loc, setLoc] = useState<string>("Worldwide");

  const cityCounts = useMemo(() => {
    const regionOf: Record<string, string> = {
      "Singapore": "Asia & Pacific",
      "Mumbai": "Asia & Pacific",
      "Bengaluru": "Asia & Pacific",
      "Delhi": "Asia & Pacific",
      "Jakarta": "Asia & Pacific",
      "Seoul": "Asia & Pacific",
      "Tokyo": "Asia & Pacific",
      "Sydney": "Asia & Pacific",
      "Taipei": "Asia & Pacific",
      "Dubai": "Asia & Pacific",
      "London": "Europe",
      "Paris": "Europe",
      "Berlin": "Europe",
      "Lisbon": "Europe",
      "Amsterdam": "Europe",
      "San Francisco": "North America",
      "New York": "North America",
      "Toronto": "North America",
      "Austin": "North America",
      "Buenos Aires": "South America",
      "São Paulo": "South America",
      "Cape Town": "Africa",
      "Nairobi": "Africa",
      "Worldwide": "Worldwide",
    };
    const counts = new Map<string, number>();
    for (const e of events) {
      counts.set(e.location, (counts.get(e.location) || 0) + 1);
    }
    if (!counts.has("Worldwide")) counts.set("Worldwide", events.length);
    return Array.from(counts.entries()).map(([name, count]) => ({ name, count, region: regionOf[name] || "Worldwide" }));
  }, [events]);

  const visible = useMemo(() => {
    if (loc === "Worldwide") return events;
    return byLocation(loc);
  }, [events, loc, byLocation]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight mb-4">Events</h1>

      <LocationExplorer cities={cityCounts} onSelect={(city) => setLoc(city)} />

      {visible.length > 0 ? (
        <EventTimeline events={visible} />
      ) : (
        <p className="text-sm text-black/70 dark:text-white/70 mb-8">No events yet for this location.</p>
      )}
    </main>
  );
}
