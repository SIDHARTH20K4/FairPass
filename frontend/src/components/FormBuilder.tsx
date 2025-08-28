"use client";

import { FormField } from "@/hooks/useEvents";
import { useState } from "react";

export default function FormBuilder({
  value,
  onChange,
}: {
  value?: FormField[];
  onChange: (next: FormField[]) => void;
}) {
  const [fields, setFields] = useState<FormField[]>(value || []);

  function addField() {
    const id = `${Date.now()}`;
    const next = [...fields, { id, label: "New field", type: "text", required: false }];
    setFields(next);
    onChange(next);
  }
  function update(idx: number, patch: Partial<FormField>) {
    const next = fields.map((f, i) => (i === idx ? { ...f, ...patch } : f));
    setFields(next);
    onChange(next);
  }
  function remove(idx: number) {
    const next = fields.filter((_, i) => i !== idx);
    setFields(next);
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Participant form fields</span>
        <button type="button" onClick={addField} className="text-sm rounded-md border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5">Add field</button>
      </div>
      {fields.length === 0 && (
        <p className="text-xs text-black/60 dark:text-white/60">No fields yet. Add at least name and email.</p>
      )}
      {fields.map((f, idx) => (
        <div key={f.id} className="grid grid-cols-12 gap-2 items-center">
          <input
            className="col-span-6 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm"
            value={f.label}
            onChange={(e) => update(idx, { label: e.target.value })}
          />
          <select
            className="col-span-3 rounded-md border border-black/10 dark:border-white/10 bg-transparent px-2 py-1 text-sm"
            value={f.type}
            onChange={(e) => update(idx, { type: e.target.value as FormField["type"] })}
          >
            <option value="text">Text</option>
            <option value="email">Email</option>
            <option value="number">Number</option>
          </select>
          <label className="col-span-2 inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!f.required} onChange={(e) => update(idx, { required: e.target.checked })} />
            Required
          </label>
          <button type="button" onClick={() => remove(idx)} className="col-span-1 text-sm rounded-md border border-black/10 dark:border-white/10 px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5">✕</button>
        </div>
      ))}
    </div>
  );
}
