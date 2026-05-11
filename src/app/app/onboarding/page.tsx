import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserEntitlements } from "@/lib/entitlements";
import { OnboardingWizard } from "./OnboardingWizard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/signin");
  }

  const entitlements = await getUserEntitlements();

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Complete your onboarding</h1>
        <p className="text-gray-400 mt-2 max-w-2xl">
          Answer a few questions and we&apos;ll generate a structured motion draft preview to help you get started.
        </p>
      </div>

      <OnboardingWizard
        canGenerate={entitlements?.canGenerate ?? false}
        generationsRemaining={entitlements?.generationsRemaining ?? 0}
        isPro={entitlements?.isPro ?? false}
      />
    </div>
  );
}
