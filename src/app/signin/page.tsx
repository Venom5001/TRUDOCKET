import { auth, signIn } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SignInPageProps = {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
};

const ERROR_MESSAGES: Record<string, string> = {
  OAuthAccountNotLinked:
    "That email is already linked to a different sign-in method. Try the method you used originally.",
  AccessDenied: "You don't have access to sign in. Contact support if this is unexpected.",
  Verification: "That sign-in link is invalid or has expired. Request a new one.",
  Configuration: "Sign-in is temporarily unavailable. Please try again in a moment.",
};

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const session = await auth();
  const { callbackUrl, error } = await searchParams;

  if (session?.user) {
    redirect(callbackUrl ?? "/app");
  }

  const safeCallback = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/app";

  const googleEnabled = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const emailEnabled = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const githubEnabled = Boolean(
    process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
  );

  const errorMessage = error ? ERROR_MESSAGES[error] ?? "Sign-in failed. Please try again." : null;

  async function signInWith(provider: "google" | "github") {
    "use server";
    await signIn(provider, { redirectTo: safeCallback });
  }

  async function signInWithEmail(formData: FormData) {
    "use server";
    const email = String(formData.get("email") ?? "").trim();
    if (!email) return;
    await signIn("resend", { email, redirectTo: safeCallback });
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-950 px-4 py-16 text-white">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block text-sm text-indigo-400 hover:text-indigo-300">
            ← Back to home
          </Link>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">Sign in to TruDocket</h1>
          <p className="mt-2 text-sm text-gray-400">
            First draft free — no credit card required.
          </p>
        </div>

        {errorMessage && (
          <div className="rounded-lg border border-red-700/50 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="space-y-3 rounded-xl border border-gray-800 bg-gray-900/60 p-6">
          {googleEnabled && (
            <form action={signInWith.bind(null, "google")}>
              <button
                type="submit"
                className="flex w-full items-center justify-center gap-3 rounded-lg bg-white px-4 py-2.5 font-semibold text-gray-900 transition-colors hover:bg-gray-100"
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>
          )}

          {emailEnabled && (
            <>
              {googleEnabled && <Divider />}
              <form action={signInWithEmail} className="space-y-2">
                <label htmlFor="email" className="block text-xs font-medium text-gray-400">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  className="w-full rounded-lg border border-gray-700 bg-gray-950 px-3 py-2.5 text-sm text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-indigo-500"
                >
                  Continue with Email
                </button>
                <p className="text-xs text-gray-500">
                  We&apos;ll send you a sign-in link. No password needed.
                </p>
              </form>
            </>
          )}

          {githubEnabled && (
            <>
              {(googleEnabled || emailEnabled) && <Divider />}
              <form action={signInWith.bind(null, "github")}>
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-gray-700"
                >
                  <GitHubIcon />
                  Continue with GitHub
                </button>
              </form>
            </>
          )}

          {!googleEnabled && !emailEnabled && !githubEnabled && (
            <p className="text-center text-sm text-gray-400">
              No sign-in providers are configured. Please contact support.
            </p>
          )}
        </div>

        <p className="text-center text-xs text-gray-500">
          By continuing, you agree that TruDocket generates drafting templates only. Always review
          with a licensed attorney before filing.
        </p>
      </div>
    </main>
  );
}

function Divider() {
  return (
    <div className="flex items-center gap-3 py-1">
      <div className="h-px flex-1 bg-gray-800" />
      <span className="text-xs uppercase tracking-wider text-gray-500">or</span>
      <div className="h-px flex-1 bg-gray-800" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.373 0 12c0 5.303 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.01-1.04-.015-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.838 1.237 1.838 1.237 1.07 1.834 2.809 1.304 3.495.997.108-.775.418-1.305.762-1.605-2.665-.305-5.467-1.333-5.467-5.93 0-1.31.467-2.382 1.235-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.5 11.5 0 0 1 12 5.803a11.5 11.5 0 0 1 3.003.404c2.291-1.552 3.297-1.23 3.297-1.23.653 1.652.242 2.873.119 3.176.77.839 1.233 1.911 1.233 3.221 0 4.609-2.807 5.624-5.479 5.921.43.371.823 1.103.823 2.222 0 1.604-.015 2.898-.015 3.293 0 .319.218.694.825.576C20.565 21.796 24 17.299 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}
