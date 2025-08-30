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
      <label className="block text-sm font-medium text-foreground" htmlFor="date-input">
        {label}
      </label>
      <input
        id="date-input"
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input"
      />
    </div>
  );
}
