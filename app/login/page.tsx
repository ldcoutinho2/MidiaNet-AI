import Link from "next/link";

export default function Login() {
  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <h1>Bem-vindo de volta</h1>
    <p className="muted">Entre para continuar sua estratégia.</p>
    <div className="field"><label>E-mail</label><input type="email" placeholder="voce@email.com"/></div>
    <div className="field"><label>Senha</label><input type="password" placeholder="••••••••"/></div>
    <button className="btn primary full">Entrar</button>
    <p className="muted small" style={{textAlign:"center",marginTop:20}}>Ainda não tem conta? <Link href="/onboarding" style={{color:"#d8b4fe"}}>Começar análise</Link></p>
  </div></main>;
}