"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

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
  weeklyPlan: { day: string; format: string; idea: string; hook: string; cta: string }[];
  summary: string;
};

type Me = {
  user: {
    name: string | null;
    email: string;
    strategicProfile: {
      profileDescription: string;
      desiredOutcome: string;
      aiProfile?: AIProfile | null;
      aiAnalyzedAt?: string | null;
    } | null;
    socialAccounts: { id: string; platform: string; username: string | null }[];
  };
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiError, setAiError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async response => {
        if (!response.ok) {
          router.replace("/login");
          return null;
        }
        return response.json();
      })
      .then(result => result && setData(result))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  async function analyzeWithAI() {
    setAnalyzing(true);
    setAiError("");
    try {
      const response = await fetch("/api/ai/analyze-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (!response.ok) {
        setAiError(result.error || "Não foi possível analisar o perfil.");
        return;
      }
      setData(current => current ? {
        ...current,
        user: {
          ...current.user,
          strategicProfile: current.user.strategicProfile
            ? { ...current.user.strategicProfile, aiProfile: result.aiProfile, aiAnalyzedAt: result.aiAnalyzedAt }
            : current.user.strategicProfile,
        },
      } : current);
    } catch {
      setAiError("Não foi possível conectar à IA.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) return <main className="auth"><div className="authbox"><p className="muted">Carregando seu painel...</p></div></main>;
  if (!data) return null;

  const profile = data.user.strategicProfile;
  const instagram = data.user.socialAccounts[0];
  const ai = profile?.aiProfile;

  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <button
          className="muted"
          onClick={logout}
          style={{ background: "none", border: 0, cursor: "pointer" }}
        >
          Sair
        </button>
      </nav>

      <section className="section" style={{ paddingTop: 40 }}>
        <div className="badge">Visão geral</div>
        <h1 style={{ fontSize: 44, letterSpacing: -2, margin: "18px 0 8px" }}>
          Olá, {data.user.name || "criador"}.
        </h1>
        <p className="muted">
          Seu espaço para transformar dados e objetivo em decisões de conteúdo.
        </p>

        <div className="grid3" style={{ marginTop: 28 }}>
          <div className="card">
            <small>Instagram</small>
            <strong>{instagram ? "Conectado" : "Ainda não conectado"}</strong>
            <span className="small muted">
              {instagram?.username ? "@" + instagram.username : "Vamos integrar depois"}
            </span>
          </div>

          <div className="card">
            <small>Objetivo declarado</small>
            <strong style={{ fontSize: 20 }}>
              {profile?.desiredOutcome || "Ainda não informado"}
            </strong>
          </div>

          <div className="card">
            <small>Status da IA</small>
            <strong style={{ fontSize: 20 }}>
              {ai ? "Analisado" : "Pronto para analisar"}
            </strong>
            <span className="small muted">
              {profile?.aiAnalyzedAt
                ? new Date(profile.aiAnalyzedAt).toLocaleString("pt-BR")
                : "Use os dados que você informou"}
            </span>
          </div>
        </div>

        <div className="feature" style={{ marginTop: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 20,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3>🧠 Análise estratégica com IA</h3>
              <p>
                O MidiaNet AI transforma o que você contou sobre o perfil e seu objetivo
                em um DNA estratégico. Depois usaremos esse DNA para criar conteúdos
                personalizados.
              </p>
            </div>

            <button
              className="btn primary"
              onClick={analyzeWithAI}
              disabled={analyzing}
            >
              {analyzing ? "Analisando..." : ai ? "Refazer análise" : "Analisar meu perfil"}
            </button>
          </div>

          {aiError && (
            <p
              className="small"
              style={{ color: "#fda4af", marginTop: 14 }}
            >
              {aiError}
            </p>
          )}
        </div>

        {ai ? (
          <div style={{ marginTop: 20 }}>
            <div className="grid3">
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
                <p className="small muted">CTA: {ai.ctaStrategy}</p>
              </div>
            </div>

            <div className="feature" style={{ marginTop: 20 }}>
              <h3>🔎 Leitura da IA</h3>
              <p>{ai.summary}</p>

              <div className="grid3" style={{ marginTop: 18 }}>
                <div>
                  <strong>Forças</strong>
                  <ul>
                    {ai.strengths.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>

                <div>
                  <strong>Oportunidades</strong>
                  <ul>
                    {ai.opportunities.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>

                <div>
                  <strong>Dores do público</strong>
                  <ul>
                    {ai.painPoints.map((x, i) => <li key={i}>{x}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="feature" style={{ marginTop: 20 }}>
              <h3>📚 Pilares de conteúdo</h3>
              <div className="grid3">
                {ai.contentPillars.map((x, i) => (
                  <div className="card" key={i}>
                    <strong>{x}</strong>
                  </div>
                ))}
              </div>
              <p className="small muted" style={{ marginTop: 16 }}>
                Formatos: {ai.contentFormats.join(" · ")}
                <br />
                Tom: {ai.tone.join(" · ")}
              </p>
            </div>

            <div className="feature" style={{ marginTop: 20 }}>
              <h3>📅 Primeira semana sugerida</h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left", padding: 10 }}>Dia</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Formato</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Ideia</th>
                      <th style={{ textAlign: "left", padding: 10 }}>Hook</th>
                      <th style={{ textAlign: "left", padding: 10 }}>CTA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ai.weeklyPlan.map((item, i) => (
                      <tr key={i}>
                        <td style={{ padding: 10 }}>{item.day}</td>
                        <td style={{ padding: 10 }}>{item.format}</td>
                        <td style={{ padding: 10 }}>{item.idea}</td>
                        <td style={{ padding: 10 }}>{item.hook}</td>
                        <td style={{ padding: 10 }}>{item.cta}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid3" style={{ marginTop: 20 }}>
            <div className="feature">
              <h3>🎯 Sua intenção</h3>
              <p>{profile?.desiredOutcome || "Conte o que você deseja alcançar."}</p>
            </div>

            <div className="feature">
              <h3>🧬 DNA do Perfil</h3>
              <p>A IA ainda não analisou seu perfil.</p>
            </div>

            <div className="feature">
              <h3>🚀 Próximo passo</h3>
              <p>
                Clique em “Analisar meu perfil”. O Instagram será integrado depois.
              </p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
