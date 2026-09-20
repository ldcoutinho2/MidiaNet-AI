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
  const fallback = plan.map((x) => ({
    title: x.idea,
    format: x.format,
    objective: x.objective,
    angle: x.idea,
    hook: x.hook,
    whyItFits: "Parte do plano semanal personalizado."
  }));

  const items = ideas.length ? ideas : fallback;

  return (
    <div style={{ marginTop: 20 }}>
      <div className="feature">
        <h3>💡 Banco de ideias acionáveis</h3>
        <p className="muted">
          Não são apenas temas: cada ideia já vem com ângulo, objetivo e
          gancho para você saber exatamente o que publicar.
        </p>

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
            </div>
          ))
        ) : (
          <p style={{ marginTop: 12 }}>
            Nenhuma ideia foi gerada ainda.
          </p>
        )}
      </div>
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
