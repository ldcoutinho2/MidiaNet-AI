import Link from "next/link";

const metrics = [["Seguidores","8.420","+12,8%"],["Alcance","124,6 mil","+18,4%"],["Interações","9.840","+21,1%"],["Conteúdos","18","este mês"]];

export default function Dashboard() {
  return <main className="page">
    <nav className="nav"><div className="logo">MidiaNet<span>AI</span></div><Link href="/" className="muted">Sair</Link></nav>
    <section className="section" style={{paddingTop:40}}>
      <div className="badge">Visão geral</div><h1 style={{fontSize:44,letterSpacing:-2,margin:"18px 0 8px"}}>Seu Instagram</h1><p className="muted">Aqui vamos transformar seus dados e seu objetivo em decisões de conteúdo.</p>
      <div className="grid3" style={{gridTemplateColumns:"repeat(4,1fr)",marginTop:28}}>
        {metrics.map(([label,value,change])=><div className="card" key={label}><small>{label}</small><strong>{value}</strong><span className="small muted">{change}</span></div>)}
      </div>
      <div className="grid3" style={{marginTop:20}}>
        <div className="feature"><h3>🎯 Objetivo</h3><p>Atrair clientes e aumentar conversões pelo WhatsApp.</p></div>
        <div className="feature"><h3>🧬 DNA do Perfil</h3><p>Em construção. Após a conexão real, o sistema aprenderá com seu histórico.</p></div>
        <div className="feature"><h3>📅 Próximo passo</h3><p>Gerar a primeira estratégia semanal personalizada.</p></div>
      </div>
    </section>
  </main>;
}