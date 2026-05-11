import Link from "next/link";

export const dynamic = "force-dynamic";

export default function VerifyRequestPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-16 text-white">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-950/60 text-2xl">
          ✉️
        </div>
        <h1 className="text-3xl font-bold tracking-tight">Check your email</h1>
        <p className="text-gray-400">
          We sent you a sign-in link. Open it on this device to continue.
        </p>
        <div className="rounded-lg border border-gray-800 bg-gray-900/60 p-4 text-left text-sm text-gray-400">
          <p className="mb-1 font-medium text-white">Didn&apos;t get it?</p>
          <ul className="list-inside list-disc space-y-1">
            <li>Check your spam or promotions folder.</li>
            <li>Make sure you typed the right email address.</li>
            <li>The link is valid for 24 hours.</li>
          </ul>
        </div>
        <Link
          href="/signin"
          className="inline-block text-sm text-indigo-400 hover:text-indigo-300"
        >
          ← Back to sign in
        </Link>
      </div>
    </main>
  );
}
