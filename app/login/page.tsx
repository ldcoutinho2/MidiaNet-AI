"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Não foi possível entrar.");
        return;
      }
      router.push("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <h1>Bem-vindo de volta</h1>
    <p className="muted">Entre para continuar sua estratégia.</p>
    <div className="field"><label>E-mail</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="voce@email.com"/></div>
    <div className="field"><label>Senha</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"/></div>
    {error && <p className="small" style={{ color: "#fda4af", marginBottom: 14 }}>{error}</p>}
    <button className="btn primary full" onClick={handleLogin} disabled={loading}>{loading ? "Entrando..." : "Entrar"}</button>
    <p className="muted small" style={{textAlign:"center",marginTop:20}}>Ainda não tem conta? <Link href="/onboarding" style={{color:"#d8b4fe"}}>Começar análise</Link></p>
  </div></main>;
}
