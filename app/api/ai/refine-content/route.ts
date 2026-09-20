import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { openai } from "@/lib/openai";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string" },
    format: { type: "string" },
    objective: { type: "string" },
    angle: { type: "string" },
    hook: { type: "string" },
    whyItFits: { type: "string" },
    script: { type: "string" },
    caption: { type: "string" },
    visualDirection: { type: "string" },
    cta: { type: "string" },
    executionSteps: { type: "array", items: { type: "string" } },
    carouselSlides: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          slide: { type: "integer" },
          headline: { type: "string" },
          body: { type: "string" },
          visual: { type: "string" }
        },
        required: ["slide", "headline", "body", "visual"]
      }
    },
    assistantReply: { type: "string" }
  },
  required: [
    "title", "format", "objective", "angle", "hook", "whyItFits",
    "script", "caption", "visualDirection", "cta", "executionSteps",
    "carouselSlides", "assistantReply"
  ]
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "OPENAI_API_KEY não está configurada." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const mode = String(body.mode || "refine");
    const idea = body.idea || {};
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const format = String(body.format || idea.format || "Reels");

    const profile = user.strategicProfile;
    if (!profile) return NextResponse.json({ error: "Complete seu perfil primeiro." }, { status: 400 });

    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      instructions: [
        "Você é o copiloto de conteúdo pessoal do usuário dentro do MidiaNet AI.",
        "Não trate a primeira sugestão como definitiva. O cliente controla a criação e pode discordar, mudar a direção ou trazer uma ideia própria.",
        "Quando o cliente pedir uma alteração, preserve o que ele aprovou e altere somente o necessário.",
        "Quando o cliente trouxer uma ideia própria, desenvolva a ideia dele em vez de substituí-la por uma ideia sua.",
        "Use o perfil estratégico como contexto, mas priorize as instruções explícitas da conversa.",
        "Nunca invente fatos, resultados, depoimentos, preços ou características da oferta.",
        "A resposta deve produzir conteúdo concreto e pronto para execução, não uma lista de conselhos.",
        "Para Reels, o roteiro deve conter abertura, desenvolvimento e fechamento, com fala/texto de cena e duração aproximada quando fizer sentido.",
        "Para carrossel, gere de 6 a 10 slides com capa forte, desenvolvimento lógico e CTA final.",
        "A legenda deve estar pronta para copiar e publicar.",
        "A CTA deve ser específica e coerente com o objetivo.",
        mode === "generate"
          ? "O cliente aprovou a ideia. Agora transforme-a em um pacote completo no formato solicitado."
          : "O cliente está refinando a ideia. Responda à conversa e entregue uma nova versão completa da ideia.",
        "Responda exclusivamente no formato estruturado solicitado."
      ].join("\n"),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: JSON.stringify({
                modo: mode,
                mensagemDoCliente: message,
                historico: history,
                ideiaAtual: idea,
                formatoEscolhido: format,
                perfilEstrategico: {
                  nicho: profile.niche,
                  oferta: profile.offer,
                  publico: profile.audience,
                  objetivo: profile.objective,
                  posicionamento: profile.desiredPositioning,
                  personalidade: profile.brandPersonality,
                  estilo: profile.contentStyle,
                  formatos: profile.contentPreferences,
                  apareceNosVideos: profile.appearsOnCamera,
                  restricoes: profile.constraints,
                  diferenciais: profile.differentiators,
                  funil: profile.salesFunnel
                }
              })
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "midianet_content_copilot",
          strict: true,
          schema
        }
      }
    });

    if (!response.output_text) {
      return NextResponse.json({ error: "A IA não retornou conteúdo." }, { status: 502 });
    }

    const result = JSON.parse(response.output_text);

    const current = (profile.aiProfile && typeof profile.aiProfile === "object")
      ? profile.aiProfile as Record<string, any>
      : {};

    const contentMemory = Array.isArray(current.contentMemory)
      ? current.contentMemory
      : [];

    const memoryItem = {
      at: new Date().toISOString(),
      idea: result.title,
      format: result.format,
      clientInstruction: message,
      assistantReply: result.assistantReply
    };

    await db.strategicProfile.update({
      where: { userId: user.id },
      data: {
        aiProfile: {
          ...current,
          contentMemory: [...contentMemory.slice(-29), memoryItem]
        }
      }
    });

    return NextResponse.json({ ok: true, result });
  } catch (error) {
    console.error("ai_refine_content_error", error);
    return NextResponse.json(
      { error: "Não foi possível ajustar esse conteúdo agora." },
      { status: 500 }
    );
  }
}
