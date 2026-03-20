import { auth } from "./auth";
import { prisma } from "./prisma";
import { isPro } from "./stripe";

export async function getUserSubscription() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const subscription = await prisma.subscription.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  });

  return subscription;
}

export async function requireProSubscription() {
  const subscription = await getUserSubscription();
  if (!subscription || !isPro(subscription.status)) {
    return null;
  }
  return subscription;
}
