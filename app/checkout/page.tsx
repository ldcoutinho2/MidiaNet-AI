"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { trackEvent } from "@/lib/events";

const PLANS = {
  weekly: { label: "Semanal", price: 14.99, days: 7 },
  monthly: { label: "Mensal", price: 29.99, days: 30 },
} as const;

function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatWhatsapp(value: string) {
  const digits = onlyDigits(value).slice(0, 13);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0,2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  return `+${digits.slice(0,2)} (${digits.slice(2,4)}) ${digits.slice(4,9)}-${digits.slice(9)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [planKey, setPlanKey] = useState<keyof typeof PLANS>("weekly");
  const plan = PLANS[planKey];

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("plan") as keyof typeof PLANS | null;
    if (requested && PLANS[requested]) setPlanKey(requested);
    trackEvent({ name: "checkout_viewed", occurredAt: new Date().toISOString(), metadata: { plan: requested && PLANS[requested] ? requested : "weekly" } });
    fetch("/api/auth/me")
      .then(async (r) => {
        if (!r.ok) {
          router.replace("/login");
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.user) return;
        setName(data.user.name || "");
        setEmail(data.user.email || "");
        setWhatsapp(data.user.phone || "");
      })
      .catch(() => setError("Não foi possível carregar seus dados."));
  }, [router]);

  const formattedPrice = useMemo(
    () => plan.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }),
    [plan.price]
  );

  async function generatePix() {
    setError("");
    setPayment(null);
    setConfirmed(false);

    const cleanWhatsapp = onlyDigits(whatsapp);
    const utm: Record<string, string> = {};
    ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"].forEach((key) => {
      try {
        const value = localStorage.getItem("mn_" + key);
        if (value) utm[key] = value;
      } catch {}
    });
    if (!name.trim()) return setError("Informe seu nome.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError("Informe um e-mail válido.");
    if (cleanWhatsapp.length < 10 || cleanWhatsapp.length > 13) return setError("Informe um WhatsApp válido.");

    setLoading(true);
    trackEvent({ name: "checkout_started", occurredAt: new Date().toISOString(), metadata: { plan: planKey, amount: plan.price } });
    try {
      const response = await fetch("/api/payments/mercadopago/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: planKey, name: name.trim(), email: email.trim(), whatsapp: cleanWhatsapp, ...utm }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Não foi possível gerar o Pix.");
        return;
      }
      setPayment(data);
      // O evento pix_created também é registrado no servidor para evitar duplicidade e preservar a atribuição.
    } catch {
      setError("Não foi possível conectar ao pagamento.");
    } finally {
      setLoading(false);
    }
  }

  async function copyPix() {
    if (!payment?.qrCode) return;
    await navigator.clipboard.writeText(payment.qrCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  useEffect(() => {
    if (!payment?.paymentId) return;
    let active = true;
    let approvedTracked = false;
    let timer: number | undefined;
    const check = async () => {
      try {
        const response = await fetch("/api/payments/mercadopago/status?id=" + encodeURIComponent(payment.paymentId), { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (active && data.status === "PAID") {
          setConfirmed(true);
          if (!approvedTracked) {
            approvedTracked = true;
            // payment_approved é registrado no servidor no momento em que o pagamento é confirmado.
          }
          if (timer !== undefined) window.clearInterval(timer);
        }
      } catch {}
    };
    check();
    timer = window.setInterval(check, 4000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [payment?.paymentId]);

  if (confirmed) {
    return (
      <main className="page">
        <nav className="nav"><div className="logo">MidiaNet<span>AI</span></div></nav>
        <section className="section" style={{ maxWidth: 760, margin: "0 auto", paddingTop: 70 }}>
          <div className="feature" style={{ textAlign: "center", padding: 36 }}>
            <div className="badge">✓ Pagamento confirmado</div>
            <h1 style={{ marginTop: 16 }}>Seu acesso foi ativado.</h1>
            <p className="muted" style={{ marginTop: 10 }}>O pagamento foi confirmado pelo Mercado Pago. Você já pode voltar ao seu painel.</p>
            <button className="btn primary" style={{ marginTop: 22 }} onClick={() => router.push("/dashboard")}>Ir para meu painel →</button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <nav className="nav">
        <div className="logo">MidiaNet<span>AI</span></div>
        <button className="btn secondary" onClick={() => router.push("/dashboard")}>Voltar</button>
      </nav>

      <section className="section" style={{ maxWidth: 980, margin: "0 auto", paddingTop: 34 }}>
        <div style={{ textAlign: "center", maxWidth: 680, margin: "0 auto 26px" }}>
          <div className="badge">🔒 Checkout seguro</div>
          <h1 style={{ fontSize: 42, letterSpacing: -1.5, marginTop: 14 }}>Finalize seu acesso ao MidiaNet AI</h1>
          <p className="muted" style={{ marginTop: 9 }}>Você permanece nesta página. Preencha seus dados e gere seu Pix na hora.</p>
        </div>

        <div className="grid2" style={{ alignItems: "start" }}>
          <div className="feature">
            <div className="badge">Seu plano</div>
            <h2 style={{ marginTop: 12 }}>{plan.label}</h2>
            <div style={{ fontSize: 38, fontWeight: 900, marginTop: 8 }}>{formattedPrice}</div>
            <p className="muted" style={{ marginTop: 5 }}>{plan.days} dias de acesso completo.</p>
            <div className="card" style={{ marginTop: 18 }}>
              <strong>O que está incluído</strong>
              <p className="small" style={{ lineHeight: 1.8, marginTop: 9 }}>
                ✓ Estratégia personalizada com IA<br/>
                ✓ Auditoria do Instagram<br/>
                ✓ Plano semanal de conteúdo<br/>
                ✓ Criação e ajustes com IA<br/>
                ✓ Evolução e métricas
              </p>
            </div>
            <p className="small muted" style={{ marginTop: 14 }}>Pagamento processado pelo Mercado Pago.</p>
          </div>

          <div className="feature">
            {!payment ? (
              <>
                <div className="badge">1 · Seus dados</div>
                <h2 style={{ marginTop: 12 }}>Onde enviaremos a confirmação</h2>
                <div style={{ display: "grid", gap: 12, marginTop: 18 }}>
                  <label className="metricInput"><span>Nome completo</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome"/></label>
                  <label className="metricInput"><span>E-mail</span><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com"/></label>
                  <label className="metricInput"><span>WhatsApp</span><input inputMode="tel" value={formatWhatsapp(whatsapp)} onChange={(e) => setWhatsapp(e.target.value)} placeholder="(21) 99999-9999"/></label>
                </div>
                <button className="btn primary" style={{ width: "100%", marginTop: 18 }} onClick={generatePix} disabled={loading}>
                  {loading ? "Gerando Pix..." : `Gerar Pix de ${formattedPrice} →`}
                </button>
                {error && <p className="small" style={{ color: "#fda4af", marginTop: 12 }}>{error}</p>}
                <p className="small muted" style={{ marginTop: 14, lineHeight: 1.5 }}>Usamos seu nome, e-mail e WhatsApp para identificar sua conta e enviar informações sobre o acesso. Não armazenamos dados de cartão porque este checkout está configurado para Pix.</p>
              </>
            ) : (
              <>
                <div className="badge">2 · Pague com Pix</div>
                <h2 style={{ marginTop: 12 }}>Pix de {formattedPrice}</h2>
                <p className="muted" style={{ marginTop: 7 }}>Abra o app do seu banco, escaneie o QR Code ou use o Pix Copia e Cola.</p>
                {payment.qrCodeBase64 && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 18 }}>
                    <img src={payment.qrCodeBase64.startsWith("data:") ? payment.qrCodeBase64 : `data:image/png;base64,${payment.qrCodeBase64}`} alt="QR Code Pix" style={{ width: 250, height: 250, objectFit: "contain", background: "#fff", padding: 10, borderRadius: 16 }} />
                  </div>
                )}
                {payment.qrCode && (
                  <>
                    <textarea readOnly value={payment.qrCode} style={{ minHeight: 100, marginTop: 14 }} />
                    <button className="btn secondary" style={{ width: "100%", marginTop: 9 }} onClick={copyPix}>{copied ? "✓ Pix copiado" : "📋 Copiar Pix Copia e Cola"}</button>
                  </>
                )}
                <div className="card" style={{ marginTop: 14 }}>
                  <strong>⏳ Aguardando pagamento</strong>
                  <p className="small muted" style={{ marginTop: 6 }}>Assim que o Mercado Pago confirmar o pagamento, seu acesso será ativado automaticamente.</p>
                </div>
                <button className="btn secondary" style={{ width: "100%", marginTop: 12 }} onClick={() => setPayment(null)}>Trocar dados / gerar outro Pix</button>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
