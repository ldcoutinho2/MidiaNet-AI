"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type AdminData = {
  stats: { users:number; trialing:number; active:number; connected:number; drafts:number; payments:number; revenue:number; events:number };
  recentUsers: any[];
  recentPayments: any[];
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
          <div className="adminList">{data.recentUsers.map(u=><div className="adminRow" key={u.id}><div className="adminAvatar">{(u.name||u.email||"?").slice(0,1).toUpperCase()}</div><div style={{flex:1}}><strong>{u.name||"Sem nome"}</strong><p className="small muted">{u.email}{u.phone?" · "+u.phone:""}</p><p className="small muted">Cadastro: {new Date(u.createdAt).toLocaleString("pt-BR")}</p></div><div style={{textAlign:"right"}}><span className="badge">{u.subscription?.status==="ACTIVE"?"Ativo":u.subscription?.status==="TRIALING"?"Teste":"Sem plano"}</span><p className="small muted" style={{marginTop:6}}>{u.socialAccounts?.[0]?.username?("@"+u.socialAccounts[0].username):"Instagram não conectado"}</p></div></div>)}</div>
        </section>

        <section className="feature"><div className="row-between"><div><div className="badge">💳 Pagamentos</div><h2 style={{marginTop:10}}>Movimentações recentes</h2></div><span className="small muted">{s.payments} registros</span></div>
          <div className="adminList">{data.recentPayments.length?data.recentPayments.map(p=><div className="adminRow" key={p.id}><div style={{flex:1}}><strong>{p.user?.name||p.user?.email||"Cliente"}</strong><p className="small muted">{new Date(p.createdAt).toLocaleString("pt-BR")}</p></div><div style={{textAlign:"right"}}><strong>R$ {(p.amountCents/100).toLocaleString("pt-BR",{minimumFractionDigits:2})}</strong><p className="small muted">{p.status}</p></div></div>):<p className="muted">Nenhum pagamento registrado ainda.</p>}</div>
        </section>
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
