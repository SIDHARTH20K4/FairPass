"use client";

import { useState, useMemo } from "react";
import { useEvents } from "@/hooks/useEvents";
import LocationExplorer from "@/components/LocationExplorer";
import EventTimeline from "@/components/EventTimeline";

export default function EventsPage() {
  const { events, byLocation } = useEvents();
  const [loc, setLoc] = useState<string>("Worldwide");

  const countryCounts = useMemo(() => {
    const cityToCountry: Record<string, string> = {
      "Singapore": "Singapore",
      "Mumbai": "India",
      "Bengaluru": "India",
      "Delhi": "India",
      "Jakarta": "Indonesia",
      "Seoul": "South Korea",
      "Tokyo": "Japan",
      "Sydney": "Australia",
      "Taipei": "Taiwan",
      "Dubai": "UAE",
      "London": "United Kingdom",
      "Paris": "France",
      "Berlin": "Germany",
      "Lisbon": "Portugal",
      "Amsterdam": "Netherlands",
      "San Francisco": "United States",
      "New York": "United States",
      "Toronto": "Canada",
      "Austin": "United States",
      "Buenos Aires": "Argentina",
      "São Paulo": "Brazil",
      "Cape Town": "South Africa",
      "Nairobi": "Kenya",
      "Worldwide": "Worldwide",
    };

    const countryEventCounts = new Map<string, number>();
    const countryRegions: Record<string, string> = {
      "Singapore": "Asia & Pacific",
      "India": "Asia & Pacific",
      "Indonesia": "Asia & Pacific",
      "South Korea": "Asia & Pacific",
      "Japan": "Asia & Pacific",
      "Australia": "Asia & Pacific",
      "Taiwan": "Asia & Pacific",
      "UAE": "Asia & Pacific",
      "United Kingdom": "Europe",
      "France": "Europe",
      "Germany": "Europe",
      "Portugal": "Europe",
      "Netherlands": "Europe",
      "United States": "North America",
      "Canada": "North America",
      "Argentina": "South America",
      "Brazil": "South America",
      "South Africa": "Africa",
      "Kenya": "Africa",
      "Worldwide": "Worldwide",
    };

    // Count events by country
    for (const event of events) {
      const country = cityToCountry[event.location] || event.location;
      countryEventCounts.set(country, (countryEventCounts.get(country) || 0) + 1);
    }

    // Add Worldwide count
    if (!countryEventCounts.has("Worldwide")) {
      countryEventCounts.set("Worldwide", events.length);
    }

    return Array.from(countryEventCounts.entries()).map(([country, count]) => ({
      name: country,
      count,
      region: countryRegions[country] || "Worldwide"
    }));
  }, [events]);

  const visible = useMemo(() => {
    if (loc === "Worldwide") return events;
    // For country selection, show events from cities in that country
    const cityToCountry: Record<string, string> = {
      "Singapore": "Singapore",
      "Mumbai": "India",
      "Bengaluru": "India",
      "Delhi": "India",
      "Jakarta": "Indonesia",
      "Seoul": "South Korea",
      "Tokyo": "Japan",
      "Sydney": "Australia",
      "Taipei": "Taiwan",
      "Dubai": "UAE",
      "London": "United Kingdom",
      "Paris": "France",
      "Berlin": "Germany",
      "Lisbon": "Portugal",
      "Amsterdam": "Netherlands",
      "San Francisco": "United States",
      "New York": "United States",
      "Toronto": "Canada",
      "Austin": "United States",
      "Buenos Aires": "Argentina",
      "São Paulo": "Brazil",
      "Cape Town": "South Africa",
      "Nairobi": "Kenya",
    };

    if (loc === "Worldwide") return events;
    
    // Filter events by country
    return events.filter(event => {
      const eventCountry = cityToCountry[event.location] || event.location;
      return eventCountry === loc;
    });
  }, [events, loc]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="text-center mb-12 fade-in">
        <h1 className="text-4xl font-bold text-foreground mb-4">Discover Events</h1>
        <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
          Explore amazing events happening around the world
        </p>
      </div>

      <LocationExplorer cities={countryCounts} onSelect={(country) => setLoc(country)} />

      {visible.length > 0 ? (
        <div className="fade-in">
          <EventTimeline events={visible} />
        </div>
      ) : (
        <div className="text-center py-16 card fade-in">
          <div className="w-16 h-16 bg-foreground/5 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-foreground/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No events found</h3>
          <p className="text-foreground/60">No events are available for this location yet.</p>
        </div>
      )}
    </main>
  );
}
