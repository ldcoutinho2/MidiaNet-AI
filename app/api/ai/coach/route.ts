import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openai } from "@/lib/openai";

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY não está configurada no servidor." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const question = typeof body.question === "string" ? body.question.trim() : "";
  if (!question) return NextResponse.json({ error: "Digite sua dúvida." }, { status: 400 });
  if (question.length > 1200) return NextResponse.json({ error: "Sua pergunta deve ter até 1.200 caracteres." }, { status: 400 });

  const profile = user.strategicProfile;
  const aiProfile = profile?.aiProfile && typeof profile.aiProfile === "object" ? profile.aiProfile : null;

  try {
    const response = await openai.responses.create({
      model: "gpt-5.6-luna",
      instructions: [
        "Você é o professor e estrategista do MidiaNet AI.",
        "Responda dúvidas do cliente sobre Instagram, posicionamento, marca, conteúdo, funil, vendas, métricas e presença digital.",
        "Ensine o raciocínio. Não responda apenas com uma lista pronta.",
        "Explique de forma simples, prática e específica para o negócio do cliente.",
        "Quando a pergunta pedir uma decisão, apresente a lógica e os critérios para o cliente aprender a decidir sozinho.",
        "Não prometa seguidores, viralização, vendas ou resultados garantidos.",
        "Se faltar contexto, faça uma suposição conservadora e deixe isso claro.",
        "Use português do Brasil e respostas objetivas.",
        "Não use markdown excessivo."
      ].join("\n"),
      input: [{
        role: "user",
        content: [{
          type: "input_text",
          text: JSON.stringify({
            cliente: user.name,
            negocio: profile ? {
              descricao: profile.profileDescription,
              tipo: profile.businessType,
              nicho: profile.niche,
              oferta: profile.offer,
              objetivo: profile.objective,
              publico: profile.audience,
              posicionamento: profile.desiredPositioning,
              diferenciais: profile.differentiators
            } : null,
            estrategiaAtual: aiProfile ? {
              posicionamento: aiProfile.positioning,
              publico: aiProfile.audience,
              objetivo: aiProfile.objective,
              funil: aiProfile.conversionStrategy,
              pilares: aiProfile.contentPillars
            } : null,
            pergunta: question
          })
        }]
      ]
    });

    if (!response.output_text) return NextResponse.json({ error: "A IA não retornou uma resposta." }, { status: 502 });
    return NextResponse.json({ ok: true, answer: response.output_text });
  } catch (error) {
    console.error("ai_coach_error", error);
    return NextResponse.json({ error: "Não foi possível responder agora. Tente novamente." }, { status: 500 });
  }
}
