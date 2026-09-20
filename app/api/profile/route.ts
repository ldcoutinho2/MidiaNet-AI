import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

function clean(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanJson(value: unknown) {
  if (!Array.isArray(value)) return null;
  return value.map(item => String(item).trim()).filter(Boolean);
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const body = await request.json();
    const profileDescription = String(body.profileDescription ?? "").trim();
    const desiredOutcome = String(body.desiredOutcome ?? "").trim();
    const instagramProfileUrl = clean(body.instagramProfileUrl);

    if (!profileDescription || !desiredOutcome || !instagramProfileUrl) {
      return NextResponse.json({ error: "Complete pelo menos o perfil, objetivo e Instagram." }, { status: 400 });
    }

    const profile = await db.strategicProfile.upsert({
      where: { userId: user.id },
      update: {
        profileDescription,
        desiredOutcome,
        instagramProfileUrl,
        businessType: clean(body.businessType),
        niche: clean(body.niche),
        offer: clean(body.offer),
        objective: clean(body.objective),
        secondaryObjectives: cleanJson(body.secondaryObjectives),
        conversionGoal: clean(body.conversionGoal),
        monetization: clean(body.monetization),
        audience: clean(body.audience),
        audienceAge: clean(body.audienceAge),
        audienceGender: clean(body.audienceGender),
        audienceLocation: clean(body.audienceLocation),
        audienceInterests: clean(body.audienceInterests),
        audiencePainPoints: clean(body.audiencePainPoints),
        location: clean(body.location),
        appearsOnCamera: typeof body.appearsOnCamera === "boolean" ? body.appearsOnCamera : null,
        availableMinutesPerDay: Number.isFinite(Number(body.availableMinutesPerDay)) ? Number(body.availableMinutesPerDay) : null,
        availableDaysPerWeek: Number.isFinite(Number(body.availableDaysPerWeek)) ? Number(body.availableDaysPerWeek) : null,
        postingFrequency: clean(body.postingFrequency),
        contentStyle: clean(body.contentStyle),
        contentPreferences: cleanJson(body.contentPreferences),
        contentAvoid: clean(body.contentAvoid),
        brandPersonality: clean(body.brandPersonality),
        desiredPositioning: clean(body.desiredPositioning),
        referenceProfiles: clean(body.referenceProfiles),
        competitors: clean(body.competitors),
        differentiators: clean(body.differentiators),
        currentChallenges: clean(body.currentChallenges),
        salesFunnel: clean(body.salesFunnel),
        ninetyDayGoal: clean(body.ninetyDayGoal),
        successDefinition: clean(body.successDefinition),
        constraints: clean(body.constraints),
        onboardingCompletedAt: new Date(),
      },
      create: {
        userId: user.id,
        profileDescription,
        desiredOutcome,
        instagramProfileUrl,
        businessType: clean(body.businessType),
        niche: clean(body.niche),
        offer: clean(body.offer),
        objective: clean(body.objective),
        secondaryObjectives: cleanJson(body.secondaryObjectives),
        conversionGoal: clean(body.conversionGoal),
        monetization: clean(body.monetization),
        audience: clean(body.audience),
        audienceAge: clean(body.audienceAge),
        audienceGender: clean(body.audienceGender),
        audienceLocation: clean(body.audienceLocation),
        audienceInterests: clean(body.audienceInterests),
        audiencePainPoints: clean(body.audiencePainPoints),
        location: clean(body.location),
        appearsOnCamera: typeof body.appearsOnCamera === "boolean" ? body.appearsOnCamera : null,
        availableMinutesPerDay: Number.isFinite(Number(body.availableMinutesPerDay)) ? Number(body.availableMinutesPerDay) : null,
        availableDaysPerWeek: Number.isFinite(Number(body.availableDaysPerWeek)) ? Number(body.availableDaysPerWeek) : null,
        postingFrequency: clean(body.postingFrequency),
        contentStyle: clean(body.contentStyle),
        contentPreferences: cleanJson(body.contentPreferences),
        contentAvoid: clean(body.contentAvoid),
        brandPersonality: clean(body.brandPersonality),
        desiredPositioning: clean(body.desiredPositioning),
        referenceProfiles: clean(body.referenceProfiles),
        competitors: clean(body.competitors),
        differentiators: clean(body.differentiators),
        currentChallenges: clean(body.currentChallenges),
        salesFunnel: clean(body.salesFunnel),
        ninetyDayGoal: clean(body.ninetyDayGoal),
        successDefinition: clean(body.successDefinition),
        constraints: clean(body.constraints),
        onboardingCompletedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    console.error("profile_save_error", error);
    return NextResponse.json({ error: "Não foi possível salvar o diagnóstico agora." }, { status: 500 });
  }
}
