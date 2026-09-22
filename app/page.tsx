"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { trackEvent } from "@/lib/events";

function SalesLanding() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    const metadata: Record<string,string> = { path: "/", landing: "sales" };
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach((key) => {
      const value = params.get(key);
      if (value) {
        metadata[key] = value;
        try { localStorage.setItem("mn_"+key, value); } catch {}
      } else {
        try {
          const saved = localStorage.getItem("mn_"+key);
          if (saved) metadata[key] = saved;
        } catch {}
      }
    });
    trackEvent({ name: "page_view", occurredAt: new Date().toISOString(), metadata });
  }, [searchParams]);

  function startSignup() {
    const metadata: Record<string,string> = { path: "/", cta: "hero_trial" };
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach((key) => {
      try {
        const value = localStorage.getItem("mn_"+key);
        if (value) metadata[key] = value;
      } catch {}
    });
    trackEvent({ name: "signup_started", occurredAt: new Date().toISOString(), metadata });
  }

  return (
    <main className="page salesPage">
      <nav className="nav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          <Link className="muted" href="/login">Entrar</Link>
          <Link className="btn secondary" href="/onboarding" onClick={startSignup}>Teste grátis →</Link>
        </div>
      </nav>

      <section className="salesHero section">
        <div>
          <div className="badge">🧠 Seu estrategista de conteúdo com IA</div>
          <h1>Você diz onde quer chegar.<br/><span className="gradient">A IA encontra o caminho.</span></h1>
          <p className="salesLead">
            O MidiaNet AI transforma seu objetivo em um plano prático para o Instagram:
            entende seu perfil, define o que fazer, cria ideias de conteúdo e usa seus resultados
            para orientar os próximos passos.
          </p>
          <div className="actions" style={{marginTop:24}}>
            <Link className="btn primary" href="/onboarding" onClick={startSignup}>🚀 Começar meu teste grátis</Link>
            <Link className="btn secondary" href="#como-funciona">Ver como funciona ↓</Link>
          </div>
          <div className="salesProof">
            <span>✓ 2 dias para testar</span>
            <span>✓ Estratégia personalizada</span>
            <span>✓ Até 2 imagens no teste</span>
            <span>✓ Pode começar sem conectar Instagram</span>
          </div>
        </div>

        <div className="salesMock">
          <div className="salesMockTop"><strong>MidiaNet AI · Diagnóstico</strong><span className="small"><i className="salesDot"/>IA trabalhando</span></div>
          <div className="salesMetricGrid">
            <div className="salesMetric"><small>Objetivo</small><strong>Mais clientes</strong></div>
            <div className="salesMetric"><small>Foco</small><strong>Conteúdo</strong></div>
            <div className="salesMetric"><small>Plano</small><strong>7 dias</strong></div>
            <div className="salesMetric"><small>Próxima ação</small><strong>Publicar</strong></div>
          </div>
          <div className="salesInsight"><small>💡 Recomendação da IA</small><strong style={{display:"block",marginTop:7,lineHeight:1.4}}>Transforme o tema que mais gera interesse em uma sequência de conteúdos.</strong></div>
        </div>
      </section>

      <section className="salesSection section" id="como-funciona">
        <div className="salesSectionHeader">
          <div className="badge">O que você está comprando</div>
          <h2>Não é só um gerador de posts.</h2>
          <p className="muted" style={{lineHeight:1.7}}>
            Você está adquirindo acesso a um sistema que organiza estratégia, planejamento, criação e análise
            em um único fluxo, para transformar “não sei o que postar” em uma próxima ação clara.
          </p>
        </div>
        <div className="salesCards">
          <div className="salesCard"><span>🎯</span><h3>Estratégia personalizada</h3><p>A IA cruza seu objetivo, nicho, público, oferta, posicionamento e contexto para estruturar a direção do conteúdo.</p></div>
          <div className="salesCard"><span>📅</span><h3>Plano semanal</h3><p>Você recebe uma sequência de conteúdos organizada por dia, formato, horário, objetivo, gancho, roteiro, legenda e CTA.</p></div>
          <div className="salesCard"><span>✍️</span><h3>Criação assistida</h3><p>Transforme uma ideia em diferentes formatos e refine títulos, ganchos, roteiros, legendas e chamadas para ação.</p></div>
          <div className="salesCard"><span>📊</span><h3>Evolução</h3><p>Acompanhe resultados e registre métricas de Instagram, leads, conversas, vendas e faturamento para orientar decisões.</p></div>
          <div className="salesCard"><span>🔁</span><h3>Aprendizado contínuo</h3><p>O objetivo é usar o que aconteceu nos conteúdos anteriores para ajustar as próximas recomendações.</p></div>
          <div className="salesCard"><span>📸</span><h3>Instagram conectado</h3><p>Quando conectado, o sistema pode trabalhar com métricas autorizadas da conta profissional para tornar a análise mais contextual.</p></div>
        </div>
      </section>

      <section className="salesSection section">
        <div className="salesSectionHeader">
          <div className="badge">Como você usa</div>
          <h2>Do objetivo até a próxima publicação.</h2>
        </div>
        <div className="salesSteps">
          <div className="salesStep"><b>01 · ENTENDA</b><h3>Conte seu objetivo</h3><p>Informe o que você quer alcançar, seu negócio, público e contexto.</p></div>
          <div className="salesStep"><b>02 · DIAGNÓSTICO</b><h3>A IA organiza</h3><p>O sistema transforma essas informações em diagnóstico, posicionamento e estratégia.</p></div>
          <div className="salesStep"><b>03 · PLANEJE</b><h3>Receba seu plano</h3><p>Veja o que publicar e por que cada conteúdo existe dentro da estratégia.</p></div>
          <div className="salesStep"><b>04 · EVOLUA</b><h3>Meça e ajuste</h3><p>Registre resultados e use a evolução para orientar os próximos conteúdos.</p></div>
        </div>
      </section>

      <section className="salesSection section">
        <div className="salesTrial">
          <div>
            <h2>Teste o MidiaNet AI por 2 dias.</h2>
            <p>Crie sua conta, conheça o fluxo e gere sua primeira estratégia. Você pode começar mesmo sem conectar o Instagram.</p>
            <div className="salesFine">Durante o teste: 1 geração de estratégia e até 2 gerações de imagem.</div>
          </div>
          <Link className="btn primary" href="/onboarding" onClick={startSignup}>Começar agora →</Link>
        </div>
      </section>

      <section className="salesSection section">
        <div className="salesSectionHeader"><div className="badge">Dúvidas</div><h2>Perguntas frequentes</h2></div>
        <div className="salesFaq">
          <details><summary>Preciso conectar meu Instagram?</summary><p>Não. Você pode começar informando seu perfil e objetivo. A conexão é usada para recursos que dependem de métricas autorizadas.</p></details>
          <details><summary>O MidiaNet AI cria conteúdo?</summary><p>Sim. O fluxo inclui planejamento, ideias, ganchos, roteiros, legendas, CTAs e refinamento. A criação visual por IA também faz parte do produto.</p></details>
          <details><summary>Ele garante mais seguidores ou vendas?</summary><p>Não há garantia de resultado. O sistema organiza estratégia, execução e análise para ajudar você a tomar decisões com mais contexto.</p></details>
          <details><summary>O que acontece depois do teste?</summary><p>O teste serve para você conhecer o produto. Os planos pagos podem ser apresentados no momento de contratação.</p></details>
        </div>
      </section>

      <footer className="section" style={{paddingTop:10,paddingBottom:40}}>
        <div className="row-between"><span className="small muted">MidiaNet AI · Estratégia, criação e evolução para Instagram.</span><Link className="small muted" href="/login">Entrar na plataforma</Link></div>
      </footer>
    </main>
  );
}

export default function Home() {
  return <SalesLanding />;
}
