"use client";

import { EventItem } from "@/hooks/useEvents";

function groupByDay(events: EventItem[]) {
  const map = new Map<string, EventItem[]>();
  for (const e of events) {
    const key = e.date; // YYYY-MM-DD
    const arr = map.get(key) || [];
    arr.push(e);
    map.set(key, arr);
  }
  // sort by date ascending
  return Array.from(map.entries()).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

export default function EventTimeline({ events }: { events: EventItem[] }) {
  const groups = groupByDay(events);

  return (
    <div className="relative">
      <div className="absolute left-2 top-0 bottom-0 w-px bg-black/20 dark:bg-white/20" />
      <div className="space-y-8">
        {groups.map(([day, items]) => (
          <section key={day} className="relative pl-8">
            <div className="absolute left-0 top-2 w-3 h-3 rounded-full bg-foreground" />
            <h3 className="text-sm font-medium mb-3">{formatDay(day)}</h3>
            <div className="space-y-4">
              {items.map((e) => (
                <article key={e.id} className="rounded-lg border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-4 flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="text-xs text-black/60 dark:text-white/60">{formatTime(e.time)}</div>
                      {e.isPaid && e.price !== undefined && (
                        <span className="text-[10px] uppercase rounded px-2 py-0.5 border border-black/15 dark:border-white/15">{e.currency || "USD"} {e.price}</span>
                      )}
                    </div>
                    <h4 className="font-medium truncate">{e.name}</h4>
                    <div className="text-xs text-black/70 dark:text-white/70 truncate">{e.organization || ""}</div>
                    <div className="text-xs flex items-center gap-2 text-black/70 dark:text-white/70 mt-1">
                      <span>{e.location}</span>
                    </div>
                  </div>
                  {e.bannerUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={e.bannerUrl} alt="banner" className="w-28 h-20 object-cover rounded-md border border-black/10 dark:border-white/10" />
                  )}
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function formatDay(day: string) {
  const d = new Date(day);
  const formatter = new Intl.DateTimeFormat(undefined, { weekday: "long", month: "long", day: "numeric" });
  const label = formatter.format(d);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  return `${isToday ? "Today" : isTomorrow ? "Tomorrow" : ""} ${label}`.trim();
}

function formatTime(t: string) {
  // expects HH:mm
  try {
    const [h, m] = t.split(":").map((x) => parseInt(x));
    const d = new Date();
    d.setHours(h, m);
    return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(d);
  } catch {
    return t;
  }
}
