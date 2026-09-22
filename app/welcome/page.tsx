"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Welcome() {
  const router=useRouter();
  const [loading,setLoading]=useState(true);
  const [name,setName]=useState("");
  const [trial,setTrial]=useState<any>(null);

  useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(x=>{if(!x.authenticated){router.replace("/login");return}setName(x.user.name||"criador");setTrial(x.user.subscription)}).finally(()=>setLoading(false))},[router]);

  if(loading)return <main className="auth"><div className="authbox"><p className="muted">Preparando seu acesso...</p></div></main>;

  return <main className="auth"><div className="authbox" style={{width:"min(900px,100%)"}}>
    <div className="badge">🎉 Seu teste começou</div>
    <h1 style={{marginTop:14}}>Bem-vindo, {name}.</h1>
    <p className="muted" style={{fontSize:17,lineHeight:1.6}}>Antes de pedir qualquer coisa para a IA, vamos mostrar o que você pode fazer e depois entender seu perfil.</p>
    <div className="grid3" style={{marginTop:22}}>
      <div className="card"><strong>2 dias</strong><p className="small muted">teste gratuito</p></div>
      <div className="card"><strong>8 conteúdos</strong><p className="small muted">até 4 por dia no teste</p></div>
      <div className="card"><strong>4 imagens</strong><p className="small muted">geração visual no teste</p></div>
    </div>
    <div className="feature" style={{marginTop:18}}>
      <h2>Escolha como o MidiaNet AI vai conhecer você</h2>
      <p className="muted" style={{marginTop:7}}>Você pode conectar seu Instagram profissional para receber dados e métricas reais ou começar sem conectar. A estratégia continua funcionando nos dois caminhos.</p>
      <div className="grid2" style={{marginTop:16}}>
        <button className="card actionCard" onClick={()=>router.push("/connect-instagram")}><strong>📸 Conectar Instagram</strong><p className="small muted" style={{marginTop:7}}>Para análise de métricas, evolução e, futuramente, publicação.</p><span className="btn primary" style={{display:"inline-block",marginTop:12}}>Conectar agora →</span></button>
        <button className="card actionCard" onClick={()=>router.push("/setup")}><strong>🚀 Continuar sem conectar</strong><p className="small muted" style={{marginTop:7}}>Você informa seu perfil e a IA monta sua estratégia mesmo sem acesso à conta.</p><span className="btn secondary" style={{display:"inline-block",marginTop:12}}>Começar diagnóstico →</span></button>
      </div>
    </div>
    <div className="feature" style={{marginTop:18}}>
      <h2>Planos</h2>
      <p className="small muted" style={{marginTop:6}}>O teste não exige escolha de plano agora. Os preços ficam configuráveis antes de ativarmos o checkout.</p>
      <div className="grid3" style={{marginTop:14}}>
        <div className="card"><small>TESTE</small><strong>2 dias</strong><p className="small muted">Conheça o sistema e gere seu primeiro plano.</p></div>
        <div className="card"><small>MENSAL</small><strong>Plano completo</strong><p className="small muted">IA + planejamento + criação + métricas.</p></div>
        <div className="card"><small>ANUAL</small><strong>Plano completo</strong><p className="small muted">Mesmo produto com cobrança anual.</p></div>
      </div>
    </div>
  </div></main>;
}
