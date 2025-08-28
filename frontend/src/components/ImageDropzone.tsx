"use client";

import { useCallback, useRef, useState } from "react";

export default function ImageDropzone({
  value,
  onChange,
  label = "Event banner image",
}: {
  value?: string;
  onChange: (dataUrl: string) => void;
  label?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      alert("Please drop an image file.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      onChange(dataUrl);
    };
    reader.readAsDataURL(file);
  }, [onChange]);

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      <div
        className={`relative rounded-md border border-dashed ${dragOver ? "border-foreground bg-black/5 dark:bg-white/5" : "border-black/10 dark:border-white/10"} p-4 flex flex-col items-center justify-center gap-2 text-sm`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        {value ? (
          <img src={value} alt="Banner preview" className="max-h-48 rounded" />
        ) : (
          <>
            <span>Drag & drop an image here, or click to upload</span>
            <span className="text-xs text-black/60 dark:text-white/60">PNG, JPG, GIF up to a few MB</span>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
    </div>
  );
}
