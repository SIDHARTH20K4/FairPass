import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <section className="flex flex-col gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome to FairPass</h1>
        <p className="text-sm text-black/70 dark:text-white/70 max-w-prose">
          Discover Events. Connect your wallet to get started.
        </p>
        <div>
          <Link
            href="/events"
            className="inline-flex items-center rounded-md border border-black/10 dark:border-white/10 px-4 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5"
          >
            Explore events
          </Link>
        </div>
      </section>
    </main>
  );
}
