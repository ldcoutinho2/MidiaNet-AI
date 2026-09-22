import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";
import { consumeContentGeneration, getEntitlement } from "@/lib/entitlements";

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
    profileAudit: {
      type: "object",
      additionalProperties: false,
      properties: {
        overallScore: { type: "integer" },
        summary: { type: "string" },
        firstImpression: { type: "string" },
        bio: {
          type: "object", additionalProperties: false,
          properties: {
            diagnosis: { type: "string" }, impact: { type: "string" }, recommendation: { type: "string" },
            suggestedBio: { type: "string" }
          },
          required: ["diagnosis","impact","recommendation","suggestedBio"]
        },
        profilePhoto: { type: "object", additionalProperties: false, properties: { diagnosis:{type:"string"}, recommendation:{type:"string"} }, required:["diagnosis","recommendation"] },
        nameAndPositioning: { type: "object", additionalProperties: false, properties: { diagnosis:{type:"string"}, recommendation:{type:"string"} }, required:["diagnosis","recommendation"] },
        highlights: { type: "object", additionalProperties: false, properties: { diagnosis:{type:"string"}, recommendation:{type:"string"} }, required:["diagnosis","recommendation"] },
        grid: { type: "object", additionalProperties: false, properties: { diagnosis:{type:"string"}, recommendation:{type:"string"} }, required:["diagnosis","recommendation"] },
        conversion: { type: "object", additionalProperties: false, properties: { diagnosis:{type:"string"}, recommendation:{type:"string"}, ctaSuggestion:{type:"string"} }, required:["diagnosis","recommendation","ctaSuggestion"] },
        priorities: { type: "array", minItems:3, maxItems:5, items:{type:"string"} },
        limitations: { type: "array", items:{type:"string"} }
      },
      required: ["overallScore","summary","firstImpression","bio","profilePhoto","nameAndPositioning","highlights","grid","conversion","priorities","limitations"]
    },
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
      minItems: 7,
      maxItems: 7,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          day: { type: "string" },
          mission: { type: "string" },
          slots: {
            type: "array",
            minItems: 4,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                time: { type: "string", enum: ["09:00","12:30","19:00","21:00"] },
                format: { type: "string", enum: ["Story","Foto","Reel","Carrossel"] },
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
    "contentPillars","tone","strengths","opportunities","profileAudit","thirtyDayPlan","weeklyPlan"
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
    const entitlement = await getEntitlement(user.id);
    if (!entitlement.active) return NextResponse.json({ error: "Seu teste terminou. Escolha um plano para continuar." }, { status: 402 });
    const consumption = await consumeContentGeneration(user.id);
    if (!consumption.ok) return NextResponse.json({ error: consumption.error }, { status: 402 });
    const instagramAccount = user.socialAccounts[0] || null;
    const instagramReference = profile.instagramProfileUrl
      ? normalizeInstagramReference(profile.instagramProfileUrl)
      : instagramAccount?.username || "";

    let instagramData: any = null;
    if (instagramAccount) {
      const latestSnapshot = await db.metricSnapshot.findFirst({
        where: { socialAccountId: instagramAccount.id },
        orderBy: { capturedAt: "desc" },
      });
      const previousSnapshot = await db.metricSnapshot.findFirst({
        where: {
          socialAccountId: instagramAccount.id,
          id: { not: latestSnapshot?.id || "" },
        },
        orderBy: { capturedAt: "desc" },
      });
      instagramData = {
        conectado: true,
        username: instagramAccount.username,
        nome: instagramAccount.fullName,
        bio: instagramAccount.biography,
        site: instagramAccount.website,
        fotoPerfil: Boolean(instagramAccount.profilePictureUrl),
        fotoPerfilUrl: instagramAccount.profilePictureUrl,
        seguidores: instagramAccount.followersCount,
        seguindo: instagramAccount.followsCount,
        publicacoes: instagramAccount.mediaCount,
        ultimaSincronizacao: instagramAccount.lastSyncedAt,
        metricasAtuais: latestSnapshot ? {
          seguidores: latestSnapshot.followers,
          alcance: latestSnapshot.reach,
          visualizacoes: latestSnapshot.views,
          curtidas: latestSnapshot.likes,
          comentarios: latestSnapshot.comments,
          compartilhamentos: latestSnapshot.shares,
          salvos: latestSnapshot.saves,
          capturadoEm: latestSnapshot.capturedAt,
        } : null,
        metricasAnteriores: previousSnapshot ? {
          seguidores: previousSnapshot.followers,
          alcance: previousSnapshot.reach,
          visualizacoes: previousSnapshot.views,
          curtidas: previousSnapshot.likes,
          comentarios: previousSnapshot.comments,
          compartilhamentos: previousSnapshot.shares,
          salvos: previousSnapshot.saves,
          capturadoEm: previousSnapshot.capturedAt,
        } : null,
        ultimosConteudos: Array.isArray(instagramAccount.mediaCache)
          ? instagramAccount.mediaCache
          : [],
      };
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      tools: instagramReference ? [{ type: "web_search" }] : undefined,
      instructions: [
        "Você é o estrategista principal do MidiaNet AI. Você entrega um plano executável, não um gerador de ideias soltas.",
        "Transforme as respostas do cliente em um diagnóstico curto, uma estratégia de 30 dias, uma missão semanal e uma programação completa de conteúdo.",
        "A análise precisa ser específica para este negócio. Nunca entregue conselhos genéricos que poderiam servir para qualquer perfil.",
        "Use nicho, oferta, público, objetivo, posicionamento, diferenciais, rotina, capacidade e formatos escolhidos para decidir o plano.",
        "Quando houver uma conta do Instagram conectada, trate o bloco instagramConectado como fonte prioritária para o diagnóstico. Não substitua dados reais por suposições.",
        "Compare métricas atuais e anteriores quando existirem. Descreva variações como observações do histórico disponível, sem afirmar causalidade.",
        "Use bio, nome, site, seguidores, publicações e últimos conteúdos para tornar a auditoria específica. Se não houver imagens reais disponíveis para inspeção visual, não finja que viu a grade, capas dos destaques ou qualidade visual das fotos.",
        "Se houver apenas metadados dos últimos conteúdos, use-os para avaliar temas, formatos, frequência e sinais de engajamento, mas declare a limitação para aspectos visuais.",
        "Quando imagens forem anexadas ao input, faça uma análise visual objetiva delas: composição, legibilidade, hierarquia, consistência, uso de texto, enquadramento e qualidade percebida. Não identifique pessoas reais nem invente elementos que não estejam visíveis.",
        "Use as imagens somente para avaliar os conteúdos realmente enviados. Não trate os últimos 6 conteúdos como se fossem necessariamente toda a grade do perfil.",
        "A frequência informada pelo cliente é uma preferência de referência; não trate automaticamente uma meta de 5 conteúdos por semana como limite se a capacidade e o objetivo indicarem uma frequência maior. Só trate como limite quando o cliente disser explicitamente que não consegue produzir mais.",
        "Defina explicitamente quantos conteúdos principais serão publicados por semana e quantos por dia. Para perfis cujo objetivo seja crescimento, alcance, viralização ou aquisição de clientes, a programação principal desta versão deve usar 3 publicações por dia: Foto/Post às 12:30, Reel/Vídeo às 19:00 e Carrossel às 21:00. Além delas, cada dia deve ter 1 Story às 09:00 como conteúdo complementar. Portanto, o weeklyPlan desta versão deve ter exatamente 4 slots por dia, totalizando 28 conteúdos na semana.",
        "Stories são o primeiro conteúdo do dia e devem acontecer às 09:00. Depois, obrigatoriamente, vêm Foto/Post às 12:30, Reel/Vídeo às 19:00 e Carrossel às 21:00. Não troque essa ordem nem reduza a quantidade nesta versão.",
        "A programação deve deixar impossível confundir quantos conteúdos existem em cada dia. O weeklyPlan precisa conter todos os slots daquele dia, e cada slot deve ser um conteúdo diferente e completo.",
        "A semana deve ter 7 dias e exatamente 4 slots em cada dia. Use estes formatos nesta ordem: Story, Foto, Reel, Carrossel. Cada slot precisa ser completo e pronto para execução.",
        "Distribua funções claras entre os conteúdos: descoberta/alcance, autoridade, relacionamento, prova quando houver dados reais, oferta/conversão e retenção. Não invente provas.",
        "Para cada conteúdo entregue horário sugerido, formato, função, objetivo, título, tema, gancho, roteiro completo, legenda pronta, direção visual, CTA e passos de execução.",
        "Para Reels, escreva cena a cena quando possível. Se o cliente não aparecer, use tela, B-roll, demonstração, texto ou voz em off.",
        "Os horários são hipóteses iniciais. Nunca diga que são horários de maior audiência sem métricas reais.",
        "Antes da estratégia, faça uma auditoria prática do perfil atual. Avalie primeira impressão, nome, bio, foto de perfil, destaques, grade, posicionamento e conversão. Dê recomendações concretas e uma sugestão de bio pronta. Não invente elementos visuais ou informações que você não conseguiu observar. Se a fonte pública não permitir avaliar foto, capas ou grade com segurança, diga isso em limitations e trate a recomendação como hipótese a validar.",
        "A auditoria deve separar diagnóstico, impacto e ação. Não use uma nota como verdade objetiva: overallScore é apenas uma referência interna de 0 a 100 baseada nas informações disponíveis. Não prometa aumento de seguidores, alcance ou vendas.",
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
            },
            ...(instagramData?.fotoPerfilUrl
              ? [{ type: "input_image" as const, image_url: instagramData.fotoPerfilUrl }]
              : []),
            ...(Array.isArray(instagramData?.ultimosConteudos)
              ? instagramData.ultimosConteudos
                  .slice(0, 6)
                  .map((item: any) => item?.media_url || item?.thumbnail_url)
                  .filter((url: any): url is string => typeof url === "string" && /^https?:\/\//.test(url))
                  .map((url: string) => ({ type: "input_image" as const, image_url: url }))
              : [])
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
    const fixedSchedule = [
      { format: "Story", time: "09:00" },
      { format: "Foto", time: "12:30" },
      { format: "Reel", time: "19:00" },
      { format: "Carrossel", time: "21:00" }
    ];
    if (Array.isArray(aiProfile.weeklyPlan)) {
      aiProfile.weeklyPlan = aiProfile.weeklyPlan.slice(0, 7).map((day: any) => {
        const remaining = Array.isArray(day.slots) ? [...day.slots] : [];
        const slots = fixedSchedule.map((target: any) => {
          const index = remaining.findIndex((slot: any) => slot?.format === target.format);
          const chosen = index >= 0 ? remaining.splice(index, 1)[0] : (remaining.shift() || {});
          return { ...chosen, format: target.format, time: target.time };
        });
        return { ...day, slots };
      });
    }
    if (entitlement.trialActive) {
      aiProfile.weeklyPlan = Array.isArray(aiProfile.weeklyPlan) ? aiProfile.weeklyPlan.slice(0, 2) : [];
    }
    aiProfile.weeklyContentCount = Array.isArray(aiProfile.weeklyPlan)
      ? aiProfile.weeklyPlan.reduce(
          (total: number, day: { slots?: unknown[] }) =>
            total + (Array.isArray(day.slots) ? day.slots.length : 0),
          0
        )
      : 0;
    aiProfile.dailyContentCount = Array.isArray(aiProfile.weeklyPlan)
      ? aiProfile.weeklyPlan
          .map((day: { slots?: unknown[] }) => Array.isArray(day.slots) ? day.slots.length : 0)
          .join(" / ") + " conteúdos por dia"
      : "—";
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
