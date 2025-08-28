"use client";

import { useMemo } from "react";
import { marked } from "marked";

export default function Markdown({ content }: { content: string }) {
  const html = useMemo(() => {
    try {
      marked.setOptions({ breaks: true });
      return marked.parse(content || "");
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: String(html) }} />
  );
}
