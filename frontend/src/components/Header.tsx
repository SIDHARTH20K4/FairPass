"use client";

import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  return (
    <header className="w-full border-b border-black/10 dark:border-white/10">
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-foreground" />
          <span>FairPass</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="/events" className="text-sm hover:underline">
            Explore events
          </Link>
          <Link href="/host" className="text-sm hover:underline">
            Host
          </Link>
          <ConnectButton />
        </nav>
      </div>
    </header>
  );
}
