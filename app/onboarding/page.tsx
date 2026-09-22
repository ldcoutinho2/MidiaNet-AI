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
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleCreateAccount() {
    setError("");
    if (!email || !password) {
      setError("Preencha e-mail e senha para continuar.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
          profileDescription: "Diagnóstico estratégico pendente.",
          desiredOutcome: "Definir após a criação da conta.",
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível criar sua conta.");
        return;
      }
      await trackEvent({ name: "signup_completed", occurredAt: new Date().toISOString() });
      router.push("/welcome");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <div className="badge" style={{marginTop:22}}>1 de 2 · Criar conta</div>
    <h1>Primeiro criamos sua conta.</h1>
    <p className="muted" style={{lineHeight:1.6}}>
      Depois que entrar, vamos fazer um diagnóstico completo do seu perfil, negócio, público, objetivos, posicionamento, conteúdo e monetização.
    </p>

    <div className="field"><label>Seu nome</label><input value={name} onChange={e=>setName(e.target.value)} placeholder="Como podemos chamar você?" /></div>
    <div className="field"><label>E-mail</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="voce@email.com" /></div>
    <div className="field"><label>Celular / WhatsApp</label><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="(21) 99999-9999" /></div>
    <div className="field"><label>Senha</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>

    {error && <p className="small" style={{color:"#fda4af",marginBottom:14}}>{error}</p>}
    <button className="btn primary full" onClick={handleCreateAccount} disabled={loading}>
      {loading ? "Criando sua conta..." : "Criar conta e continuar →"}
    </button>

    <p className="muted small" style={{marginTop:16}}>A próxima etapa leva alguns minutos e serve para ensinar a IA sobre você antes da primeira análise.</p>
    <p className="muted small" style={{textAlign:"center",marginTop:18}}>Já tem conta? <Link href="/login" style={{color:"#d8b4fe"}}>Entrar</Link></p>
  </div></main>;
}
