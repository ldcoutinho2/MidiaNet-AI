"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PlanItem = {
  day: string;
  format: string;
  objective?: string;
  idea: string;
  hook: string;
  script?: string;
  caption?: string;
  visualDirection?: string;
  cta?: string;
  executionSteps?: string[];
};

type ContentIdea = {
  title: string;
  format: string;
  objective: string;
  angle: string;
  hook: string;
  whyItFits: string;
};

type AIProfile = {
  positioning: string;
  audience: string;
  painPoints: string[];
  desires: string[];
  contentPillars: string[];
  tone: string[];
  contentFormats: string[];
  ctaStrategy: string;
  conversionStrategy: string;
  strengths: string[];
  opportunities: string[];
  summary: string;
  contentIdeas?: ContentIdea[];
  weeklyPlan: PlanItem[];
};

type Profile = Record<string, any> & {
  aiProfile?: AIProfile | null;
  aiAnalyzedAt?: string | null;
};

type Me = {
  user: {
    name: string | null;
    email: string;
    strategicProfile: Profile | null;
    socialAccounts: {
      id: string;
      platform: string;
      username: string | null;
    }[];
  };
};

const tabs = [
  ["overview", "🏠 Visão geral"],
  ["dna", "🧬 Meu DNA"],
  ["ideas", "💡 Ideias"],
  ["scripts", "🎬 Roteiros"],
  ["captions", "✍️ Legendas"],
  ["planner", "📅 Planejamento"],
  ["results", "📊 Resultados"],
  ["profile", "👤 Meu perfil"]
] as const;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((x) => {
        if (x) {
          if (!x.user.strategicProfile?.onboardingCompletedAt) {
            router.replace("/setup");
            return;
          }
          setData(x);
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  async function analyze() {
    setAnalyzing(true);
    setError("");

    try {
      const r = await fetch("/api/ai/analyze-profile", { method: "POST" });
      const x = await r.json();

      if (!r.ok) {
        setError(x.error || "Não foi possível gerar seu conteúdo.");
        return;
      }

      setData((d) => {
        if (!d || !d.user.strategicProfile) return d;

        return {
          ...d,
          user: {
            ...d.user,
            strategicProfile: {
              ...d.user.strategicProfile,
              aiProfile: x.aiProfile,
              aiAnalyzedAt: x.aiAnalyzedAt
            }
          }
        };
      });

      setTab("ideas");
    } catch {
      setError("Não foi possível conectar à IA.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <main className="auth">
        <div className="authbox">
          <p className="muted">Carregando seu painel...</p>
        </div>
      </main>
    );
  }

  if (!data) return null;

  const p = data.user.strategicProfile!;
  const ai = p.aiProfile;
  const plan = ai?.weeklyPlan || [];
  const ideas = ai?.contentIdeas || [];
  const activeTitle = tabs.find((x) => x[0] === tab)?.[1] || "Painel";

  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">
          MidiaNet<span>AI</span>
        </div>
        <button
          className="muted"
          onClick={logout}
          style={{ background: "none", border: 0, cursor: "pointer" }}
        >
          Sair
        </button>
      </nav>

      <section className="section" style={{ paddingTop: 28 }}>
        <div
          style={{
            display: "flex",
            gap: 10,
            overflowX: "auto",
            paddingBottom: 8
          }}
        >
          {tabs.map(([id, label]) => (
            <button
              key={id}
              className={tab === id ? "btn primary" : "btn secondary"}
              onClick={() => setTab(id)}
              style={{ whiteSpace: "nowrap" }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 28 }}>
          <div className="badge">{activeTitle}</div>
          <h1
            style={{
              fontSize: 40,
              letterSpacing: -2,
              margin: "16px 0 8px"
            }}
          >
            Olá, {data.user.name || "criador"}.
          </h1>
          <p className="muted">
            Sua estratégia, conteúdo e evolução em um só lugar.
          </p>
        </div>

        {error && (
          <p
            className="small"
            style={{ color: "#fda4af", marginTop: 14 }}
          >
            {error}
          </p>
        )}

        {tab === "overview" && (
          <Overview
            ai={ai}
            plan={plan}
            analyzing={analyzing}
            analyze={analyze}
          />
        )}

        {tab === "dna" && <DNA ai={ai} />}

        {tab === "ideas" && (
          <Ideas ideas={ideas} plan={plan} />
        )}

        {tab === "scripts" && <Scripts plan={plan} />}

        {tab === "captions" && <Captions plan={plan} />}

        {tab === "planner" && <Planner plan={plan} />}

        {tab === "results" && (
          <div style={{ marginTop: 20 }}>
            <div className="feature">
              <h3>📊 Resultados</h3>
              <p>
                Esta área será alimentada pelas métricas dos conteúdos. A
                integração oficial do Instagram poderá trazer métricas reais
                para comparar desempenho e ajustar os próximos planos.
              </p>
            </div>
          </div>
        )}

        {tab === "profile" && (
          <div style={{ marginTop: 20 }}>
            <div className="feature">
              <h3>👤 Seu diagnóstico</h3>
              <p>
                <strong>Nicho:</strong> {p.niche || "—"}
              </p>
              <p>
                <strong>Oferta:</strong> {p.offer || "—"}
              </p>
              <p>
                <strong>Posicionamento:</strong>{" "}
                {p.desiredPositioning || "—"}
              </p>
              <p>
                <strong>Formatos:</strong>{" "}
                {Array.isArray(p.contentPreferences)
                  ? p.contentPreferences.join(", ")
                  : "—"}
              </p>
              <button
                className="btn secondary"
                onClick={() => router.push("/setup")}
                style={{ marginTop: 16 }}
              >
                Editar diagnóstico
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function Overview({
  ai,
  plan,
  analyzing,
  analyze
}: {
  ai: AIProfile | null | undefined;
  plan: PlanItem[];
  analyzing: boolean;
  analyze: () => void;
}) {
  if (!ai) {
    return (
      <div className="feature" style={{ marginTop: 20 }}>
        <h3>🧠 Criar sua estratégia de conteúdo</h3>
        <p>
          A IA vai transformar suas respostas em ideias específicas, roteiros
          completos, legendas prontas e um plano de 7 dias.
        </p>
        <button
          className="btn primary"
          onClick={analyze}
          disabled={analyzing}
          style={{ marginTop: 16 }}
        >
          {analyzing ? "Criando seus conteúdos..." : "Criar meu conteúdo →"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="grid3" style={{ marginTop: 22 }}>
        <div className="feature">
          <h3>🧬 Posicionamento</h3>
          <p>{ai.positioning}</p>
        </div>
        <div className="feature">
          <h3>👥 Público</h3>
          <p>{ai.audience}</p>
        </div>
        <div className="feature">
          <h3>🎯 Conversão</h3>
          <p>{ai.conversionStrategy}</p>
        </div>
      </div>

      <div className="feature" style={{ marginTop: 20 }}>
        <h3>🚀 O que a IA preparou para você</h3>
        <p>
          {ai.contentIdeas?.length || 0} ideias acionáveis +{" "}
          {plan.length} conteúdos completos para a primeira semana.
        </p>

        {plan.slice(0, 3).map((x, i) => (
          <div className="card" key={i} style={{ marginTop: 10 }}>
            <strong>
              {x.day} · {x.format}
            </strong>
            <p style={{ marginTop: 6 }}>{x.idea}</p>
            <p className="small muted" style={{ marginTop: 6 }}>
              Objetivo: {x.objective || "Conteúdo estratégico"}
            </p>
            <p className="small" style={{ marginTop: 6 }}>
              <strong>Gancho:</strong> {x.hook}
            </p>
          </div>
        ))}
      </div>

      <button
        className="btn secondary"
        onClick={analyze}
        disabled={analyzing}
        style={{ marginTop: 14 }}
      >
        {analyzing ? "Regenerando..." : "Regenerar estratégia e conteúdos"}
      </button>
    </>
  );
}

function DNA({ ai }: { ai: AIProfile | null | undefined }) {
  if (!ai) {
    return (
      <div style={{ marginTop: 20 }}>
        <div className="feature">
          <h3>DNA ainda não criado</h3>
          <p>Inicie a criação na Visão geral.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="grid3">
        <div className="feature">
          <h3>Posicionamento</h3>
          <p>{ai.positioning}</p>
        </div>
        <div className="feature">
          <h3>Público</h3>
          <p>{ai.audience}</p>
        </div>
        <div className="feature">
          <h3>Tom</h3>
          <p>{ai.tone.join(" · ")}</p>
        </div>
      </div>

      <div className="feature" style={{ marginTop: 16 }}>
        <h3>Resumo estratégico</h3>
        <p>{ai.summary}</p>

        <div className="grid3" style={{ marginTop: 18 }}>
          <div>
            <strong>Forças</strong>
            <ul>{ai.strengths.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div>
            <strong>Oportunidades</strong>
            <ul>{ai.opportunities.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
          <div>
            <strong>Dores</strong>
            <ul>{ai.painPoints.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </div>
        </div>
      </div>

      <div className="feature" style={{ marginTop: 16 }}>
        <h3>Pilares de conteúdo</h3>
        <div className="grid3">
          {ai.contentPillars.map((x, i) => (
            <div className="card" key={i}>
              <strong>{x}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Ideas({
  ideas,
  plan
}: {
  ideas: ContentIdea[];
  plan: PlanItem[];
}) {
  const [selected, setSelected] = useState<ContentIdea | null>(null);
  const [format, setFormat] = useState("Reels");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState<{ role: string; text: string }[]>([]);
  const [result, setResult] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [ownIdea, setOwnIdea] = useState("");

  const fallback = plan.map((x) => ({
    title: x.idea,
    format: x.format,
    objective: x.objective || "Conteúdo estratégico",
    angle: x.idea,
    hook: x.hook,
    whyItFits: "Parte do plano semanal personalizado."
  }));

  const items = ideas.length ? ideas : fallback;

  async function sendToAI(mode: "refine" | "generate", customIdea?: ContentIdea) {
    const idea = customIdea || selected;
    if (!idea) return;

    setBusy(true);

    const userMessage =
      customIdea
        ? "Minha ideia é: " + customIdea.title
        : message.trim() || "Melhore esta ideia mantendo a essência e deixe pronta para execução.";

    const nextChat = [...chat, { role: "user", text: userMessage }];
    setChat(nextChat);
    setMessage("");

    try {
      const r = await fetch("/api/ai/refine-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          idea,
          format,
          message: userMessage,
          history: nextChat
        })
      });

      const x = await r.json();

      if (!r.ok) {
        setChat((old) => [...old, { role: "assistant", text: x.error || "Não consegui ajustar agora." }]);
        return;
      }

      setResult(x.result);
      setSelected({
        title: x.result.title,
        format: x.result.format,
        objective: x.result.objective,
        angle: x.result.angle,
        hook: x.result.hook,
        whyItFits: x.result.whyItFits
      });
      setChat((old) => [...old, { role: "assistant", text: x.result.assistantReply }]);
    } catch {
      setChat((old) => [...old, { role: "assistant", text: "Não consegui conectar à IA agora." }]);
    } finally {
      setBusy(false);
    }
  }

  function startIdea(idea: ContentIdea) {
    setSelected(idea);
    setResult(null);
    setChat([]);
    setFormat(idea.format || "Reels");
  }

  function startOwnIdea() {
    const text = ownIdea.trim();
    if (!text) return;

    const idea: ContentIdea = {
      title: text,
      format,
      objective: "Definir com a IA",
      angle: text,
      hook: text,
      whyItFits: "Ideia criada pelo próprio cliente."
    };

    setOwnIdea("");
    startIdea(idea);
    void sendToAI("refine", idea);
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="feature">
        <h3>💡 Banco de ideias</h3>
        <p className="muted">
          Você não precisa aceitar a primeira sugestão. Escolha uma ideia,
          converse com a IA, peça mudanças ou comece com uma ideia sua.
        </p>

        <div
          className="card"
          style={{ marginTop: 14, border: "1px solid rgba(255,255,255,.12)" }}
        >
          <strong>💭 Você também pode trazer a ideia</strong>
          <textarea
            value={ownIdea}
            onChange={(e) => setOwnIdea(e.target.value)}
            placeholder="Ex.: quero fazer um vídeo mostrando como escolher um bom serviço de seguidores..."
            rows={3}
            style={{ width: "100%", marginTop: 10 }}
          />
          <button
            className="btn primary"
            onClick={startOwnIdea}
            disabled={!ownIdea.trim() || busy}
            style={{ marginTop: 10 }}
          >
            Desenvolver minha ideia →
          </button>
        </div>

        {items.length ? (
          items.map((x, i) => (
            <div className="card" key={i} style={{ marginTop: 10 }}>
              <small>{x.format} · {x.objective}</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 18,
                  marginTop: 5
                }}
              >
                {x.title}
              </strong>
              <p style={{ marginTop: 8 }}>
                <strong>Ângulo:</strong> {x.angle}
              </p>
              <p style={{ marginTop: 6 }}>
                <strong>Gancho:</strong> {x.hook}
              </p>
              <p className="small muted" style={{ marginTop: 6 }}>
                Por que faz sentido: {x.whyItFits}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button className="btn primary" onClick={() => startIdea(x)}>
                  Usar esta ideia
                </button>
                <button className="btn secondary" onClick={() => { startIdea(x); setMessage("Quero melhorar esta ideia, mas manter a essência."); }}>
                  Melhorar
                </button>
              </div>
            </div>
          ))
        ) : (
          <p style={{ marginTop: 12 }}>Nenhuma ideia foi gerada ainda.</p>
        )}
      </div>

      {selected && (
        <div className="feature" style={{ marginTop: 20 }}>
          <div className="badge">🤝 Copiloto de conteúdo</div>
          <h3 style={{ marginTop: 12 }}>{selected.title}</h3>
          <p className="muted">
            A ideia é sua. A IA trabalha com você até ficar do jeito que você quer.
          </p>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            {["Reels", "Carrossel", "Stories", "Post"].map((x) => (
              <button
                key={x}
                className={format === x ? "btn primary" : "btn secondary"}
                onClick={() => setFormat(x)}
              >
                {x}
              </button>
            ))}
          </div>

          {chat.length > 0 && (
            <div style={{ marginTop: 16 }}>
              {chat.map((m, i) => (
                <div
                  key={i}
                  className="card"
                  style={{
                    marginTop: 8,
                    background: m.role === "user" ? "rgba(255,255,255,.06)" : "rgba(255,0,140,.06)"
                  }}
                >
                  <strong>{m.role === "user" ? "Você" : "MidiaNet AI"}</strong>
                  <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{m.text}</p>
                </div>
              ))}
            </div>
          )}

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Diga o que você quer mudar: mais curto, mais profissional, sem aparecer, CTA para WhatsApp, mais polêmico..."
            rows={4}
            style={{ width: "100%", marginTop: 14 }}
          />

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            <button
              className="btn secondary"
              disabled={busy || !message.trim()}
              onClick={() => void sendToAI("refine")}
            >
              {busy ? "Ajustando..." : "💬 Melhorar com a IA"}
            </button>

            <button
              className="btn primary"
              disabled={busy}
              onClick={() => void sendToAI("generate")}
            >
              {busy ? "Criando..." : "✅ Aprovar ideia e criar conteúdo"}
            </button>
          </div>

          {result && (
            <div className="card" style={{ marginTop: 18 }}>
              <div className="badge">Conteúdo criado</div>
              <h3 style={{ marginTop: 12 }}>{result.title}</h3>
              <p style={{ marginTop: 8 }}>
                <strong>🎯 Objetivo:</strong> {result.objective}
              </p>
              <p style={{ marginTop: 8 }}>
                <strong>🪝 Gancho:</strong> {result.hook}
              </p>

              <div style={{ marginTop: 14 }}>
                <strong>📝 Roteiro</strong>
                <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{result.script}</p>
              </div>

              <div style={{ marginTop: 14 }}>
                <strong>✍️ Legenda</strong>
                <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{result.caption}</p>
              </div>

              <div style={{ marginTop: 14 }}>
                <strong>🎥 Direção visual</strong>
                <p style={{ marginTop: 6 }}>{result.visualDirection}</p>
              </div>

              <div style={{ marginTop: 14 }}>
                <strong>📣 CTA</strong>
                <p style={{ marginTop: 6 }}>{result.cta}</p>
              </div>

              {Array.isArray(result.carouselSlides) && result.carouselSlides.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <strong>🎨 Estrutura do carrossel</strong>
                  {result.carouselSlides.map((slide: any) => (
                    <div className="card" key={slide.slide} style={{ marginTop: 8 }}>
                      <strong>Slide {slide.slide}: {slide.headline}</strong>
                      <p style={{ marginTop: 5 }}>{slide.body}</p>
                      <p className="small muted" style={{ marginTop: 5 }}>Visual: {slide.visual}</p>
                    </div>
                  ))}
                </div>
              )}

              <p className="small muted" style={{ marginTop: 14 }}>
                Você pode continuar conversando e pedir novas alterações. As preferências dessa conversa são registradas no seu histórico de conteúdo para orientar futuras gerações.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Scripts({ plan }: { plan: PlanItem[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div className="feature">
        <h3>🎬 Roteiros prontos para executar</h3>
        <p className="muted">
          Cada roteiro foi criado a partir do seu negócio, público e objetivo.
        </p>

        {plan.length ? (
          plan.map((x, i) => (
            <div className="card" key={i} style={{ marginTop: 12 }}>
              <small>{x.day} · {x.format}</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 19,
                  marginTop: 5
                }}
              >
                {x.idea}
              </strong>

              <p style={{ marginTop: 10 }}>
                <strong>🎯 Objetivo:</strong> {x.objective || "Conteúdo estratégico"}
              </p>

              <div
                style={{
                  marginTop: 12,
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(255,255,255,.03)"
                }}
              >
                <strong>🪝 Gancho</strong>
                <p style={{ marginTop: 6 }}>{x.hook}</p>
              </div>

              <div
                style={{
                  marginTop: 10,
                  padding: 14,
                  borderRadius: 10,
                  background: "rgba(255,255,255,.03)"
                }}
              >
                <strong>📝 Roteiro</strong>
                <p
                  style={{
                    marginTop: 6,
                    whiteSpace: "pre-line"
                  }}
                >
                  {x.script}
                </p>
              </div>

              <p style={{ marginTop: 10 }}>
                <strong>🎥 O que mostrar:</strong> {x.visualDirection || "Use cenas, imagens, gravação de tela ou demonstração diretamente relacionadas ao tema."}
              </p>

              <p style={{ marginTop: 10 }}>
                <strong>📣 CTA:</strong> {x.cta || "Peça uma ação específica ao público, de acordo com o objetivo do conteúdo."}
              </p>

              {x.executionSteps?.length ? (
                <div style={{ marginTop: 10 }}>
                  <strong>Passo a passo</strong>
                  <ol>
                    {x.executionSteps.map((step, j) => (
                      <li key={j}>{step}</li>
                    ))}
                  </ol>
                </div>
              ) : null}
            </div>
          ))
        ) : (
          <p style={{ marginTop: 12 }}>
            Nenhum roteiro foi gerado ainda.
          </p>
        )}
      </div>
    </div>
  );
}

function Captions({ plan }: { plan: PlanItem[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div className="feature">
        <h3>✍️ Legendas prontas</h3>
        {plan.length ? (
          plan.map((x, i) => (
            <div className="card" key={i} style={{ marginTop: 12 }}>
              <small>{x.day} · {x.format}</small>
              <strong
                style={{
                  display: "block",
                  fontSize: 18,
                  marginTop: 5
                }}
              >
                {x.idea}
              </strong>
              <p
                style={{
                  marginTop: 10,
                  whiteSpace: "pre-line"
                }}
              >
                {x.caption}
              </p>
              <p style={{ marginTop: 10 }}>
                <strong>CTA:</strong> {x.cta}
              </p>
            </div>
          ))
        ) : (
          <p>Nenhuma legenda foi gerada ainda.</p>
        )}
      </div>
    </div>
  );
}

function Planner({ plan }: { plan: PlanItem[] }) {
  return (
    <div style={{ marginTop: 20 }}>
      <div className="feature">
        <h3>📅 Plano semanal</h3>

        {plan.length ? (
          plan.map((x, i) => (
            <div key={i} className="card" style={{ marginTop: 10 }}>
              <strong>{x.day} · {x.format}</strong>
              <p style={{ marginTop: 6 }}>{x.idea}</p>
              <p className="small muted" style={{ marginTop: 6 }}>
                Objetivo: {x.objective}
              </p>
              <p className="small" style={{ marginTop: 6 }}>
                Gancho: {x.hook}
              </p>
            </div>
          ))
        ) : (
          <p>Nenhum plano ainda.</p>
        )}
      </div>
    </div>
  );
}
