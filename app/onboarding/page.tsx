import Link from "next/link";

export default function Onboarding() {
  return <main className="auth"><div className="authbox">
    <div className="logo">MidiaNet<span>AI</span></div>
    <div className="badge" style={{marginTop:22}}>Conhecendo seu perfil</div>
    <h1>Primeiro, conte para nós onde você quer chegar.</h1>
    <p className="muted" style={{lineHeight:1.6}}>Depois da conexão oficial com o Instagram, analisaremos os dados disponíveis e cruzaremos essas informações com o que você nos contar.</p>
    <div className="field"><label>Sobre o que é este perfil?</label><textarea placeholder="Ex.: Tenho uma loja de roupas femininas e quero usar o Instagram para atrair clientes da minha região."/></div>
    <div className="field"><label>O que você deseja alcançar com este Instagram?</label><textarea placeholder="Conte com suas próprias palavras. Ex.: Quero crescer, conseguir clientes pelo WhatsApp e começar a produzir vídeos que alcancem mais pessoas."/></div>
    <button className="btn primary full">Continuar e conectar Instagram</button>
    <p className="muted small" style={{marginTop:16}}>A conexão será feita por autorização oficial da Meta. O MidiaNet AI não pede sua senha do Instagram.</p>
    <Link href="/" className="muted small" style={{display:"block",textAlign:"center",marginTop:18}}>Voltar</Link>
  </div></main>;
}