type TimelineItem = {
  id: string;
  title: string;
  date: string;
  description?: string;
  status?: "upcoming" | "live" | "past";
};

import Link from "next/link";

export default function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="relative border-s border-black/10 dark:border-white/10">
      {items.map((item) => (
        <li key={item.id} className="ms-6 py-4">
          <span className="absolute -start-1.5 mt-2 flex h-3 w-3 items-center justify-center rounded-full bg-foreground" />
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <h3 className="font-medium">
                <Link href={`/events/${item.id}`} className="hover:underline">
                  {item.title}
                </Link>
              </h3>
              {item.status && (
                <span className="text-xs rounded px-2 py-0.5 border border-black/10 dark:border-white/10">
                  {item.status}
                </span>
              )}
            </div>
            <time className="text-xs text-black/60 dark:text-white/60">{item.date}</time>
            {item.description && (
              <p className="text-sm text-black/80 dark:text-white/80">{item.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
