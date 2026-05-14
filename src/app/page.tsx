import { auth } from "@/lib/auth";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const ctaHref = session ? "/app" : "/signin";

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Disclaimer pill */}
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/50 rounded-full px-4 py-1.5 text-sm text-indigo-300">
          ⚖️ Drafting assistance only — not legal advice
        </div>

        {/* Hero */}
        <h1 className="text-5xl font-bold tracking-tight leading-tight">
          Stop starting from a blank page.
        </h1>
        <p className="text-xl text-gray-400 max-w-xl mx-auto">
          TruDocket walks you through your motion — question by question — and
          structures it the way courts expect to see it.
        </p>

        {/* CTAs */}
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href={ctaHref}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Try TruDocket (free)
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            View Pricing
          </Link>
        </div>

        {/* 3 bullet promises */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-sm text-left">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">No blank page</p>
            <p className="text-gray-400">
              A guided intake turns your rough notes into a proper starting
              point — bullet points and fragments are fine.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Guided questions</p>
            <p className="text-gray-400">
              TruDocket asks the clarifying questions a good attorney
              would — then uses your answers to sharpen the draft.
            </p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Court-ready structure</p>
            <p className="text-gray-400">
              Caption, statement of facts, argument, and relief — organised
              the way judges expect to see them.
            </p>
          </div>
        </div>

        {/* Bottom disclaimer */}
        <p className="text-xs text-gray-600 pt-2">
          TruDocket generates drafting templates only. Always review with a
          licensed attorney before filing. Your first draft is free — no
          credit card required.
        </p>
      </div>
    </main>
  );
}
