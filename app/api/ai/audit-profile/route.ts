import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer" },
    summary: { type: "string" },
    firstImpression: { type: "string" },
    bio: {
      type: "object", additionalProperties: false,
      properties: {
        score: { type: "integer", minimum: 0, maximum: 100 },
        diagnosis: { type: "string" },
        impact: { type: "string" },
        recommendation: { type: "string" },
        suggestedBio: { type: "string" }
      },
      required: ["score","diagnosis","impact","recommendation","suggestedBio"]
    },
    profilePhoto: {
      type: "object", additionalProperties: false,
      properties: { score:{type:"integer",minimum:0,maximum:100}, diagnosis:{type:"string"}, recommendation:{type:"string"} },
      required:["score","diagnosis","recommendation"]
    },
    nameAndPositioning: {
      type: "object", additionalProperties: false,
      properties: { score:{type:"integer",minimum:0,maximum:100}, diagnosis:{type:"string"}, recommendation:{type:"string"} },
      required:["score","diagnosis","recommendation"]
    },
    highlights: {
      type: "object", additionalProperties: false,
      properties: { score:{type:"integer",minimum:0,maximum:100}, diagnosis:{type:"string"}, recommendation:{type:"string"} },
      required:["score","diagnosis","recommendation"]
    },
    grid: {
      type: "object", additionalProperties: false,
      properties: { score:{type:"integer",minimum:0,maximum:100}, diagnosis:{type:"string"}, recommendation:{type:"string"} },
      required:["score","diagnosis","recommendation"]
    },
    conversion: {
      type: "object", additionalProperties: false,
      properties: {
        score:{type:"integer",minimum:0,maximum:100},
        diagnosis:{type:"string"},
        recommendation:{type:"string"},
        ctaSuggestion:{type:"string"}
      },
      required:["score","diagnosis","recommendation","ctaSuggestion"]
    },
    postingFrequency: {
      type: "object", additionalProperties: false,
      properties: {
        score:{type:"integer",minimum:0,maximum:100},
        diagnosis:{type:"string"},
        recommendation:{type:"string"}
      },
      required:["score","diagnosis","recommendation"]
    },
    priorities: { type: "array", minItems:3, maxItems:5, items:{type:"string"} },
    limitations: { type: "array", items:{type:"string"} }
  },
  required: [
    "overallScore","summary","firstImpression","bio","profilePhoto",
    "nameAndPositioning","highlights","grid","conversion","postingFrequency","priorities","limitations"
  ]
} as const;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY ainda não está configurada no servidor." }, { status: 503 });
  }

  const profile = user.strategicProfile;
  if (!profile) return NextResponse.json({ error: "Complete seu perfil antes da auditoria." }, { status: 400 });

  const account = user.socialAccounts.find((item) => item.platform === "INSTAGRAM") || user.socialAccounts[0] || null;
  if (!account) return NextResponse.json({ error: "Nenhum Instagram conectado." }, { status: 400 });

  try {
    // Use the latest synchronized data already stored in the account.
    // Do not call Apify again here: the audit must respond quickly and should not
    // get stuck waiting for two additional scraper runs.
    const sourceAccount = account;
    const media = Array.isArray(sourceAccount.mediaCache) ? sourceAccount.mediaCache.slice(0, 4) : [];
    const inputContent: any[] = [{
      type: "input_text",
      text: JSON.stringify({
        cliente: user.name,
        instagram: {
          username: sourceAccount.username,
          nome: sourceAccount.fullName,
          bio: sourceAccount.biography,
          site: sourceAccount.website,
          fotoPerfilUrl: sourceAccount.profilePictureUrl,
          seguidores: sourceAccount.followersCount,
          seguindo: sourceAccount.followsCount,
          publicacoes: sourceAccount.mediaCount,
          ultimaSincronizacao: sourceAccount.lastSyncedAt,
          ultimosConteudos: media
        },
        negocio: {
          descricao: profile.profileDescription,
          tipo: profile.businessType,
          nicho: profile.niche,
          oferta: profile.offer,
          objetivo: profile.objective,
          publico: profile.audience,
          posicionamento: profile.desiredPositioning,
          diferenciais: profile.differentiators
        }
      })
    }];

    if (sourceAccount.profilePictureUrl) {
      inputContent.push({ type: "input_image", image_url: sourceAccount.profilePictureUrl });
    }
    for (const item of media) {
      const itemObject =
        item && typeof item === "object" && !Array.isArray(item)
          ? (item as Record<string, unknown>)
          : null;
      const url = itemObject?.media_url || itemObject?.thumbnail_url;
      if (typeof url === "string" && /^https?:\/\//.test(url)) {
        inputContent.push({ type: "input_image", image_url: url });
      }
    }

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      instructions: [
        "Você é o auditor de Instagram do MidiaNet AI.",
        "Faça somente a auditoria do perfil; não gere estratégia semanal, calendário ou conteúdo.",
        "Use primeiro os dados reais do bloco instagram. Não invente informações.",
        "Analise bio, nome/posicionamento, foto de perfil, destaques, grade/feed, frequência de postagem, primeira impressão e conversão.",
        "Quando uma imagem foi anexada, analise somente o que está realmente visível nela.",
        "Os conteúdos anexados são apenas uma amostra dos últimos conteúdos, não representam necessariamente toda a grade.",
        "Se não houver imagem suficiente para avaliar destaques ou a grade inteira, declare a limitação em vez de fingir que viu.",
        "Não inclua URLs, links, endereços de sites, referências de busca ou citações nos campos de texto.",
        "overallScore é apenas uma referência interna de 0 a 100 baseada nos dados disponíveis, não uma verdade objetiva.",
        "Dê uma nota própria de 0 a 100 para cada critério: nome/@, foto, bio, destaques, grade/feed, frequência e conversão. Entregue recomendações práticas e uma sugestão de bio pronta.",
        "Responda exclusivamente no JSON estruturado solicitado."
      ].join("\n"),
      input: [{ role: "user", content: inputContent }],
      text: {
        format: {
          type: "json_schema",
          name: "midianet_profile_audit",
          strict: true,
          schema
        }
      }
    });

    if (!response.output_text) {
      return NextResponse.json({ error: "A IA não retornou a auditoria." }, { status: 502 });
    }

    const profileAudit = JSON.parse(response.output_text);
    const current = profile.aiProfile && typeof profile.aiProfile === "object"
      ? { ...(profile.aiProfile as any), profileAudit }
      : { profileAudit };

    const updated = await db.strategicProfile.update({
      where: { id: profile.id },
      data: {
        aiProfile: current,
        aiAnalyzedAt: new Date()
      }
    });

    return NextResponse.json({
      ok: true,
      profileAudit,
      aiAnalyzedAt: updated.aiAnalyzedAt
    });
  } catch (error) {
    console.error("[audit-profile]", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Não foi possível atualizar a auditoria."
    }, { status: 502 });
  }
}
