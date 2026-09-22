"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

export default function AdminUserPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params?.id) return;
    fetch("/api/admin/users/" + encodeURIComponent(params.id))
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (r.status === 403) throw new Error("Acesso restrito ao administrador.");
        if (!r.ok) throw new Error(body?.error || "Não foi possível carregar o cliente.");
        return body;
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [params?.id]);

  if (loading) return <main className="auth"><div className="authbox"><p className="muted">Carregando cliente...</p></div></main>;
  if (error || !data) return <main className="auth"><div className="authbox"><div className="badge">🔐 ADM</div><h1>Acesso restrito</h1><p className="muted">{error || "Sem dados."}</p><button className="btn secondary" onClick={() => router.push("/admin")} style={{marginTop:16}}>Voltar ao ADM</button></div></main>;

  const u = data.user;
  const sub = data.subscription;
  const ig = data.socialAccounts?.[0];
  const paid = (data.payments || []).filter((p:any) => p.status === "PAID").reduce((sum:number,p:any) => sum + p.amountCents / 100, 0);
  const lastMetric = ig?.metricSnapshots?.[0];

  async function activate(plan:"weekly"|"monthly") {
    const response = await fetch("/api/admin/users/" + encodeURIComponent(u.id) + "/activate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error || "Não foi possível ativar o plano.");
      return;
    }
    setData((current:any) => ({
      ...current,
      subscription: {
        ...(current.subscription || {}),
        status: "ACTIVE",
        plan: plan.toUpperCase(),
        currentPeriodEnd: body.currentPeriodEnd,
      },
    }));
  }

  return <main className="page adminPage">
    <nav className="nav">
      <div className="logo">MidiaNet<span>AI</span> <small style={{color:"#a1a1aa",fontSize:12}}>ADMIN</small></div>
      <button className="btn secondary" onClick={() => router.push("/admin")}>← Voltar ao ADM</button>
    </nav>
    <section className="section">
      <div className="adminHero">
        <div>
          <div className="badge">👤 Cliente</div>
          <h1 style={{fontSize:38,letterSpacing:-1.5,margin:"14px 0 7px"}}>{u.name || "Sem nome"}</h1>
          <p className="muted">{u.email}{u.phone ? " · " + u.phone : ""}</p>
        </div>
        <span className="badge">{sub?.status === "ACTIVE" ? "Ativo" : sub?.status === "TRIALING" ? "Período de teste" : sub?.status || "Sem plano"}</span>
      </div>

      <section className="feature" style={{marginTop:18}}>
        <div className="badge">📲 Venda pelo WhatsApp</div>
        <h2 style={{marginTop:10}}>Ativar acesso manualmente</h2>
        <p className="small muted" style={{marginTop:7}}>Use depois de confirmar o pagamento recebido pelo WhatsApp. O cliente não precisa passar pelo checkout online.</p>
        <div className="row" style={{gap:10,marginTop:14,flexWrap:"wrap"}}>
          <button className="btn primary" onClick={()=>activate("weekly")}>Ativar 7 dias · R$ 14,99</button>
          <button className="btn primary" onClick={()=>activate("monthly")}>Ativar 30 dias · R$ 29,99</button>
        </div>
      </section>

      <div className="adminStats">
        <AdminStat icon="💳" label="Plano" value={sub?.plan || "—"} />
        <AdminStat icon="📸" label="Instagram" value={ig?.username ? "@" + ig.username : "Não conectado"} />
        <AdminStat icon="📝" label="Rascunhos" value={data.contentDrafts?.length || 0} />
        <AdminStat icon="💰" label="Pagamentos pagos" value={"R$ " + paid.toLocaleString("pt-BR",{minimumFractionDigits:2})} />
        <AdminStat icon="👥" label="Seguidores capturados" value={lastMetric?.followers ?? "—"} />
        <AdminStat icon="📈" label="Alcance capturado" value={lastMetric?.reach ?? "—"} />
      </div>

      <div className="adminGrid">
        <section className="feature">
          <div className="badge">📋 Cadastro</div>
          <h2 style={{marginTop:10}}>Dados da conta</h2>
          <p className="small muted" style={{marginTop:14}}>Cadastro: {new Date(u.createdAt).toLocaleString("pt-BR")}</p>
          <p className="small muted">Atualização: {new Date(u.updatedAt).toLocaleString("pt-BR")}</p>
          <p className="small muted">Trial termina: {sub?.trialEndsAt ? new Date(sub.trialEndsAt).toLocaleString("pt-BR") : "—"}</p>
          <p className="small muted">Instagram conectado em: {ig?.connectedAt ? new Date(ig.connectedAt).toLocaleString("pt-BR") : "—"}</p>
        </section>

        <section className="feature">
          <div className="badge">🎯 Perfil estratégico</div>
          <h2 style={{marginTop:10}}>Contexto do cliente</h2>
          {data.strategicProfile ? <div style={{marginTop:14}}>
            <p className="small muted">Nicho: <strong>{data.strategicProfile.niche || "—"}</strong></p>
            <p className="small muted">Objetivo: <strong>{data.strategicProfile.objective || "—"}</strong></p>
            <p className="small muted">Oferta: <strong>{data.strategicProfile.offer || "—"}</strong></p>
            <p className="small muted">Público: <strong>{data.strategicProfile.audience || "—"}</strong></p>
          </div> : <p className="muted" style={{marginTop:14}}>Onboarding ainda não preenchido.</p>}
        </section>
      </div>

      <section className="feature" style={{marginTop:18}}>
        <div className="badge">📸 Instagram</div>
        <h2 style={{marginTop:10}}>Conta conectada</h2>
        {ig ? <div className="adminRow" style={{marginTop:16}}>
          <div className="adminAvatar">IG</div>
          <div style={{flex:1}}>
            <strong>@{ig.username || "perfil"}</strong>
            <p className="small muted">ID: {ig.platformUserId}</p>
            <p className="small muted">Última atualização: {new Date(ig.updatedAt).toLocaleString("pt-BR")}</p>
          </div>
          <span className="badge">Conectado</span>
        </div> : <p className="muted" style={{marginTop:14}}>Nenhuma conta Instagram conectada.</p>}
      </section>

      <section className="feature" style={{marginTop:18}}>
        <div className="badge">📝 Conteúdo</div>
        <h2 style={{marginTop:10}}>Últimos conteúdos</h2>
        <div className="adminList">
          {data.contentDrafts?.length ? data.contentDrafts.map((c:any) => <div className="adminRow" key={c.id}>
            <div style={{flex:1}}><strong>{c.title}</strong><p className="small muted">{c.format} · {c.status}</p></div>
            <div className="small muted">{c.scheduledAt ? new Date(c.scheduledAt).toLocaleString("pt-BR") : "Sem agendamento"}</div>
          </div>) : <p className="muted">Nenhum conteúdo registrado.</p>}
        </div>
      </section>

      <section className="feature" style={{marginTop:18}}>
        <div className="badge">💳 Pagamentos</div>
        <h2 style={{marginTop:10}}>Histórico recente</h2>
        <div className="adminList">
          {data.payments?.length ? data.payments.map((p:any) => <div className="adminRow" key={p.id}>
            <div style={{flex:1}}><strong>R$ {(p.amountCents/100).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong><p className="small muted">{p.status} · {p.provider || "manual"}</p></div>
            <div className="small muted">{new Date(p.createdAt).toLocaleString("pt-BR")}</div>
          </div>) : <p className="muted">Nenhum pagamento registrado.</p>}
        </div>
      </section>
    </section>
  </main>;
}

function AdminStat({icon,label,value}:{icon:string;label:string;value:string|number}) {
  return <div className="adminStat"><span>{icon}</span><small>{label}</small><strong>{typeof value === "number" ? value.toLocaleString("pt-BR") : value}</strong></div>;
}
