"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminData = {
  stats: { users:number; trialing:number; active:number; connected:number; drafts:number; payments:number; revenue:number; events:number };
  recentUsers: any[];
  recentPayments: any[];
  marketing: { periodDays:number; pageViews:number; signupStarted:number; leads:number; instagramConnectStarted:number; instagramConnected:number; analysisStarted:number; analysisCompleted:number; strategiesCreated:number; checkoutStarted:number; paymentsApproved:number; subscriptionsStarted:number; sources:[string,number][] };
};

export default function AdminPage() {
  const router = useRouter();
  const [data, setData] = useState<AdminData|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/summary")
      .then(async r => {
        if (r.status === 403) { setError("Acesso restrito ao administrador."); return null; }
        if (!r.ok) { setError("Não foi possível carregar o painel."); return null; }
        return r.json();
      })
      .then(x => { if (x) setData(x); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <main className="auth"><div className="authbox"><p className="muted">Carregando painel administrativo...</p></div></main>;
  if (error || !data) return <main className="auth"><div className="authbox"><div className="badge">🔐 ADM</div><h1>Acesso restrito</h1><p className="muted">{error || "Sem dados."}</p><button className="btn secondary" onClick={()=>router.push("/dashboard")} style={{marginTop:16}}>Voltar ao dashboard</button></div></main>;

  const s = data.stats;
  return <main className="page adminPage">
    <nav className="nav"><div className="logo">MidiaNet<span>AI</span> <small style={{color:"#a1a1aa",fontSize:12}}>ADMIN</small></div><button className="btn secondary" onClick={()=>router.push("/dashboard")}>Dashboard do cliente</button></nav>
    <section className="section">
      <div className="adminHero">
        <div><div className="badge">⚙️ Central de administração</div><h1 style={{fontSize:42,letterSpacing:-2,margin:"14px 0 7px"}}>Visão geral</h1><p className="muted">Acompanhe usuários, assinaturas, conexões e atividade do MidiaNet AI.</p></div>
        <button className="btn primary" onClick={()=>location.reload()}>↻ Atualizar</button>
      </div>

      <div className="adminStats">
        <AdminStat icon="👥" label="Usuários" value={s.users}/>
        <AdminStat icon="🧪" label="Em teste" value={s.trialing}/>
        <AdminStat icon="💳" label="Planos ativos" value={s.active}/>
        <AdminStat icon="📸" label="Instagrams conectados" value={s.connected}/>
        <AdminStat icon="📝" label="Conteúdos criados" value={s.drafts}/>
        <AdminStat icon="💰" label="Receita registrada" value={"R$ "+s.revenue.toLocaleString("pt-BR",{minimumFractionDigits:2})}/>
      </div>

      <div className="adminGrid">
        <section className="feature"><div className="row-between"><div><div className="badge">👤 Clientes</div><h2 style={{marginTop:10}}>Últimos cadastros</h2></div><span className="small muted">{s.users} no total</span></div>
          <div className="adminList">{data.recentUsers.map(u=><button className="adminRow" key={u.id} onClick={()=>router.push("/admin/users/"+u.id)} style={{width:"100%",textAlign:"left",cursor:"pointer",color:"inherit"}}><div className="adminAvatar">{(u.name||u.email||"?").slice(0,1).toUpperCase()}</div><div style={{flex:1}}><strong>{u.name||"Sem nome"}</strong><p className="small muted">{u.email}{u.phone?" · "+u.phone:""}</p><p className="small muted">Cadastro: {new Date(u.createdAt).toLocaleString("pt-BR")}</p></div><div style={{textAlign:"right"}}><span className="badge">{u.subscription?.status==="ACTIVE"?"Ativo":u.subscription?.status==="TRIALING"?"Teste":"Sem plano"}</span><p className="small muted" style={{marginTop:6}}>{u.socialAccounts?.[0]?.username?("@"+u.socialAccounts[0].username):"Instagram não conectado"}</p></div></button>)}</div>
        </section>

        <section className="feature"><div className="row-between"><div><div className="badge">💳 Pagamentos</div><h2 style={{marginTop:10}}>Movimentações recentes</h2></div><span className="small muted">{s.payments} registros</span></div>
          <div className="adminList">{data.recentPayments.length?data.recentPayments.map(p=><div className="adminRow" key={p.id}><div style={{flex:1}}><strong>{p.user?.name||p.user?.email||"Cliente"}</strong><p className="small muted">{new Date(p.createdAt).toLocaleString("pt-BR")}</p></div><div style={{textAlign:"right"}}><strong>R$ {(p.amountCents/100).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong><p className="small muted">{p.status}</p></div></div>):<p className="muted">Nenhum pagamento registrado ainda.</p>}</div>
        </section>
      </div>

      <div className="feature" style={{marginTop:18}}>
        <div className="row-between"><div><div className="badge">📣 Marketing</div><h2 style={{marginTop:10}}>Funil de vendas</h2></div><span className="small muted">Últimos {data.marketing.periodDays} dias</span></div>
        <div className="adminStats" style={{marginTop:16}}>
          <AdminStat icon="👀" label="Visitas na landing" value={data.marketing.pageViews}/>
          <AdminStat icon="📝" label="Começaram cadastro" value={data.marketing.signupStarted}/>
          <AdminStat icon="🎯" label="Leads / contas" value={data.marketing.leads}/>
          <AdminStat icon="📸" label="Início conexão IG" value={data.marketing.instagramConnectStarted}/>
          <AdminStat icon="🧠" label="Análises iniciadas" value={data.marketing.analysisStarted}/>
          <AdminStat icon="💳" label="Pagamentos aprovados" value={data.marketing.paymentsApproved}/>
        </div>
        <div className="adminGrid" style={{marginTop:16}}>
          <div>
            <h3>Jornada</h3>
            <div className="funnel">
              <Funnel label="Visita → cadastro iniciado" value={data.marketing.signupStarted}/>
              <Funnel label="Cadastro concluído" value={data.marketing.leads}/>
              <Funnel label="Conexão Instagram iniciada" value={data.marketing.instagramConnectStarted}/>
              <Funnel label="Análise iniciada" value={data.marketing.analysisStarted}/>
              <Funnel label="Estratégia criada" value={data.marketing.strategiesCreated}/>
              <Funnel label="Pagamento aprovado" value={data.marketing.paymentsApproved}/>
            </div>
          </div>
          <div>
            <h3>Origem das visitas/eventos</h3>
            <div className="adminList">
              {data.marketing.sources.length ? data.marketing.sources.map(([source,count]) => <div className="adminRow" key={source}><div style={{flex:1}}><strong>{source}</strong></div><strong>{count}</strong></div>) : <p className="muted">Ainda não há dados de origem.</p>}
            </div>
            <p className="small muted" style={{marginTop:10}}>Use links com UTM, por exemplo: utm_source=instagram, utm_medium=paid, utm_campaign=teste.</p>
          </div>
        </div>
      </div>

      <div className="feature" style={{marginTop:18}}><div className="badge">📊 Funil</div><h2 style={{marginTop:10}}>Ativação do produto</h2><div className="funnel"><Funnel label="Usuários cadastrados" value={s.users}/><Funnel label="Instagram conectado" value={s.connected}/><Funnel label="Conteúdos criados" value={s.drafts}/><Funnel label="Planos ativos" value={s.active}/></div></div>
    </section>
  </main>;
}

function AdminStat({icon,label,value}:{icon:string;label:string;value:string|number}) {
 return <div className="adminStat"><span>{icon}</span><small>{label}</small><strong>{typeof value==="number"?value.toLocaleString("pt-BR"):value}</strong></div>;
}
function Funnel({label,value}:{label:string;value:number}) {
 return <div className="funnelRow"><div><strong>{label}</strong><div className="funnelBar"><i style={{width:"100%"}}/></div></div><strong>{value.toLocaleString("pt-BR")}</strong></div>;
}
