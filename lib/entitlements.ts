import { db } from "@/lib/db";

const PAID_LIMITS = {
  WEEKLY: { content: 20, image: 5, days: 7 },
  MONTHLY: { content: 80, image: 20, days: 30 },
} as const;

async function paidUsage(userId: string, plan: string, currentPeriodEnd: Date | null) {
  const limits = PAID_LIMITS[plan as keyof typeof PAID_LIMITS];
  if (!limits || !currentPeriodEnd) return { contentUsed: 0, imageUsed: 0, limits };
  const start = new Date(currentPeriodEnd.getTime() - limits.days * 86400000);
  const [contentUsed, imageUsed] = await Promise.all([
    db.event.count({ where: { userId, name: "ai_content_generation", occurredAt: { gte: start, lte: currentPeriodEnd } } }),
    db.event.count({ where: { userId, name: "ai_image_generation", occurredAt: { gte: start, lte: currentPeriodEnd } } }),
  ]);
  return { contentUsed, imageUsed, limits };
}

export async function getEntitlement(userId: string) {
  let subscription = await db.subscription.findUnique({ where: { userId } });
  if (!subscription) {
    subscription = await db.subscription.create({
      data: {
        userId,
        status: "TRIALING",
        plan: "TRIAL_2_DAYS",
        trialEndsAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        trialContentLimit: 1,
        trialImageLimit: 2,
      },
    });
  }

  const trialActive = subscription.status === "TRIALING" && !!subscription.trialEndsAt && subscription.trialEndsAt.getTime() > Date.now();
  const paidActive = subscription.status === "ACTIVE" && (!subscription.currentPeriodEnd || subscription.currentPeriodEnd.getTime() > Date.now());
  const usage = paidActive ? await paidUsage(userId, subscription.plan || "", subscription.currentPeriodEnd) : { contentUsed: 0, imageUsed: 0, limits: undefined };

  return {
    subscription,
    active: trialActive || paidActive,
    trialActive,
    paidActive,
    contentRemaining: trialActive
      ? Math.max(0, subscription.trialContentLimit - subscription.trialContentUsed)
      : usage.limits ? Math.max(0, usage.limits.content - usage.contentUsed) : Infinity,
    imageRemaining: trialActive
      ? Math.max(0, subscription.trialImageLimit - subscription.trialImageUsed)
      : usage.limits ? Math.max(0, usage.limits.image - usage.imageUsed) : Infinity,
    contentLimit: trialActive ? subscription.trialContentLimit : usage.limits?.content ?? Infinity,
    imageLimit: trialActive ? subscription.trialImageLimit : usage.limits?.image ?? Infinity,
    contentUsed: trialActive ? subscription.trialContentUsed : usage.contentUsed,
    imageUsed: trialActive ? subscription.trialImageUsed : usage.imageUsed,
  };
}

export async function consumeContentGeneration(userId: string, options?: { dryRun?: boolean }) {
  const e = await getEntitlement(userId);
  if (!e.active) return { ok: false as const, error: "Seu acesso terminou. Escolha um plano para continuar." };
  if (e.contentRemaining <= 0) return { ok: false as const, error: "Você atingiu o limite de gerações de conteúdo do seu plano." };
  if (e.trialActive) {
    await db.subscription.update({ where: { userId }, data: { trialContentUsed: { increment: 1 } } });
  } else {
    await db.event.create({ data: { userId, name: "ai_content_generation", metadata: { plan: e.subscription.plan } } });
  }
  return { ok: true as const };
}

export async function consumeImageGeneration(userId: string, options?: { dryRun?: boolean }) {
  const e = await getEntitlement(userId);
  if (!e.active) return { ok: false as const, error: "Seu acesso terminou. Escolha um plano para continuar gerando imagens." };
  if (e.imageRemaining <= 0) return { ok: false as const, error: "Você atingiu o limite de imagens do seu plano." };
  if (e.trialActive) {
    if (options?.dryRun) return { ok: true as const };
    const updated = await db.subscription.updateMany({
      where: { userId, status: "TRIALING", trialEndsAt: { gt: new Date() }, trialImageUsed: { lt: e.subscription.trialImageLimit } },
      data: { trialImageUsed: { increment: 1 } },
    });
    if (updated.count !== 1) return { ok: false as const, error: "Você atingiu o limite de imagens do teste." };
  } else if (!options?.dryRun) {
    await db.event.create({ data: { userId, name: "ai_image_generation", metadata: { plan: e.subscription.plan } } });
  }
  return { ok: true as const };
}
