import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/app"
              className="text-indigo-400 font-bold text-lg tracking-tight"
            >
              TruDocket
            </Link>
            <div className="hidden sm:flex items-center gap-4 text-sm">
              <Link
                href="/app/create-motion"
                className="text-gray-400 hover:text-white transition-colors"
              >
                New Motion
              </Link>
              <Link
                href="/app/documents"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Documents
              </Link>
              <Link
                href="/app/cases"
                className="text-gray-400 hover:text-white transition-colors"
              >
                Cases
              </Link>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              href="/app/billing"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Billing
            </Link>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
