// MidiaNet AI profile analysis route
// Production build verification
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
        insightsAnalysis: { type: "object", additionalProperties: false, properties: { summary:{type:"string"}, opportunities:{type:"array",items:{type:"string"}}, risks:{type:"array",items:{type:"string"}}, metricsToWatch:{type:"array",items:{type:"string"}} }, required:["summary","opportunities","risks","metricsToWatch"] },
        priorities: { type: "array", minItems:3, maxItems:5, items:{type:"string"} },
        limitations: { type: "array", items:{type:"string"} }
      },
      required: ["overallScore","summary","firstImpression","bio","profilePhoto","nameAndPositioning","highlights","grid","conversion","insightsAnalysis","priorities","limitations"]
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
            minItems: 1,
            maxItems: 4,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                time: { type: "string", enum: ["09:00","12:30","17:00","19:00","21:00"] },
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
                executionSteps: { type: "array", items: { type: "string" } },
                whyItFits: { type: "string" },
                audienceProblem: { type: "string" },
                funnelStage: { type: "string" },
                desiredAction: { type: "string" },
                successSignal: { type: "string" },
                trendAngle: { type: "string" },
                originalityAngle: { type: "string" }
              },
              required: ["time","format","role","objective","title","topic","hook","script","caption","visualDirection","cta","executionSteps","whyItFits","audienceProblem","funnelStage","desiredAction","successSignal","trendAngle","originalityAngle"]
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
    const consumption = await consumeContentGeneration(user.id, { dryRun: true });
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
      tools: undefined,
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
        "Quando houver um print do perfil, trate-o como a visão real do visitante: analise bio, nome, foto, destaques, organização visual, feed visível, clareza da oferta, público percebido e CTA. Cruze isso com os dados públicos; não duplique informação sem acrescentar interpretação.",
        "Quando houver um print de Insights, leia somente os números e categorias realmente visíveis. Use alcance, visitas ao perfil, cliques, crescimento, horários e audiência quando aparecerem. Cruze esses sinais com o objetivo do cliente e explique o que eles sugerem, sem afirmar causalidade.",
        "O print de Insights é dado fornecido pelo próprio cliente. Trate-o como evidência do período mostrado no print, não como métrica atual permanente. Se a data/período estiver visível, mencione o período; se não estiver, diga que o período não foi confirmado.",
        "Nunca invente números que não estejam no print ou nos dados públicos. Se um número estiver ilegível ou ausente, registre a limitação.",
        "Use as imagens somente para avaliar os conteúdos realmente enviados. Não trate os últimos 6 conteúdos como se fossem necessariamente toda a grade do perfil.",
        "A frequência informada pelo cliente é uma preferência de referência; não trate automaticamente uma meta de 5 conteúdos por semana como limite se a capacidade e o objetivo indicarem uma frequência maior. Só trate como limite quando o cliente disser explicitamente que não consegue produzir mais.",
        "A programação diária do MidiaNet é SEMPRE 4 conteúdos: 1 Story obrigatório primeiro + 3 publicações principais no feed. O Story é fundamental e NÃO conta como uma das 3 publicações principais.",
        "Em todos os 7 dias, gere exatamente 4 slots nesta ordem: Story primeiro, depois publicação 1, publicação 2 e publicação 3. Nunca reduza para 1, 2 ou 3 conteúdos totais por dia.",
        "O Story deve ser pensado para abertura do dia, relacionamento, interação ou preparação da audiência. As outras 3 publicações devem ser escolhidas pela análise do perfil: o modelo decide entre Foto, Reel, Carrossel e outros formatos disponíveis conforme objetivo, nicho, público, capacidade e histórico.",
        "O horário do Story é 09:00. Para as 3 publicações principais, escolha os horários mais adequados entre 12:30, 17:00, 19:00 e 21:00 com base nos dados e no contexto do perfil. Não trate esses horários como garantia; são hipóteses de execução.",
        "A programação deve deixar impossível confundir quantos conteúdos existem em cada dia: exatamente 4, sendo 1 Story + 3 publicações principais. Cada slot deve ser diferente e completo.",
        "Distribua funções claras entre os conteúdos: descoberta/alcance, autoridade, relacionamento, prova quando houver dados reais, oferta/conversão e retenção. Não invente provas.",
        "Para cada conteúdo entregue também: por que ele é adequado a este perfil, qual problema específico da audiência ele ataca, em que etapa do funil ele atua, qual ação queremos provocar, qual sinal/métrica indica sucesso, qual ângulo atual ou tendência justifica o tema e qual elemento torna a ideia original.",
        "Nunca escreva títulos genéricos como 'dicas para crescer', '3 dicas para melhorar' ou equivalentes sem um contexto específico. O título deve conter uma tensão, situação, opinião, contraste, erro, desejo ou oportunidade real do nicho.",
        "Cada dia deve formar uma sequência: Story abre conversa ou contexto; publicação 1 conquista atenção/descoberta; publicação 2 aprofunda autoridade, prova ou utilidade; publicação 3 conduz relacionamento, oferta ou próxima ação conforme o objetivo. Não repita a mesma função quatro vezes.",
        "Use uma ideia central diferente por dia. Evite preencher a semana trocando apenas o título de um mesmo post.",
        "Use sinais de 2026 sem copiar tendências vazias: conteúdo original, compartilhável, salvável, linguagem natural pesquisável, perguntas que geram conversa, Reels para descoberta e carrosséis para profundidade/salvamento. Adapte isso ao nicho; não force formato só porque está em alta.",
        "Quando mencionar uma tendência, transforme-a em uma aplicação concreta para o nicho do cliente. A tendência é um mecanismo, não o tema inteiro.",
        "Não invente notícias, memes, áudios ou tendências específicas. Se não houver dado em tempo real, use apenas padrões atuais conhecidos e sinalize como contexto, não como fato sobre o perfil.",
        "Para cada conteúdo entregue horário sugerido, formato, função, objetivo, título, tema, gancho, roteiro completo, legenda pronta, direção visual, CTA e passos de execução.",
        "Para Reels, escreva cena a cena quando possível. Se o cliente não aparecer, use tela, B-roll, demonstração, texto ou voz em off.",
        "Os horários são pontos de partida. Se houver histórico do próprio perfil, use esses dados para personalizar os horários; sem histórico, trate-os como hipóteses.",
        "Antes da estratégia, faça uma auditoria prática do perfil atual. Avalie primeira impressão, nome, bio, foto de perfil, destaques, grade, posicionamento e conversão. Dê recomendações concretas e uma sugestão de bio pronta. Não invente elementos visuais ou informações que você não conseguiu observar. Se a fonte pública não permitir avaliar foto, capas ou grade com segurança, diga isso em limitations e trate a recomendação como hipótese a validar.",
        "A auditoria deve separar diagnóstico, impacto e ação. Não use uma nota como verdade objetiva: overallScore é apenas uma referência interna de 0 a 100 baseada nas informações disponíveis. Não prometa aumento de seguidores, alcance ou vendas.",
        "A estratégia deve ensinar o cliente: posicionamento, pilares, lógica do funil, objetivo de cada conteúdo, métricas importantes e como decidir o próximo conteúdo. O cliente deve entender o motivo de cada ação.",
        "Não invente métricas, depoimentos, resultados, clientes, preços, características da oferta ou fatos sobre o Instagram.",
        "Se faltar uma informação essencial, use uma hipótese conservadora e deixe isso refletido na estratégia.",
        "Priorize clareza, especificidade e execução. Evite clichês e frases que não orientem uma ação concreta.",
        instagramReference
          ? "O cliente forneceu um perfil do Instagram. Use os dados públicos e as imagens enviadas como fontes principais. Não inclua URLs, links, endereços de sites, referências de busca ou citações de fontes dentro dos campos de diagnóstico, resumo, recomendações, limitações ou plano. Se uma informação não puder ser confirmada, diga apenas que não foi possível confirmar."
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
                desafiosAtuais: profile.currentChallenges,
                diagnosticoVisual: {
                  printDoPerfilEnviado: Boolean(profile.profileScreenshotData),
                  printDosInsightsEnviado: Boolean(profile.insightsScreenshotData)
                }
              })
            },
            ...(instagramData?.fotoPerfilUrl
              ? [{ type: "input_image" as const, image_url: instagramData.fotoPerfilUrl }]
              : []),
            ...(typeof profile.profileScreenshotData === "string" && profile.profileScreenshotData.startsWith("data:image/")
              ? [{ type: "input_image" as const, image_url: profile.profileScreenshotData }]
              : []),
            ...(typeof profile.insightsScreenshotData === "string" && profile.insightsScreenshotData.startsWith("data:image/")
              ? [{ type: "input_image" as const, image_url: profile.insightsScreenshotData }]
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
    // Cadência obrigatória: 1 Story + 3 publicações principais por dia.
    // Os formatos e os horários das 3 publicações continuam sendo definidos pela análise da IA.
    const postTimeOrder = ["12:30", "17:00", "19:00", "21:00"];
    if (Array.isArray(aiProfile.weeklyPlan)) {
      aiProfile.weeklyPlan = aiProfile.weeklyPlan.slice(0, 7).map((day: any) => {
        const rawSlots = Array.isArray(day.slots) ? day.slots : [];
        const story = rawSlots.find((slot: any) => String(slot?.format || "").toLowerCase() === "story") || rawSlots[0] || {};
        const posts = rawSlots
          .filter((slot: any) => slot !== story && String(slot?.format || "").toLowerCase() !== "story")
          .slice(0, 3)
          .sort((a: any, b: any) => postTimeOrder.indexOf(a?.time) - postTimeOrder.indexOf(b?.time));
        while (posts.length < 3) {
          posts.push({
            ...(posts[posts.length - 1] || story || {}),
            format: posts.length === 0 ? "Reel" : posts.length === 1 ? "Carrossel" : "Foto",
            title: posts[posts.length - 1]?.title || "Publicação principal do dia",
            role: posts[posts.length - 1]?.role || "Publicação principal",
            objective: posts[posts.length - 1]?.objective || "Executar a estratégia do perfil",
            topic: posts[posts.length - 1]?.topic || "",
            hook: posts[posts.length - 1]?.hook || "",
            script: posts[posts.length - 1]?.script || "",
            caption: posts[posts.length - 1]?.caption || "",
            visualDirection: posts[posts.length - 1]?.visualDirection || "",
            cta: posts[posts.length - 1]?.cta || "",
            executionSteps: posts[posts.length - 1]?.executionSteps || [],
            whyItFits: posts[posts.length - 1]?.whyItFits || "Completa a estratégia definida para este perfil.",
            audienceProblem: posts[posts.length - 1]?.audienceProblem || "",
            funnelStage: posts[posts.length - 1]?.funnelStage || "Relacionamento",
            desiredAction: posts[posts.length - 1]?.desiredAction || "",
            successSignal: posts[posts.length - 1]?.successSignal || "Observe as interações e a ação esperada.",
            trendAngle: posts[posts.length - 1]?.trendAngle || "",
            originalityAngle: posts[posts.length - 1]?.originalityAngle || ""
          });
        }
        const finalPosts = posts.slice(0, 3).map((slot: any, index: number) => ({
          ...slot,
          time: postTimeOrder[index]
        }));
        return {
          ...day,
          slots: [
            { ...story, format: "Story", time: "09:00" },
            ...finalPosts
          ]
        };
      });
    }
    aiProfile.weeklyContentCount = Array.isArray(aiProfile.weeklyPlan)
      ? aiProfile.weeklyPlan.reduce(
          (total: number, day: { slots?: unknown[] }) => total + (Array.isArray(day.slots) ? day.slots.length : 0),
          0
        )
      : 0;
    aiProfile.dailyContentCount = "4 conteúdos por dia: 1 Story + 3 publicações";
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
