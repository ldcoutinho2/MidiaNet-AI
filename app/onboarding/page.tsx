"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { trackEvent } from "@/lib/events";

export default function Onboarding() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profileDescription, setProfileDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    setError("");
    if (!email || !password || !profileDescription || !desiredOutcome) {
      setError("Preencha e-mail, senha e as duas perguntas para continuar.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, profileDescription, desiredOutcome }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível criar sua conta.");
        return;
      }
      await trackEvent({ name: "signup_completed", occurredAt: new Date().toISOString() });
      router.push("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <div className="badge" style={{ marginTop: 22 }}>Comece sua análise</div>
    <h1>Vamos conhecer você e o seu Instagram.</h1>
    <p className="muted" style={{ lineHeight: 1.6 }}>Primeiro criamos sua conta e registramos sua intenção. Depois conectaremos o Instagram pela autorização oficial da Meta.</p>
    <div className="field"><label>Seu nome</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Como podemos chamar você?" /></div>
    <div className="field"><label>E-mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com" /></div>
    <div className="field"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>
    <div className="field"><label>Sobre o que é este perfil?</label><textarea value={profileDescription} onChange={e => setProfileDescription(e.target.value)} placeholder="Ex.: Tenho uma loja de roupas femininas e quero atrair clientes da minha região." /></div>
    <div className="field"><label>O que você deseja alcançar com este Instagram?</label><textarea value={desiredOutcome} onChange={e => setDesiredOutcome(e.target.value)} placeholder="Ex.: Quero conseguir clientes pelo WhatsApp e crescer com vídeos." /></div>
    {error && <p className="small" style={{ color: "#fda4af", marginBottom: 14 }}>{error}</p>}
    <button className="btn primary full" onClick={handleContinue} disabled={loading}>{loading ? "Criando sua conta..." : "Criar conta e começar"}</button>
    <p className="muted small" style={{ marginTop: 16 }}>Sua senha é armazenada de forma protegida. O MidiaNet AI não pede sua senha do Instagram.</p>
    <p className="muted small" style={{ textAlign: "center", marginTop: 18 }}>Já tem conta? <Link href="/login" style={{ color: "#d8b4fe" }}>Entrar</Link></p>
  </div></main>;
}
