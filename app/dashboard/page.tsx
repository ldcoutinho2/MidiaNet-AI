"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Me = { user: { name: string | null; email: string; strategicProfile: { profileDescription: string; desiredOutcome: string } | null; socialAccounts: { id: string; platform: string; username: string | null }[] } };

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then(async response => {
        if (!response.ok) { router.replace("/login"); return null; }
        return response.json();
      })
      .then(result => result && setData(result))
      .finally(() => setLoading(false));
  }, [router]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
  }

  if (loading) return <main className="auth"><div className="authbox"><p className="muted">Carregando seu painel...</p></div></main>;
  if (!data) return null;

  const profile = data.user.strategicProfile;
  const instagram = data.user.socialAccounts[0];

  return <main className="page">
    <nav className="nav"><div className="logo">MidiaNet<span>AI</span></div><button className="muted" onClick={logout} style={{ background: "none", border: 0, cursor: "pointer" }}>Sair</button></nav>
    <section className="section" style={{paddingTop:40}}>
      <div className="badge">Visão geral</div>
      <h1 style={{fontSize:44,letterSpacing:-2,margin:"18px 0 8px"}}>Olá, {data.user.name || "criador"}.</h1>
      <p className="muted">Seu espaço para transformar dados e objetivo em decisões de conteúdo.</p>
      <div className="grid3" style={{marginTop:28}}>
        <div className="card"><small>Instagram</small><strong>{instagram ? "Conectado" : "Aguardando conexão"}</strong><span className="small muted">{instagram?.username ? "@" + instagram.username : "Vamos conectar pela Meta"}</span></div>
        <div className="card"><small>Objetivo declarado</small><strong style={{fontSize:20}}>{profile?.desiredOutcome || "Ainda não informado"}</strong></div>
        <div className="card"><small>Status</small><strong style={{fontSize:20}}>Perfil salvo</strong><span className="small muted">{data.user.email}</span></div>
      </div>
      <div className="grid3" style={{marginTop:20}}>
        <div className="feature"><h3>🎯 Sua intenção</h3><p>{profile?.desiredOutcome || "Conte o que deseja alcançar."}</p></div>
        <div className="feature"><h3>🧬 DNA do Perfil</h3><p>Será construído depois da conexão e análise dos dados reais do Instagram.</p></div>
        <div className="feature"><h3>📅 Próximo passo</h3><p>Conectar Instagram pela autorização oficial da Meta e iniciar a análise.</p></div>
      </div>
    </section>
  </main>;
}
