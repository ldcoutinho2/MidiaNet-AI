import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";
import { consumeContentGeneration } from "@/lib/entitlements";

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    options: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          format: { type: "string" },
          angle: { type: "string" },
          title: { type: "string" },
          hook: { type: "string" },
          objective: { type: "string" },
          script: { type: "string" },
          caption: { type: "string" },
          cta: { type: "string" },
          direction: { type: "string" },
          executionSteps: { type: "array", items: { type: "string" } }
        },
        required: ["format","angle","title","hook","objective","script","caption","cta","direction","executionSteps"]
      }
    }
  },
  required: ["options"]
} as const;

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY não está configurada." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const idea = String(body.idea || "").trim();
  if (!idea) return NextResponse.json({ error: "Digite uma ideia primeiro." }, { status: 400 });

  const entitlement = await consumeContentGeneration(user.id, { dryRun: true });
  if (!entitlement.ok) return NextResponse.json({ error: entitlement.error }, { status: 402 });

  const profile = user.strategicProfile;
  if (!profile) return NextResponse.json({ error: "Complete seu perfil primeiro." }, { status: 400 });

  try {
    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      instructions: [
        "Você é o multiplicador de ideias do MidiaNet AI.",
        "O usuário traz UMA ideia. Transforme-a em exatamente 3 formatos: Reel, Carrossel e Story.",
        "Não substitua a ideia central por outra. Expanda a mesma ideia por ângulos diferentes.",
        "Cada formato deve ser completo e diferente, mantendo a mesma ideia central.",
        "Evite cinco variações quase iguais.",
        "Considere o nicho, público, objetivo, posicionamento e oferta do usuário.",
        "Não invente fatos, resultados, depoimentos, preços ou provas.",
        "Para cada opção entregue gancho, roteiro, legenda, CTA, direção visual e passos de execução prontos para publicar.",
        "Responda exclusivamente no JSON estruturado solicitado."
      ].join("\n"),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            ideia: idea,
            perfil: {
              nicho: profile.niche,
              oferta: profile.offer,
              publico: profile.audience,
              objetivo: profile.objective,
              posicionamento: profile.desiredPositioning,
              personalidade: profile.brandPersonality,
              estilo: profile.contentStyle
            }
          })
        }]
      }],
      text: {
        format: {
          type: "json_schema",
          name: "midianet_idea_multiplier",
          strict: true,
          schema
        }
      }
    });

    if (!response.output_text) return NextResponse.json({ error: "A IA não retornou opções." }, { status: 502 });
    const finalConsumption = await consumeContentGeneration(user.id);
    if (!finalConsumption.ok) return NextResponse.json({ error: finalConsumption.error }, { status: 402 });
    return NextResponse.json({ ok: true, options: JSON.parse(response.output_text).options });
  } catch (error) {
    console.error("ai_multiply_idea_error", error);
    return NextResponse.json({ error: "Não foi possível multiplicar a ideia agora." }, { status: 500 });
  }
}
