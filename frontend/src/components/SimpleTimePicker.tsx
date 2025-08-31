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
      <label className="block text-sm font-medium text-foreground" htmlFor="time-input">
        {label}
      </label>
      <input
        id="time-input"
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input"
      />
    </div>
  );
}
