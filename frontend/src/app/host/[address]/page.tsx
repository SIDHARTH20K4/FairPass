"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import React from "react";

type HostEvent = {
  id: string;
  name: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
};

export default function HostDashboard({ params }: { params: Promise<{ address: string }> }) {
  const { address } = React.use(params);
  const { address: connected } = useAccount();
  const router = useRouter();
  const [events, setEvents] = useState<HostEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/host/${address}`);
        const data = await res.json();
        setEvents(data || []);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [address]);

  function createEvent() {
    router.push('/host/create');
  }

  async function publish(eventId: string) {
    await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' }),
    });
    setEvents((prev) => prev.map((e) => e.id === eventId ? { ...e, status: 'published' } : e));
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Organizer Dashboard</h1>
        <button onClick={createEvent} className="text-sm rounded-md border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5">Create event</button>
      </div>

      {loading ? (
        <p className="text-sm">Loading…</p>
      ) : events.length === 0 ? (
        <p className="text-sm">No events yet.</p>
      ) : (
        <ul className="space-y-3">
          {events.map((e) => (
            <li key={e.id} className="rounded-md border border-black/10 dark:border-white/10 p-3 flex items-center justify-between">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{e.name}</div>
                <div className="text-xs text-black/60 dark:text-white/60">{new Date(e.updatedAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs rounded px-2 py-0.5 border ${e.status === 'published' ? 'border-green-400 text-green-400' : 'border-yellow-400 text-yellow-400'}`}>{e.status}</span>
                {e.status === 'draft' && (
                  <button onClick={() => publish(e.id)} className="text-sm rounded-md border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5">Publish</button>
                )}
                <Link className="text-sm rounded-md border border-black/10 dark:border-white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg:white/5" href={`/events/${e.id}/edit`}>Edit</Link>
                <Link className="text-sm rounded-md border border-black/10 dark:border:white/10 px-3 py-1 hover:bg-black/5 dark:hover:bg-white/5" href={`/events/${e.id}`}>View</Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}


