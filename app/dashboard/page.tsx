"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Slot = {
  time: string;
  format: string;
  role: string;
  objective: string;
  title: string;
  topic: string;
  hook: string;
  script: string;
  caption: string;
  visualDirection: string;
  cta: string;
  executionSteps: string[];
};

type DayPlan = {
  day: string;
  mission: string;
  slots: Slot[];
};

type AIProfile = {
  objective: string;
  currentStage: string;
  diagnosis: string;
  mainProblem: string;
  strategy: string;
  weeklyMission: string;
  nextAction: string;
  postingFrequency: string;
  postingFrequencyReason: string;
  positioning: string;
  audience: string;
  conversionStrategy: string;
  contentPillars: string[];
  tone: string[];
  strengths: string[];
  opportunities: string[];
  thirtyDayPlan: {
    phase: string;
    focus: string;
    action: string;
    expectedSignal: string;
  }[];
  weeklyPlan: DayPlan[];
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
  };
};

const tabs = [
  ["home", "🏠 Meu Instagram"],
  ["strategy", "🎯 Estratégia"],
  ["week", "📅 Minha semana"],
  ["results", "📊 Resultados"],
  ["profile", "👤 Meu perfil"]
] as const;

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
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
        setError(x.error || "Não foi possível montar sua estratégia.");
        return;
      }
      setData((d) => {
        if (!d?.user.strategicProfile) return d;
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
      setTab("home");
    } catch {
      setError("Não foi possível conectar à IA.");
    } finally {
      setAnalyzing(false);
    }
  }

  if (loading) {
    return (
      <main className="auth">
        <div className="authbox"><p className="muted">Carregando seu painel...</p></div>
      </main>
    );
  }

  if (!data) return null;

  const p = data.user.strategicProfile!;
  const ai = p.aiProfile;

  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <button className="muted" onClick={logout} style={{ background: "none", border: 0, cursor: "pointer" }}>Sair</button>
      </nav>

      <section className="section" style={{ paddingTop: 28 }}>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
          {tabs.map(([id, label]) => (
            <button key={id} className={tab === id ? "btn primary" : "btn secondary"} onClick={() => setTab(id)} style={{ whiteSpace: "nowrap" }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginTop: 24 }}>
          <div className="badge">Seu estrategista</div>
          <h1 style={{ fontSize: 40, letterSpacing: -2, margin: "14px 0 8px" }}>
            Olá, {data.user.name || "criador"}.
          </h1>
          <p className="muted">Você não precisa descobrir o que postar. O MidiaNet AI organiza o próximo passo.</p>
        </div>

        {error && <p className="small" style={{ color: "#fda4af", marginTop: 14 }}>{error}</p>}

        {!ai ? (
          <SetupStrategy analyzing={analyzing} analyze={analyze} />
        ) : (
          <>
            {tab === "home" && <Home ai={ai} onWeek={() => setTab("week")} />}
            {tab === "strategy" && <Strategy ai={ai} />}
            {tab === "week" && <Week ai={ai} />}
            {tab === "results" && <Results />}
            {tab === "profile" && <ProfileView profile={p} router={router} />}
          </>
        )}
      </section>
    </main>
  );
}

function SetupStrategy({ analyzing, analyze }: { analyzing: boolean; analyze: () => void }) {
  return (
    <div className="feature" style={{ marginTop: 24 }}>
      <div className="badge">1º passo</div>
      <h2 style={{ marginTop: 12 }}>Vamos transformar seu perfil em um plano.</h2>
      <p className="muted" style={{ marginTop: 8, maxWidth: 760 }}>
        A IA vai analisar suas respostas e montar seu objetivo, diagnóstico, estratégia de 30 dias, programação da semana e o que você deve executar agora.
      </p>
      <button className="btn primary" onClick={analyze} disabled={analyzing} style={{ marginTop: 18 }}>
        {analyzing ? "Analisando seu perfil..." : "Montar minha estratégia →"}
      </button>
    </div>
  );
}

function Home({ ai, onWeek }: { ai: AIProfile; onWeek: () => void }) {
  const today = useMemo(() => ai.weeklyPlan?.[0], [ai.weeklyPlan]);
  return (
    <>
      <div className="grid3" style={{ marginTop: 22 }}>
        <Info title="🎯 Meu objetivo" value={ai.objective} />
        <Info title="📍 Onde estou" value={ai.currentStage} />
        <Info title="🚧 Principal problema" value={ai.mainProblem} />
      </div>

      <div className="feature" style={{ marginTop: 18 }}>
        <div className="badge">🧭 Direção</div>
        <h2 style={{ marginTop: 12 }}>O que vamos fazer</h2>
        <p style={{ marginTop: 8 }}>{ai.strategy}</p>
        <div className="grid3" style={{ marginTop: 18 }}>
          <Info title="📅 Frequência" value={ai.postingFrequency} />
          <Info title="🔥 Missão da semana" value={ai.weeklyMission} />
          <Info title="👉 Próximo passo" value={ai.nextAction} />
        </div>
      </div>

      {today && (
        <div className="feature" style={{ marginTop: 18 }}>
          <div className="badge">🚀 Comece por aqui</div>
          <h2 style={{ marginTop: 12 }}>{today.day}</h2>
          <p className="muted" style={{ marginTop: 6 }}>{today.mission}</p>
          {today.slots.map((slot, i) => <ContentCard key={i} slot={slot} compact />)}
          <button className="btn primary" onClick={onWeek} style={{ marginTop: 12 }}>Ver minha semana completa →</button>
        </div>
      )}
    </>
  );
}

function Strategy({ ai }: { ai: AIProfile }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="feature">
        <div className="badge">🎯 Diagnóstico</div>
        <h2 style={{ marginTop: 12 }}>O perfil hoje</h2>
        <p style={{ marginTop: 8 }}>{ai.diagnosis}</p>
        <p style={{ marginTop: 14 }}><strong>Posicionamento:</strong> {ai.positioning}</p>
        <p style={{ marginTop: 10 }}><strong>Público:</strong> {ai.audience}</p>
        <p style={{ marginTop: 10 }}><strong>Conversão:</strong> {ai.conversionStrategy}</p>
      </div>

      <div className="feature" style={{ marginTop: 18 }}>
        <h2>🗓️ Plano de 30 dias</h2>
        <div className="grid3" style={{ marginTop: 14 }}>
          {ai.thirtyDayPlan.map((x, i) => (
            <div className="card" key={i}>
              <small>{x.phase}</small>
              <strong style={{ display: "block", marginTop: 6 }}>{x.focus}</strong>
              <p style={{ marginTop: 8 }}>{x.action}</p>
              <p className="small muted" style={{ marginTop: 8 }}>Sinal esperado: {x.expectedSignal}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="feature" style={{ marginTop: 18 }}>
        <h2>🧩 Como a estratégia foi montada</h2>
        <p style={{ marginTop: 8 }}><strong>Pilares:</strong> {ai.contentPillars.join(" · ")}</p>
        <p style={{ marginTop: 8 }}><strong>Tom:</strong> {ai.tone.join(" · ")}</p>
        <p style={{ marginTop: 8 }}><strong>Por que esta frequência:</strong> {ai.postingFrequencyReason}</p>
      </div>
    </div>
  );
}

function Week({ ai }: { ai: AIProfile }) {
  const [open, setOpen] = useState(0);
  return (
    <div style={{ marginTop: 22 }}>
      <div className="feature">
        <div className="badge">📅 Execução</div>
        <h2 style={{ marginTop: 12 }}>Minha semana</h2>
        <p className="muted" style={{ marginTop: 6 }}>{ai.weeklyMission}</p>

        {ai.weeklyPlan.map((day, i) => (
          <div className="card" key={i} style={{ marginTop: 12 }}>
            <button
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{ width: "100%", background: "none", border: 0, color: "inherit", textAlign: "left", cursor: "pointer", padding: 0 }}
            >
              <strong style={{ fontSize: 18 }}>{day.day}</strong>
              <span className="small muted" style={{ float: "right" }}>{day.slots.length} conteúdo{day.slots.length === 1 ? "" : "s"}</span>
              <p className="small muted" style={{ marginTop: 6 }}>{day.mission}</p>
            </button>
            {open === i && (
              <div style={{ marginTop: 10 }}>
                {day.slots.map((slot, j) => <ContentCard key={j} slot={slot} />)}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ContentCard({ slot, compact = false }: { slot: Slot; compact?: boolean }) {
  const [expanded, setExpanded] = useState(!compact);
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
        <strong>{slot.time} · {slot.format}</strong>
        <span className="small muted">{slot.role}</span>
      </div>
      <h3 style={{ marginTop: 8 }}>{slot.title}</h3>
      <p className="small muted" style={{ marginTop: 5 }}>{slot.objective}</p>
      <p style={{ marginTop: 8 }}><strong>🪝 Gancho:</strong> {slot.hook}</p>

      <button className="btn secondary" onClick={() => setExpanded(!expanded)} style={{ marginTop: 10 }}>
        {expanded ? "Ocultar detalhes" : "Ver conteúdo completo →"}
      </button>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <Detail title="📌 Tema" text={slot.topic} />
          <Detail title="🎬 Roteiro" text={slot.script} />
          <Detail title="✍️ Legenda" text={slot.caption} />
          <Detail title="🎥 Como produzir" text={slot.visualDirection} />
          <Detail title="📣 CTA" text={slot.cta} />
          {slot.executionSteps?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <strong>Checklist</strong>
              <ol style={{ marginTop: 6 }}>
                {slot.executionSteps.map((x, i) => <li key={i}>{x}</li>)}
              </ol>
            </div>
          )}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
            <button className="btn primary">✏️ Editar com a IA</button>
            <button className="btn secondary">📅 Planejar publicação</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Detail({ title, text }: { title: string; text: string }) {
  return (
    <div style={{ marginTop: 10, padding: 12, borderRadius: 10, background: "rgba(255,255,255,.035)" }}>
      <strong>{title}</strong>
      <p style={{ marginTop: 6, whiteSpace: "pre-line" }}>{text}</p>
    </div>
  );
}

function Results() {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="feature">
        <div className="badge">📊 Métricas</div>
        <h2 style={{ marginTop: 12 }}>Vamos medir para ajustar.</h2>
        <p style={{ marginTop: 8 }}>
          Esta tela está preparada para receber seguidores, alcance, visualizações, visitas ao perfil, curtidas, comentários, compartilhamentos e salvamentos.
        </p>
        <div className="grid3" style={{ marginTop: 16 }}>
          <Info title="Seguidores" value="Aguardando conexão do Instagram" />
          <Info title="Visitas ao perfil" value="Aguardando dados" />
          <Info title="Visualizações" value="Aguardando dados" />
        </div>
        <p className="small muted" style={{ marginTop: 14 }}>
          Os números não serão inventados. Quando a conta estiver conectada à integração oficial, o MidiaNet AI poderá comparar os resultados e ajustar a próxima semana.
        </p>
      </div>
    </div>
  );
}

function ProfileView({ profile, router }: { profile: Profile; router: ReturnType<typeof useRouter> }) {
  return (
    <div style={{ marginTop: 22 }}>
      <div className="feature">
        <div className="badge">👤 Meu perfil</div>
        <h2 style={{ marginTop: 12 }}>{profile.niche || "Seu nicho"}</h2>
        <p style={{ marginTop: 8 }}><strong>Oferta:</strong> {profile.offer || "—"}</p>
        <p style={{ marginTop: 8 }}><strong>Objetivo:</strong> {profile.objective || profile.desiredOutcome || "—"}</p>
        <p style={{ marginTop: 8 }}><strong>Posicionamento desejado:</strong> {profile.desiredPositioning || "—"}</p>
        <button className="btn secondary" onClick={() => router.push("/setup")} style={{ marginTop: 16 }}>
          Editar meu diagnóstico
        </button>
      </div>
    </div>
  );
}

function Info({ title, value }: { title: string; value: string }) {
  return (
    <div className="feature">
      <small className="muted">{title}</small>
      <p style={{ marginTop: 8, fontSize: 17, lineHeight: 1.45 }}>{value || "—"}</p>
    </div>
  );
}
