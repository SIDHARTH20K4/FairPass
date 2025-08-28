"use client";

import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useRouter } from "next/navigation";

export default function RegisterButton({ eventId }: { eventId: string }) {
  const { isConnected } = useAccount();
  const router = useRouter();

  if (!isConnected) {
    return <ConnectButton />;
  }

  return (
    <button
      className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
      onClick={() => router.push(`/events/${eventId}/register`)}
    >
      Register
    </button>
  );
}
