"use client";

import React from "react";

type City = {
  name: string;
  region: string; // e.g., "Asia & Pacific", "Europe" etc
  count: number;
};

const DEFAULT_CITIES: City[] = [
  // Asia & Pacific (subset reflecting screenshot)
  { name: "Bangkok", region: "Asia & Pacific", count: 0 },
  { name: "Bengaluru", region: "Asia & Pacific", count: 0 },
  { name: "Dubai", region: "Asia & Pacific", count: 0 },
  { name: "Ho Chi Minh City", region: "Asia & Pacific", count: 0 },
  { name: "Hong Kong", region: "Asia & Pacific", count: 0 },
  { name: "Honolulu", region: "Asia & Pacific", count: 0 },
  { name: "Jakarta", region: "Asia & Pacific", count: 0 },
  { name: "Kuala Lumpur", region: "Asia & Pacific", count: 0 },
  { name: "Manila", region: "Asia & Pacific", count: 0 },
  { name: "Melbourne", region: "Asia & Pacific", count: 0 },
  { name: "Mumbai", region: "Asia & Pacific", count: 0 },
  { name: "New Delhi", region: "Asia & Pacific", count: 0 },
  { name: "Seoul", region: "Asia & Pacific", count: 0 },
  { name: "Singapore", region: "Asia & Pacific", count: 0 },
  { name: "Sydney", region: "Asia & Pacific", count: 0 },
  { name: "Taipei", region: "Asia & Pacific", count: 0 },
  { name: "Tel Aviv-Yafo", region: "Asia & Pacific", count: 0 },
  { name: "Tokyo", region: "Asia & Pacific", count: 0 },

  // Europe (keep concise)
  { name: "London", region: "Europe", count: 0 },
  { name: "Paris", region: "Europe", count: 0 },
  { name: "Berlin", region: "Europe", count: 0 },
  { name: "Lisbon", region: "Europe", count: 0 },
  { name: "Amsterdam", region: "Europe", count: 0 },

  // North America
  { name: "San Francisco", region: "North America", count: 0 },
  { name: "New York", region: "North America", count: 0 },
  { name: "Toronto", region: "North America", count: 0 },
  { name: "Austin", region: "North America", count: 0 },

  // South America
  { name: "Buenos Aires", region: "South America", count: 0 },
  { name: "São Paulo", region: "South America", count: 0 },

  // Africa
  { name: "Cape Town", region: "Africa", count: 0 },
  { name: "Nairobi", region: "Africa", count: 0 },

  // Global
  { name: "Worldwide", region: "Worldwide", count: 0 },
];

const DEFAULT_REGIONS = [
  "Asia & Pacific",
  "Africa",
  "Europe",
  "North America",
  "South America",
  "Worldwide",
];

export default function LocationExplorer({
  cities,
  onSelect,
}: {
  cities: City[];
  onSelect: (city: string) => void;
}) {
  // Merge incoming counts into defaults
  const byName = new Map(DEFAULT_CITIES.map((c) => [c.name, { ...c }]));
  for (const c of cities) {
    const base = byName.get(c.name);
    if (base) base.count = c.count;
    else byName.set(c.name, c);
  }
  const merged = Array.from(byName.values());

  const regions = Array.from(
    new Set([...DEFAULT_REGIONS, ...merged.map((c) => c.region)])
  );
  const [active, setActive] = React.useState(regions[0] || "Asia & Pacific");
  const filtered = merged.filter((c) => c.region === active);

  return (
    <section className="mb-8">
      <div className="flex flex-wrap gap-2 mb-4">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setActive(r)}
            className={`rounded-full px-3 py-1 text-sm border ${
              r === active ? "border-foreground bg-black/5 dark:bg-white/5" : "border-black/10 dark:border-white/10"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((c) => (
          <li key={`${c.region}-${c.name}`}>
            <button
              onClick={() => onSelect(c.name)}
              className="w-full text-left rounded-md border border-black/10 dark:border-white/10 px-4 py-3 hover:bg-black/5 dark:hover:bg-white/5"
            >
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-black/60 dark:text-white/60">{c.count} Events</div>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
