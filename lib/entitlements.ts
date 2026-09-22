import { db } from "@/lib/db";

export async function getEntitlement(userId: string) {
  let subscription = await db.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    subscription = await db.subscription.create({
      data: {
        userId,
        status: "TRIALING",
        plan: "TRIAL_2_DAYS",
        trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        trialContentLimit: 8,
        trialImageLimit: 2,
      },
    });
  }

  const trialActive = subscription.status === "TRIALING" &&
    !!subscription.trialEndsAt &&
    subscription.trialEndsAt.getTime() > Date.now();

  const paidActive = subscription.status === "ACTIVE" && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() > Date.now());

  return {
    subscription,
    active: trialActive || paidActive,
    trialActive,
    paidActive,
    contentRemaining: trialActive ? Math.max(0, subscription.trialContentLimit - subscription.trialContentUsed) : Infinity,
    imageRemaining: trialActive ? Math.max(0, subscription.trialImageLimit - subscription.trialImageUsed) : Infinity,
  };
}

export async function consumeContentGeneration(userId: string) {
  const e = await getEntitlement(userId);
  if (!e.active) return { ok: false as const, error: "Seu teste terminou. Escolha um plano para continuar." };
  if (e.trialActive && e.contentRemaining <= 0) return { ok: false as const, error: "Você atingiu o limite do teste. Escolha um plano para continuar criando." };
  if (e.trialActive) await db.subscription.update({ where: { userId }, data: { trialContentUsed: { increment: 1 } } });
  return { ok: true as const };
}

export async function consumeImageGeneration(userId: string) {
  const e = await getEntitlement(userId);
  if (!e.active) return { ok: false as const, error: "Seu teste terminou. Escolha um plano para continuar gerando imagens." };
  if (e.trialActive && e.imageRemaining <= 0) return { ok: false as const, error: "Você atingiu o limite de imagens do teste. Escolha um plano para continuar." };
  if (e.trialActive) await db.subscription.update({ where: { userId }, data: { trialImageUsed: { increment: 1 } } });
  return { ok: true as const };
}
