"use client";

import { useState } from "react";
import Link from "next/link";
import { trackEvent } from "@/lib/events";

export default function Onboarding() {
  const [profileDescription, setProfileDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleContinue() {
    await trackEvent({ name: "instagram_connect_started", occurredAt: new Date().toISOString() });
    setSubmitted(true);
  }

  if (submitted) {
    return <main className="auth"><div className="authbox">
      <div className="logo">MidiaNet<span>AI</span></div>
      <div className="badge" style={{marginTop:22}}>Próxima etapa</div>
      <h1>Agora vamos conectar seu Instagram.</h1>
      <p className="muted" style={{lineHeight:1.6}}>
        O próximo passo usará a autorização oficial da Meta. Depois da conexão,
        o MidiaNet AI poderá montar a análise inicial e fazer somente as perguntas necessárias.
      </p>
      <div className="card" style={{marginTop:22}}>
        <small>Sobre o perfil</small><p>{profileDescription || "Não informado"}</p>
        <small>O que deseja alcançar</small><p>{desiredOutcome || "Não informado"}</p>
      </div>
      <a className="btn primary full" href="/api/instagram/connect" style={{display:"block",textAlign:"center",marginTop:18}}>
        Conectar Instagram
      </a>
    </div></main>;
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <div className="badge" style={{marginTop:22}}>Conhecendo seu perfil</div>
    <h1>Primeiro, conte para nós onde você quer chegar.</h1>
    <p className="muted" style={{lineHeight:1.6}}>
      Você não precisa saber explicar marketing. Conte com suas próprias palavras.
      Depois cruzaremos sua resposta com os dados disponíveis do Instagram.
    </p>
    <div className="field">
      <label>Sobre o que é este perfil?</label>
      <textarea value={profileDescription} onChange={e=>setProfileDescription(e.target.value)}
        placeholder="Ex.: Tenho uma loja de roupas femininas e quero usar o Instagram para atrair clientes da minha região."/>
    </div>
    <div className="field">
      <label>O que você deseja alcançar com este Instagram?</label>
      <textarea value={desiredOutcome} onChange={e=>setDesiredOutcome(e.target.value)}
        placeholder="Ex.: Quero crescer, conseguir clientes pelo WhatsApp e começar a produzir vídeos que alcancem mais pessoas."/>
    </div>
    <button className="btn primary full" onClick={handleContinue}>Continuar e conectar Instagram</button>
    <p className="muted small" style={{marginTop:16}}>O MidiaNet AI não pede sua senha do Instagram.</p>
    <Link href="/" className="muted small" style={{display:"block",textAlign:"center",marginTop:18}}>Voltar</Link>
  </div></main>;
}