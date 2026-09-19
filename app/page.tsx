import Link from "next/link";

export default function Home() {
  return (
    <main className="page">
      <nav className="nav"><div className="logo">MidiaNet<span>AI</span></div><Link className="muted" href="/login">Entrar</Link></nav>
      <section className="hero">
        <div>
          <div className="badge">🧠 Estratégia personalizada para Instagram</div>
          <h1>Você diz onde quer chegar. <span className="gradient">A IA encontra o caminho.</span></h1>
          <p>Conecte seu Instagram, explique o que deseja alcançar e deixe o MidiaNet AI cruzar seus objetivos com os dados do perfil para construir uma estratégia personalizada.</p>
          <div className="actions"><Link className="btn primary" href="/onboarding">Começar análise</Link><Link className="btn secondary" href="/login">Já tenho conta</Link></div>
        </div>
        <div className="mock">
          <div className="mocktop"><span>Diagnóstico do perfil</span><span>● Pronto</span></div>
          <div className="statgrid">
            <div className="card"><small>Seguidores</small><strong>8.420</strong></div>
            <div className="card"><small>Crescimento</small><strong>+12,8%</strong></div>
            <div className="card"><small>Melhor formato</small><strong>Reels</strong></div>
            <div className="card"><small>Objetivo</small><strong>Clientes</strong></div>
          </div>
          <div className="card" style={{marginTop:12}}><small>Próxima recomendação</small><strong style={{fontSize:18}}>Transforme seus melhores resultados em uma série de conteúdos.</strong></div>
        </div>
      </section>
      <section className="section"><div className="grid3">
        <div className="feature"><h3>🔎 Analisa</h3><p>Identifica padrões do seu próprio histórico para entender o que está funcionando.</p></div>
        <div className="feature"><h3>🎯 Entende</h3><p>Seu objetivo é levado em conta para que crescimento, clientes ou vendas não sejam tratados como a mesma coisa.</p></div>
        <div className="feature"><h3>🔄 Aprende</h3><p>Cada resultado alimenta as próximas recomendações e ajuda a estratégia a evoluir.</p></div>
      </div></section>
    </main>
  );
}