import React from 'react';

interface SimpleDatePickerProps {
  value: string;
  onChange: (date: string) => void;
  label: string;
  required?: boolean;
}

export default function SimpleDatePicker({ value, onChange, label, required = false }: SimpleDatePickerProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium" htmlFor="date-input">
        {label}
      </label>
      <input
        id="date-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full rounded-md border border-black/10 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-black/20 dark:focus:ring-white/20"
      />
    </div>
  );
}
