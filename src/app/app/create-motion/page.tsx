import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserEntitlements } from "@/lib/entitlements";
import { CreateMotionForm } from "./CreateMotionForm";

// AI provider calls use Node.js-only APIs (AbortController timers, long-lived
// fetch). Force the Node.js runtime explicitly so the edge runtime is never
// selected for this segment or its server actions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function CreateMotionPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const entitlements = await getUserEntitlements();

  return (
    <div className="max-w-3xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">New Motion Draft</h1>
        <p className="text-gray-400">
          Fill in the details below and MotionForge will generate a structured
          motion draft for your review.
        </p>
      </div>

      <CreateMotionForm
        canGenerate={entitlements?.canGenerate ?? false}
        generationsRemaining={entitlements?.generationsRemaining ?? 0}
        isPro={entitlements?.isPro ?? false}
      />
    </div>
  );
}
