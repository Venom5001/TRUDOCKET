import "server-only";

import { auth } from "./auth";
import { prisma } from "./prisma";
import { isPro } from "./stripe";
import { getUserSubscription } from "./subscription";
import { FREE_GENERATION_LIMIT } from "./entitlement-constants";

export interface UserEntitlements {
  userId: string;
  isPro: boolean;
  usageCount: number;
  freeLimit: number;
  canGenerate: boolean;
  generationsRemaining: number | null; // null = unlimited (Pro)
}

export async function getUserEntitlements(): Promise<UserEntitlements | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const subscription = await getUserSubscription();
  const proUser = isPro(subscription?.status);

  const usageCount = await prisma.usageEvent.count({
    where: { userId, actionType: "motion_generate" },
  });

  return {
    userId,
    isPro: proUser,
    usageCount,
    freeLimit: FREE_GENERATION_LIMIT,
    canGenerate: proUser || usageCount < FREE_GENERATION_LIMIT,
    generationsRemaining: proUser
      ? null
      : Math.max(0, FREE_GENERATION_LIMIT - usageCount),
  };
}
