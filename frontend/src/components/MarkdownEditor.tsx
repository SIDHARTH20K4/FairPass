"use client";

import { useState } from "react";
import Markdown from "./Markdown";

export default function MarkdownEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
}) {
  const [tab, setTab] = useState<"edit" | "preview">("edit");

  return (
    <div className="rounded-md border border-black/10 dark:border-white/10">
      <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 px-3 py-2 text-xs">
        <button
          type="button"
          className={`px-2 py-1 rounded ${tab === "edit" ? "bg-black/5 dark:bg-white/5" : ""}`}
          onClick={() => setTab("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          className={`px-2 py-1 rounded ${tab === "preview" ? "bg-black/5 dark:bg-white/5" : ""}`}
          onClick={() => setTab("preview")}
        >
          Preview
        </button>
      </div>
      {tab === "edit" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={8}
          className="w-full bg-transparent px-3 py-2 text-sm outline-none"
        />
      ) : (
        <div className="px-3 py-2 text-sm">
          <Markdown content={value} />
        </div>
      )}
    </div>
  );
}
