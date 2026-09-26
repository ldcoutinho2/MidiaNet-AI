"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

const LABELS: Record<string,string> = {
  page_view: "Visitas",
  signup_started: "Cadastro iniciado",
  signup_completed: "Cadastro concluído",
  trial_started: "Teste iniciado",
  diagnostic_started: "Diagnóstico iniciado",
  diagnostic_completed: "Diagnóstico concluído",
  checkout_viewed: "Checkout visto",
  checkout_started: "Checkout iniciado",
  pix_created: "Pix criado",
  payment_approved: "Pagamento aprovado",
};

export default function AdminFunnelPage() {
  const router = useRouter();
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch("/api/admin/funnel?days=" + days, { cache: "no-store" });
      const x = await r.json();
      if (!r.ok) {
        if (r.status === 403) router.replace("/dashboard");
        throw new Error(x.error || "Não foi possível carregar o funil.");
      }
      setData(x);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [days]);

  const rows = data?.funnel || [];
  const rates = useMemo(() => rows.map((row:any, i:number) => ({
    ...row,
    nextRate: i === 0 || !rows[i - 1]?.count ? null : Math.round((row.count / rows[i - 1].count) * 100),
  })), [rows]);

  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <button className="btn secondary" onClick={() => router.push("/dashboard")}>Voltar</button>
      </nav>
      <section className="section" style={{maxWidth:1000,margin:"0 auto"}}>
        <div className="row-between">
          <div>
            <div className="badge">ADMIN · FUNIL</div>
            <h1 style={{marginTop:10}}>Onde os clientes estão parando?</h1>
            <p className="muted" style={{marginTop:7}}>Eventos registrados pelo próprio MidiaNet AI. Não representa automaticamente os dados do Meta Ads.</p>
          </div>
          <select value={days} onChange={e=>setDays(Number(e.target.value))} style={{width:130}}>
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
            <option value={90}>90 dias</option>
          </select>
        </div>

        {loading && <div className="feature" style={{marginTop:18}}>Carregando métricas...</div>}
        {error && <div className="feature" style={{marginTop:18,color:"#fda4af"}}>{error}</div>}

        {!loading && !error && <div className="feature" style={{marginTop:18}}>
          <div style={{display:"grid",gap:10}}>
            {rates.map((row:any, i:number) => (
              <div key={row.name} className="card">
                <div className="row-between">
                  <div>
                    <strong>{i+1}. {LABELS[row.name] || row.name}</strong>
                    <div className="small muted" style={{marginTop:4}}>{row.uniqueUsers} usuários únicos</div>
                  </div>
                  <strong style={{fontSize:22}}>{row.count}</strong>
                </div>
                {row.nextRate !== null && <div className="small muted" style={{marginTop:6}}>Conversão sobre a etapa anterior: {row.nextRate}%</div>}
              </div>
            ))}
          </div>
          <p className="small muted" style={{marginTop:14}}>A taxa é calculada entre eventos, enquanto “usuários únicos” usa os usuários autenticados quando disponíveis.</p>
        </div>}
      </section>
    </main>
  );
}
