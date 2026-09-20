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
    contentIdeas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string" },
          format: { type: "string" },
          objective: { type: "string" },
          angle: { type: "string" },
          hook: { type: "string" },
          whyItFits: { type: "string" }
        },
        required: ["title", "format", "objective", "angle", "hook", "whyItFits"]
      }
    },
    weeklyPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          format: { type: "string" },
          objective: { type: "string" },
          idea: { type: "string" },
          hook: { type: "string" },
          script: { type: "string" },
          caption: { type: "string" },
          visualDirection: { type: "string" },
          cta: { type: "string" },
          executionSteps: { type: "array", items: { type: "string" } }
        },
        required: [
          "day", "format", "objective", "idea", "hook", "script",
          "caption", "visualDirection", "cta", "executionSteps"
        ]
      }
    }
  },
  required: [
    "positioning", "audience", "painPoints", "desires", "contentPillars",
    "tone", "contentFormats", "ctaStrategy", "conversionStrategy",
    "strengths", "opportunities", "summary", "contentIdeas", "weeklyPlan"
  ]
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
    return NextResponse.json(
      { error: "OPENAI_API_KEY ainda não está configurada no servidor." },
      { status: 503 }
    );
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
        "Sua função é transformar as respostas do cliente em estratégia e conteúdo pronto para publicar.",
        "A análise precisa ser específica para este negócio. Nunca entregue conselhos genéricos que poderiam servir para qualquer perfil.",
        "Use o nicho, oferta, público, objetivo, posicionamento, diferenciais, rotina e formatos escolhidos pelo cliente em praticamente todas as decisões.",
        "Não invente métricas, depoimentos, resultados, clientes, preços, características da oferta ou fatos sobre o Instagram.",
        "Quando uma informação essencial não existir, faça uma suposição explícita e conservadora ou construa o conteúdo sem depender dela.",
        "Não diga apenas 'fale sobre X' ou 'mostre seu produto'. Entregue um tema específico, uma promessa clara, um gancho escrito e uma execução que o cliente consiga gravar ou montar.",
        "O banco de ideias deve conter pelo menos 10 ideias realmente diferentes e acionáveis, distribuídas entre descoberta, autoridade, relacionamento e conversão quando esses objetivos fizerem sentido.",
        "O plano semanal deve conter 7 conteúdos completos, um para cada dia, respeitando os formatos escolhidos, a disponibilidade e o objetivo principal.",
        "Cada roteiro deve ser utilizável sem precisar pedir outra resposta à IA: escreva a abertura, desenvolvimento e fechamento. Para Reels, escreva um roteiro de fala ou texto na tela cena a cena, com duração aproximada de 20 a 45 segundos quando fizer sentido.",
        "Se o cliente não aparecer em vídeo, crie roteiros que funcionem com gravação de tela, imagens, B-roll, demonstração do produto, texto na tela ou voz em off.",
        "Cada legenda deve ser uma legenda pronta, não uma instrução sobre como escrever uma legenda.",
        "Cada CTA deve dizer exatamente qual ação o público deve tomar.",
        "As orientações visuais devem ser concretas: o que mostrar, em que ordem e qual elemento deve aparecer na tela.",
        "Os conteúdos devem ter relação entre si durante a semana, formando uma sequência estratégica em vez de sete posts aleatórios.",
        "Priorize clareza, especificidade, utilidade e conversão. Evite clichês como 'consistência é tudo', 'agregue valor' ou 'conheça seu público' sem transformar isso em uma ação concreta.",
        instagramReference
          ? "O cliente forneceu um perfil do Instagram. Use a busca na web apenas para informações públicas que realmente possam melhorar a análise. Se não houver informação confiável, siga somente com os dados fornecidos."
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
                instagram: profile.instagramProfileUrl,
                negocio: {
                  descricao: profile.profileDescription,
                  tipo: profile.businessType,
                  nicho: profile.niche,
                  oferta: profile.offer,
                  localizacao: profile.location
                },
                publico: {
                  descricao: profile.audience,
                  idade: profile.audienceAge,
                  genero: profile.audienceGender,
                  localizacao: profile.audienceLocation,
                  interesses: profile.audienceInterests,
                  doresEDesejos: profile.audiencePainPoints
                },
                objetivos: {
                  principal: profile.objective,
                  secundarios: profile.secondaryObjectives,
                  objetivoDeclarado: profile.desiredOutcome,
                  conversao: profile.conversionGoal,
                  meta90Dias: profile.ninetyDayGoal,
                  sucesso: profile.successDefinition
                },
                posicionamento: {
                  desejado: profile.desiredPositioning,
                  personalidade: profile.brandPersonality,
                  estilo: profile.contentStyle,
                  referencias: profile.referenceProfiles,
                  concorrentes: profile.competitors,
                  diferenciais: profile.differentiators,
                  restricoes: profile.constraints
                },
                conteudo: {
                  formatos: profile.contentPreferences,
                  apareceNosVideos: profile.appearsOnCamera,
                  minutosPorDia: profile.availableMinutesPerDay,
                  diasPorSemana: profile.availableDaysPerWeek,
                  frequencia: profile.postingFrequency,
                  evitar: profile.contentAvoid
                },
                monetizacao: {
                  modelo: profile.monetization,
                  funilAtual: profile.salesFunnel
                },
                desafiosAtuais: profile.currentChallenges
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
      data: { aiProfile, aiAnalyzedAt: new Date() }
    });

    return NextResponse.json({
      ok: true,
      aiProfile: updated.aiProfile,
      aiAnalyzedAt: updated.aiAnalyzedAt
    });
  } catch (error) {
    console.error("ai_profile_analysis_error", error);
    return NextResponse.json(
      { error: "Não foi possível concluir a análise com a IA agora." },
      { status: 500 }
    );
  }
}
