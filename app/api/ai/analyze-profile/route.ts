import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    objective: { type: "string" },
    currentStage: { type: "string" },
    diagnosis: { type: "string" },
    mainProblem: { type: "string" },
    strategy: { type: "string" },
    weeklyMission: { type: "string" },
    nextAction: { type: "string" },
    postingFrequency: { type: "string" },
    postingFrequencyReason: { type: "string" },
    weeklyContentCount: { type: "integer" },
    dailyContentCount: { type: "string" },
    positioning: { type: "string" },
    audience: { type: "string" },
    conversionStrategy: { type: "string" },
    contentPillars: { type: "array", items: { type: "string" } },
    tone: { type: "array", items: { type: "string" } },
    strengths: { type: "array", items: { type: "string" } },
    opportunities: { type: "array", items: { type: "string" } },
    thirtyDayPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          phase: { type: "string" },
          focus: { type: "string" },
          action: { type: "string" },
          expectedSignal: { type: "string" }
        },
        required: ["phase", "focus", "action", "expectedSignal"]
      }
    },
    weeklyPlan: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          mission: { type: "string" },
          slots: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                time: { type: "string" },
                format: { type: "string" },
                role: { type: "string" },
                objective: { type: "string" },
                title: { type: "string" },
                topic: { type: "string" },
                hook: { type: "string" },
                script: { type: "string" },
                caption: { type: "string" },
                visualDirection: { type: "string" },
                cta: { type: "string" },
                executionSteps: { type: "array", items: { type: "string" } }
              },
              required: ["time","format","role","objective","title","topic","hook","script","caption","visualDirection","cta","executionSteps"]
            }
          }
        },
        required: ["day","mission","slots"]
      }
    }
  },
  required: [
    "objective","currentStage","diagnosis","mainProblem","strategy","weeklyMission","nextAction",
    "postingFrequency","postingFrequencyReason","weeklyContentCount","dailyContentCount","positioning","audience","conversionStrategy",
    "contentPillars","tone","strengths","opportunities","thirtyDayPlan","weeklyPlan"
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
        "Você é o estrategista principal do MidiaNet AI. Você entrega um plano executável, não um gerador de ideias soltas.",
        "Transforme as respostas do cliente em um diagnóstico curto, uma estratégia de 30 dias, uma missão semanal e uma programação completa de conteúdo.",
        "A análise precisa ser específica para este negócio. Nunca entregue conselhos genéricos que poderiam servir para qualquer perfil.",
        "Use nicho, oferta, público, objetivo, posicionamento, diferenciais, rotina, capacidade e formatos escolhidos para decidir o plano. A frequência informada pelo cliente é uma preferência de referência; não trate automaticamente uma meta de 5 conteúdos por semana como limite se a capacidade e o objetivo indicarem uma frequência maior. Só trate como limite quando o cliente disser explicitamente que não consegue produzir mais.",
        "Defina explicitamente quantos conteúdos principais serão publicados por semana e quantos por dia. Para perfis cujo objetivo seja crescimento, alcance, viralização ou aquisição de clientes, considere como ponto de partida 3 conteúdos principais por dia (por exemplo Foto/Post + Reel/Vídeo + Carrossel) quando a disponibilidade informada permitir. Pode usar 2 ou 4 conforme o diagnóstico. Não reduza automaticamente para 1 conteúdo por dia. Se a capacidade não comportar essa frequência, explique a redução.",
        "Stories podem ser usados como complemento e não devem substituir os conteúdos principais. Quando a estratégia recomendar vários conteúdos no mesmo dia, distribua formatos diferentes, por exemplo Foto/Post, Reel/Vídeo e Carrossel, além de Stories quando fizer sentido.",
        "A programação deve deixar impossível confundir quantos conteúdos existem em cada dia. O weeklyPlan precisa conter todos os slots daquele dia, e cada slot deve ser um conteúdo diferente e completo.",
        "A semana deve ter 7 dias. Para cada dia, preencha todos os slots previstos pela frequência. Em dias de publicação, prefira 2 a 4 conteúdos principais quando houver capacidade, podendo combinar Foto/Post, Reel/Vídeo e Carrossel. Se não houver publicação principal naquele dia, deixe claro o motivo. Cada slot precisa ser um conteúdo completo e pronto para execução.",
        "Distribua funções claras entre os conteúdos: descoberta/alcance, autoridade, relacionamento, prova quando houver dados reais, oferta/conversão e retenção. Não invente provas.",
        "Para cada conteúdo entregue horário sugerido, formato, função, objetivo, título, tema, gancho, roteiro completo, legenda pronta, direção visual, CTA e passos de execução.",
        "Para Reels, escreva cena a cena quando possível. Se o cliente não aparecer, use tela, B-roll, demonstração, texto ou voz em off.",
        "Os horários são hipóteses iniciais. Nunca diga que são horários de maior audiência sem métricas reais.",
        "A estratégia deve responder claramente: onde o perfil está, onde precisa chegar, qual é o principal problema, o que vamos fazer e o que a pessoa deve fazer agora.",
        "Não invente métricas, depoimentos, resultados, clientes, preços, características da oferta ou fatos sobre o Instagram.",
        "Se faltar uma informação essencial, use uma hipótese conservadora e deixe isso refletido na estratégia.",
        "Priorize clareza, especificidade e execução. Evite clichês e frases que não orientem uma ação concreta.",
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
