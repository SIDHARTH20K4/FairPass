"use client";

import { useEvents, FormField } from "@/hooks/useEvents";
import { useState } from "react";
import Link from "next/link";

const SUBMIT_KEY = (id: string) => `fairpass.events.submissions.${id}`;

export default function RegisterForEvent({ params }: { params: { id: string } }) {
  const { id } = params;
  const { events } = useEvents();
  const event = events.find((e) => e.id === id);

  const [values, setValues] = useState<Record<string, string>>({});

  if (!event) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm">Event not found.</p>
      </main>
    );
  }

  const schema: FormField[] = event.formSchema || [
    { id: "name", label: "Full name", type: "text", required: true },
    { id: "email", label: "Email", type: "email", required: true },
  ];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const existing = JSON.parse(localStorage.getItem(SUBMIT_KEY(id)) || "[]");
    existing.push({ values, at: Date.now() });
    localStorage.setItem(SUBMIT_KEY(id), JSON.stringify(existing));
    alert("Registered! (stored locally)");
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <div className="mb-6">
        <Link href={`/events/${id}`} className="text-sm hover:underline">← Back to event</Link>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight mb-6">Register for {event.name}</h1>
      <form onSubmit={submit} className="space-y-4">
        {schema.map((f) => (
          <div key={f.id} className="space-y-2">
            <label className="block text-sm font-medium" htmlFor={f.id}>{f.label}</label>
            <input
              id={f.id}
              type={f.type}
              required={!!f.required}
              value={values[f.id] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
              className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
            />
          </div>
        ))}
        <button type="submit" className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5">Submit</button>
      </form>
    </main>
  );
}
