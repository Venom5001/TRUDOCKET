import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-950 text-white px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-bold tracking-tight">
          Build faster with{" "}
          <span className="text-indigo-400">SaaS MVP</span>
        </h1>
        <p className="text-xl text-gray-400">
          The modern SaaS starter with Next.js, Auth, Prisma, and Stripe.
          Ship your product in days, not months.
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/pricing"
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-semibold transition-colors"
          >
            View Pricing
          </Link>
          <Link
            href="/app"
            className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
          >
            Go to App
          </Link>
        </div>
      </div>
    </main>
  );
}
