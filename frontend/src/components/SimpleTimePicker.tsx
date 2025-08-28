import React from 'react';

interface SimpleTimePickerProps {
  value: string;
  onChange: (time: string) => void;
  label: string;
  required?: boolean;
}

export default function SimpleTimePicker({ value, onChange, label, required = false }: SimpleTimePickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="time-input">
        {label}
      </label>
      <input
        id="time-input"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
      />
    </div>
  );
}
