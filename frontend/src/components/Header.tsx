"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export default function Header() {
  const pathname = usePathname();
  
  // Hide header on mobile for host pages
  const isHostPage = pathname.startsWith('/host');
  
  return (
    <header className={`w-full glass-card border-b border-foreground/10 sticky top-0 z-50 ${isHostPage ? 'hidden lg:block' : ''}`}>
      <div className="mx-auto max-w-6xl px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 font-bold text-xl text-foreground hover:text-foreground/80 transition-colors">
          <div className="w-3 h-3 rounded-full bg-foreground"></div>
          <span>FairPass</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link href="/events" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Explore Events
          </Link>
          <Link href="/host/signin" className="text-sm font-medium text-foreground/70 hover:text-foreground transition-colors">
            Host Events
          </Link>
          <div className="ml-2">
            <ConnectButton />
          </div>
        </nav>
      </div>
    </header>
  );
}
