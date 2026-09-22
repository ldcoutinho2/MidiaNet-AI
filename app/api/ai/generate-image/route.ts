import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { consumeImageGeneration } from "@/lib/entitlements";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "OPENAI_API_KEY não está configurada." }, { status: 503 });

  const body = await request.json().catch(() => ({}));
  const prompt = String(body.prompt || "").trim();
  if (!prompt) return NextResponse.json({ error: "Prompt visual ausente." }, { status: 400 });

  try {
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt,
        size: "1024x1024",
        quality: "medium"
      })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("openai_image_error", data);
      return NextResponse.json({ error: data?.error?.message || "Não foi possível gerar a imagem." }, { status: response.status });
    }

    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) return NextResponse.json({ error: "A IA não retornou a imagem." }, { status: 502 });

    const consumed = await consumeImageGeneration(user.id);
    if (!consumed.ok) {
      return NextResponse.json({ error: consumed.error }, { status: 402 });
    }

    return NextResponse.json({ ok: true, image: `data:image/png;base64,${b64}` });
  } catch (error) {
    console.error("generate_image_error", error);
    return NextResponse.json({ error: "Erro ao gerar imagem." }, { status: 500 });
  }
}
