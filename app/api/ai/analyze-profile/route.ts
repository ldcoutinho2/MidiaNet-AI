import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    positioning: { type: "string" },
    audience: { type: "string" },
    painPoints: { type: "array", items: { type: "string" } },
    desires: { type: "array", items: { type: "string" } },
    contentPillars: { type: "array", items: { type: "string" } },
    tone: { type: "array", items: { type: "string" } },
    contentFormats: { type: "array", items: { type: "string" } },
    ctaStrategy: { type: "string" },
    conversionStrategy: { type: "string" },
    strengths: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    summary: { type: "string" },
    weeklyPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          format: { type: "string" },
          idea: { type: "string" },
          hook: { type: "string" },
          cta: { type: "string" },
        },
        required: ["day", "format", "idea", "hook", "cta"],
      },
    },
  },
  required: [
    "positioning", "audience", "painPoints", "desires", "contentPillars",
    "tone", "contentFormats", "ctaStrategy", "conversionStrategy",
    "strengths", "opportunities", "summary", "weeklyPlan"
  ],
} as const;

function normalizeInstagramReference(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("@")) return trimmed.slice(1);
  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("instagram.com")) {
      return url.pathname.split("/").filter(Boolean)[0] || trimmed;
    }
  } catch {}
  return trimmed;
}

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY ainda não está configurada no servidor." }, { status: 503 });
  }

  const profile = user.strategicProfile;
  if (!profile) {
    return NextResponse.json({ error: "Complete seu perfil antes da análise." }, { status: 400 });
  }

  try {
    const instagramReference = profile.instagramProfileUrl
      ? normalizeInstagramReference(profile.instagramProfileUrl)
      : "";

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      tools: instagramReference ? [{ type: "web_search" }] : undefined,
      instructions: [
        "Você é o estrategista principal do MidiaNet AI.",
        "Sua função é transformar informações reais fornecidas pelo cliente em uma estratégia prática de conteúdo.",
        "Não invente dados sobre Instagram, métricas, público ou negócio que não foram fornecidos.",
        "Quando algo não puder ser concluído com segurança, faça uma inferência claramente plausível e mantenha-a útil e conservadora.",
        "Priorize o objetivo comercial do cliente, não métricas de vaidade.",
        "Crie uma primeira semana de conteúdo coerente com o posicionamento, público e objetivo.",
        instagramReference
          ? "O cliente forneceu uma referência de perfil do Instagram. Use a busca na web para procurar informações públicas sobre esse perfil. Se a página não estiver acessível ou não houver informação confiável, diga isso e NÃO invente dados."
          : "Não foi fornecido um perfil do Instagram para pesquisa.",
        "Responda exclusivamente no formato estruturado solicitado."
      ].join("\n"),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                nome: user.name,
                perfilInstagramParaPesquisar: profile.instagramProfileUrl || null,
                descricaoDoPerfil: profile.profileDescription,
                objetivoDeclarado: profile.desiredOutcome,
                outrosDados: {
                  objective: profile.objective,
                  conversionGoal: profile.conversionGoal,
                  audience: profile.audience,
                  location: profile.location,
                  appearsOnCamera: profile.appearsOnCamera,
                  availableMinutesPerDay: profile.availableMinutesPerDay,
                  contentStyle: profile.contentStyle,
                  ninetyDayGoal: profile.ninetyDayGoal
                }
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "midianet_profile_analysis",
          strict: true,
          schema
        }
      }
    });

    if (!response.output_text) {
      return NextResponse.json({ error: "A IA não retornou uma análise." }, { status: 502 });
    }

    const aiProfile = JSON.parse(response.output_text);
    const updated = await db.strategicProfile.update({
      where: { userId: user.id },
      data: { aiProfile, aiAnalyzedAt: new Date() },
    });

    return NextResponse.json({
      ok: true,
      aiProfile: updated.aiProfile,
      aiAnalyzedAt: updated.aiAnalyzedAt,
    });
  } catch (error) {
    console.error("ai_profile_analysis_error", error);
    return NextResponse.json({ error: "Não foi possível concluir a análise com a IA agora." }, { status: 500 });
  }
}
