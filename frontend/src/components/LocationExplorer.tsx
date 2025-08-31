"use client";

import React from "react";

type Country = {
  name: string;
  region: string; // e.g., "Asia & Pacific", "Europe" etc
  count: number;
};

const DEFAULT_COUNTRIES: Country[] = [
  // Asia & Pacific
  { name: "Singapore", region: "Asia & Pacific", count: 0 },
  { name: "India", region: "Asia & Pacific", count: 0 },
  { name: "Indonesia", region: "Asia & Pacific", count: 0 },
  { name: "South Korea", region: "Asia & Pacific", count: 0 },
  { name: "Japan", region: "Asia & Pacific", count: 0 },
  { name: "Australia", region: "Asia & Pacific", count: 0 },
  { name: "Taiwan", region: "Asia & Pacific", count: 0 },
  { name: "UAE", region: "Asia & Pacific", count: 0 },

  // Europe
  { name: "United Kingdom", region: "Europe", count: 0 },
  { name: "France", region: "Europe", count: 0 },
  { name: "Germany", region: "Europe", count: 0 },
  { name: "Portugal", region: "Europe", count: 0 },
  { name: "Netherlands", region: "Europe", count: 0 },

  // North America
  { name: "United States", region: "North America", count: 0 },
  { name: "Canada", region: "North America", count: 0 },

  // South America
  { name: "Argentina", region: "South America", count: 0 },
  { name: "Brazil", region: "South America", count: 0 },

  // Africa
  { name: "South Africa", region: "Africa", count: 0 },
  { name: "Kenya", region: "Africa", count: 0 },

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
  cities: Country[];
  onSelect: (country: string) => void;
}) {
  // Merge incoming counts into defaults
  const byName = new Map(DEFAULT_COUNTRIES.map((c) => [c.name, { ...c }]));
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
    <section className="mb-12 fade-in">
      {/* Region filter tabs */}
      <div className="flex flex-wrap gap-3 mb-8">
        {regions.map((r) => (
          <button
            key={r}
            onClick={() => setActive(r)}
            className={`px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
              r === active 
                ? "glass-card text-foreground shadow-lg" 
                : "text-foreground/60 hover:text-foreground/80 hover:bg-foreground/5"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {/* Countries grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {filtered.map((c, index) => (
          <div key={`${c.region}-${c.name}`} className="slide-in" style={{ animationDelay: `${index * 50}ms` }}>
            <button
              onClick={() => onSelect(c.name)}
              className="w-full text-left card p-5 hover:scale-105 transition-all duration-300 group"
            >
              <div className="space-y-2">
                <div className="font-semibold text-foreground group-hover:text-foreground/80 transition-colors">
                  {c.name}
                </div>
                <div className="text-sm text-foreground/60">
                  {c.count} Events
                </div>
              </div>
              
              {/* Hover effect indicator */}
              <div className="mt-3 w-0 h-0.5 bg-foreground transition-all duration-300 group-hover:w-full"></div>
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
