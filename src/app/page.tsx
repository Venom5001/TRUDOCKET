import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-indigo-950/60 border border-indigo-700/50 rounded-full px-4 py-1.5 text-sm text-indigo-300 mb-2">
          ⚖️ Drafting aid only — not legal advice
        </div>
        <h1 className="text-5xl font-bold tracking-tight">
          Legal motion drafts,{" "}
          <span className="text-indigo-400">structured instantly</span>
        </h1>
        <p className="text-xl text-gray-400">
          MotionForge helps attorneys and legal professionals generate
          structured motion drafts in seconds. Start free, upgrade for
          unlimited drafts and full case management.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link
            href="/api/auth/signin"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            Get Started Free
          </Link>
          <Link
            href="/pricing"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            View Pricing
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-4 pt-8 text-sm text-gray-400">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">2 free drafts</p>
            <p>Try it risk-free, no card required</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Structured output</p>
            <p>Caption, facts, argument, relief</p>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <p className="text-white font-medium mb-1">Case management</p>
            <p>Organise motions by case (Pro)</p>
          </div>
        </div>
      </div>
    </main>
  );
}
