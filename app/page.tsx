"use client";

import Link from "next/link";
import { useEffect } from "react";
import { trackEvent } from "@/lib/events";

const whatsappNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "";
const whatsappText = encodeURIComponent("Oi! Quero meu diagnóstico grátis. Meu @ é: ");
const whatsappHref = whatsappNumber
  ? `https://wa.me/${whatsappNumber.replace(/\\D/g, "")}?text=${whatsappText}`
  : `https://wa.me/?text=${whatsappText}`;

function SalesLanding() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
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
  }, []);

  function startSignup(cta = "hero_trial") {
    const metadata: Record<string,string> = { path: "/", cta };
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
      <nav className="nav salesNav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <div className="salesNavActions">
          <Link className="muted" href="/login">Entrar</Link>
          <Link className="btn primary" href="/onboarding" onClick={() => startSignup("nav_trial")}>Diagnóstico grátis</Link>
        </div>
      </nav>

      <section className="salesHero section">
        <div>
          <div className="badge">🎯 Seu social media no bolso</div>
          <h1>Sua semana de posts pronta <span className="gradient">em 5 minutos.</span></h1>
          <p className="salesLead">
            O MidiaNet analisa seu Instagram, mostra o que pode estar afastando clientes e entrega o que postar,
            com roteiro, legenda e horário. <strong>Sem pagar social media.</strong>
          </p>
          <div className="actions">
            <Link className="btn primary salesMainCta" href="/onboarding" onClick={() => startSignup()}>Quero meu diagnóstico grátis →</Link>
            <Link className="btn secondary" href="#exemplo">Ver um exemplo de semana</Link>
          </div>
          <div className="salesProof">
            <span>✓ 2 dias grátis</span><span>✓ Sem cartão</span><span>✓ Pagamento por Pix</span>
          </div>
        </div>

        <div className="phoneMock" aria-label="Exemplo da tela O que fazer hoje">
          <div className="phoneNotch"/>
          <div className="phoneHeader"><strong>MidiaNet AI</strong><span>Hoje</span></div>
          <div className="phoneGreeting">Olá, Leonardo 👋</div>
          <div className="phoneScore"><div><small>Sua nota</small><strong>38/100</strong></div><div className="scoreBar"><i/></div></div>
          <div className="phoneCard">
            <small>🚀 O QUE FAZER HOJE</small>
            <h3>Reel — 19:00</h3>
            <p>Mostre o problema que seu cliente enfrenta e apresente sua solução.</p>
            <div className="phoneHook">“Você também passa por isso?”</div>
            <button className="phoneButton">Usar conteúdo →</button>
          </div>
          <div className="phoneProgress"><span>Semana</span><strong>1 de 7 dias</strong></div>
        </div>
      </section>

      <section className="salesSection section salesPain">
        <div className="salesSectionHeader"><div className="badge">Se isso acontece com você...</div><h2>O problema não é falta de vontade.</h2></div>
        <div className="salesCards salesPainGrid">
          <div className="salesCard"><span>🤔</span><h3>Você abre o Instagram e não sabe o que postar.</h3></div>
          <div className="salesCard"><span>📱</span><h3>Posta, mas ninguém chama no WhatsApp.</h3></div>
          <div className="salesCard"><span>💸</span><h3>Social media custa R$800 por mês e não cabe no seu bolso.</h3></div>
        </div>
      </section>

      <section className="salesSection section" id="como-funciona">
        <div className="salesSectionHeader"><div className="badge">Como funciona</div><h2>Em 3 passos você sai do “não sei o que postar”.</h2></div>
        <div className="salesSteps salesSteps3">
          <div className="salesStep"><b>01</b><h3>Informe seu @ e seu objetivo</h3><p>Conte o que você vende e o que quer alcançar.</p></div>
          <div className="salesStep"><b>02</b><h3>Receba sua nota e o que corrigir</h3><p>O diagnóstico mostra os pontos que merecem atenção primeiro.</p></div>
          <div className="salesStep"><b>03</b><h3>Siga sua semana pronta</h3><p>É só copiar, gravar e postar seguindo a orientação.</p></div>
        </div>
      </section>

      <section className="salesSection section" id="exemplo">
        <div className="salesSectionHeader"><div className="badge">Veja um exemplo realista</div><h2>Você recebe algo assim.</h2><p className="muted">Exemplo ilustrativo de um negócio fictício: <strong>Açaí do Bairro</strong>.</p></div>
        <div className="exampleGrid">
          <div className="feature">
            <div className="exampleScore"><strong>42</strong><span>/100</span></div>
            <h3>Açaí do Bairro</h3>
            <p className="muted">Diagnóstico: o perfil informa o produto, mas não deixa claro por que comprar ali nem conduz o visitante para o WhatsApp.</p>
            <div className="exampleProblems"><span>❌ Bio genérica</span><span>❌ CTA fraco</span><span>❌ Conteúdo sem sequência</span></div>
            <div className="exampleBio"><small>BIO SUGERIDA</small><strong>🍧 Açaí feito na hora em [bairro]<br/>🚴 Delivery todos os dias<br/>👇 Peça pelo WhatsApp</strong></div>
          </div>
          <div className="feature">
            <h3>2 dias da semana</h3>
            <div className="examplePost"><div><b>SEG · 19:00 · REEL</b><strong>“3 erros que deixam seu açaí sem graça”</strong></div><p>Gancho + roteiro cena a cena + legenda + CTA para pedir no WhatsApp.</p><span>CTA: “Quer o seu? Chama no WhatsApp.”</span></div>
            <div className="examplePost"><div><b>TER · 12:30 · CARROSSEL</b><strong>“Qual tamanho combina com você?”</strong></div><p>5 slides explicando opções e ajudando o cliente a escolher.</p><span>CTA: “Salve para pedir depois.”</span></div>
          </div>
        </div>
      </section>

      <section className="salesSection section">
        <div className="salesSectionHeader"><div className="badge">Preço simples</div><h2>Uma fração do custo de um social media.</h2></div>
        <div className="compareWrap">
          <div className="compareRow compareHead"><span></span><strong>Social media</strong><strong>MidiaNet</strong></div>
          <div className="compareRow"><span>Preço</span><strong>R$500–R$1.500/mês</strong><strong className="compareGood">A partir de R$14,99</strong></div>
          <div className="compareRow"><span>Diagnóstico</span><span>Às vezes</span><strong>✓ Sempre, com nota</strong></div>
          <div className="compareRow"><span>Conteúdo da semana</span><span>Sim</span><strong>✓ Pronto para copiar</strong></div>
          <div className="compareRow"><span>Horário para postar</span><span>Sim</span><strong>✓ Incluído</strong></div>
          <div className="compareRow"><span>Você publica</span><span>Depende</span><strong>✓ No seu tempo</strong></div>
        </div>
      </section>

      <section className="salesSection section">
        <div className="salesSectionHeader"><div className="badge">Para quem é</div><h2>Feito para quem precisa vender e crescer usando o Instagram.</h2></div>
        <div className="audienceGrid">
          {["🍔 Lanchonetes, açaís e delivery","💇 Salões, barbearias e estética","👕 Lojas de roupa e revendedoras","🛠️ Prestadores de serviço e autônomos","🎥 Criadores que querem crescer"].map(x=><div className="audienceItem" key={x}>{x}</div>)}
        </div>
      </section>

      <section className="salesSection section" id="planos">
        <div className="salesSectionHeader"><div className="badge">Escolha seu acesso</div><h2>Comece grátis e continue quando fizer sentido.</h2></div>
        <div className="salesCards pricingGrid">
          <div className="salesCard pricingCard"><span>⚡</span><h3>Semanal</h3><div className="price">R$ 14,99 <small>/ 7 dias</small></div><p>✓ Diagnóstico<br/>✓ Estratégia<br/>✓ Semana de conteúdo<br/>✓ Roteiros, legendas e CTAs</p><Link className="btn primary full" href="/onboarding" onClick={() => startSignup("weekly_plan")}>Começar grátis →</Link></div>
          <div className="salesCard pricingCard featuredPrice"><div className="popular">MAIS ESCOLHIDO</div><span>🚀</span><h3>Mensal</h3><div className="price">R$ 29,99 <small>/ 30 dias</small></div><p>✓ Tudo do semanal<br/>✓ Acesso por 30 dias<br/>✓ Métricas e evolução<br/>✓ Ajustes com base nos resultados</p><Link className="btn primary full" href="/onboarding" onClick={() => startSignup("monthly_plan")}>Começar grátis →</Link></div>
          <div className="salesCard pricingCard"><span>👨‍💻</span><h3>Mensal + Revisão</h3><div className="price">R$ 97 <small>/ 30 dias</small></div><p>✓ Tudo do mensal<br/>✓ Revisão humana do diagnóstico<br/>✓ Revisão da estratégia pelo WhatsApp<br/>✓ Orientação personalizada</p><a className="btn secondary full" href={whatsappHref}>Falar sobre revisão →</a></div>
        </div>
        <p className="salesTrialNote">🎁 <strong>Teste grátis por 2 dias.</strong> Sem cartão. Depois você decide se quer continuar.</p>
      </section>

      <section className="salesSection section">
        <div className="salesSectionHeader"><div className="badge">Dúvidas</div><h2>Perguntas frequentes</h2></div>
        <div className="salesFaq">
          <details><summary>Qual a diferença para o ChatGPT?</summary><p>O MidiaNet é feito para Instagram. Ele analisa o seu perfil, dá uma nota, organiza a semana e usa seus resultados para orientar os próximos passos. Você não precisa saber o que perguntar.</p></details>
          <details><summary>Funciona para o meu tipo de negócio?</summary><p>Sim, desde que o seu negócio use o Instagram para divulgação, relacionamento, autoridade ou aquisição de clientes. O diagnóstico é adaptado ao seu contexto.</p></details>
          <details><summary>Preciso conectar meu Instagram?</summary><p>Não para começar. O sistema pode trabalhar com as informações que você fornece. Quando houver dados públicos sincronizados, eles deixam a análise mais contextual.</p></details>
          <details><summary>Posso cancelar quando quiser?</summary><p>Sim. Não há renovação automática. Você compra o período escolhido e decide depois se quer renovar.</p></details>
          <details><summary>O MidiaNet promete seguidores ou vendas?</summary><p>Não. Ele organiza estratégia, conteúdo e análise. Resultados dependem da execução, do mercado, da oferta e de outros fatores.</p></details>
        </div>
      </section>

      <section className="salesSection section salesFinalCta">
        <div className="salesTrial">
          <div><div className="badge">Comece agora</div><h2>Descubra o que está travando seu Instagram.</h2><p>Faça seu diagnóstico e receba o primeiro direcionamento sem pagar.</p></div>
          <Link className="btn primary salesMainCta" href="/onboarding" onClick={() => startSignup("final_cta")}>Quero meu diagnóstico grátis →</Link>
        </div>
      </section>

      <footer className="section salesFooter">
        <div className="row-between"><span className="small muted">MidiaNet AI · Seu social media no bolso.</span><div className="footerLinks"><Link className="small muted" href="/termos">Termos de Uso</Link><Link className="small muted" href="/privacidade">Política de Privacidade</Link><Link className="small muted" href="/login">Entrar</Link></div></div>
      </footer>

      <a className="whatsappFloat" href={whatsappHref} target="_blank" rel="noreferrer" aria-label="Diagnóstico grátis pelo WhatsApp">💬 <span>Diagnóstico grátis pelo WhatsApp</span></a>
    </main>
  );
}

export default function Home() { return <SalesLanding />; }
