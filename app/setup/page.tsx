"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const steps = [
  "Instagram e negócio",
  "Público",
  "Objetivos",
  "Posicionamento",
  "Conteúdo e rotina",
  "Monetização",
  "Referências e diferenciais",
  "Revisão",
];

type SetupForm = {\n  instagramProfileUrl:string; profileDescription:string; businessType:string; niche:string; offer:string; desiredOutcome:string;\n  audience:string; audienceAge:string; audienceGender:string; audienceLocation:string; audienceInterests:string; audiencePainPoints:string;\n  objective:string; secondaryObjectives:string[]; conversionGoal:string; monetization:string; desiredPositioning:string; brandPersonality:string;\n  contentPreferences:string[]; contentStyle:string; appearsOnCamera:boolean; availableMinutesPerDay:number; availableDaysPerWeek:number; postingFrequency:string;\n  contentAvoid:string; referenceProfiles:string; competitors:string; differentiators:string; currentChallenges:string; salesFunnel:string; ninetyDayGoal:string; successDefinition:string; constraints:string; location:string;\n};\n\nconst initial: SetupForm = {
  instagramProfileUrl: "",
  profileDescription: "",
  businessType: "",
  niche: "",
  offer: "",
  desiredOutcome: "",
  audience: "",
  audienceAge: "",
  audienceGender: "",
  audienceLocation: "",
  audienceInterests: "",
  audiencePainPoints: "",
  objective: "",
  secondaryObjectives: [] as string[],
  conversionGoal: "",
  monetization: "",
  desiredPositioning: "",
  brandPersonality: "",
  contentPreferences: [] as string[],
  contentStyle: "",
  appearsOnCamera: true,
  availableMinutesPerDay: 60,
  availableDaysPerWeek: 5,
  postingFrequency: "",
  contentAvoid: "",
  referenceProfiles: "",
  competitors: "",
  differentiators: "",
  currentChallenges: "",
  salesFunnel: "",
  ninetyDayGoal: "",
  successDefinition: "",
  constraints: "",
  location: "",
};

function Field({ label, value, onChange, placeholder, textarea=false }: any) {
  return <div className="field">
    <label>{label}</label>
    {textarea
      ? <textarea value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder} />
      : <input value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder} />}
  </div>;
}

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<SetupForm>(initial);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/me").then(async r => {
      if (!r.ok) { router.replace("/login"); return null; }
      return r.json();
    }).then(data => {
      const p = data?.user?.strategicProfile as Partial<SetupForm> & { onboardingCompletedAt?: string | null } | null | undefined;
      if (!p) return;
      if (p.onboardingCompletedAt) {
        router.replace("/dashboard");
        return;
      }
      setForm(current => ({
        ...current,
        instagramProfileUrl: p.instagramProfileUrl ?? current.instagramProfileUrl,
        profileDescription: p.profileDescription ?? current.profileDescription,
        businessType: p.businessType ?? current.businessType,
        niche: p.niche ?? current.niche,
        offer: p.offer ?? current.offer,
        desiredOutcome: p.desiredOutcome ?? current.desiredOutcome,
        audience: p.audience ?? current.audience,
        audienceAge: p.audienceAge ?? current.audienceAge,
        audienceGender: p.audienceGender ?? current.audienceGender,
        audienceLocation: p.audienceLocation ?? current.audienceLocation,
        audienceInterests: p.audienceInterests ?? current.audienceInterests,
        audiencePainPoints: p.audiencePainPoints ?? current.audiencePainPoints,
        objective: p.objective ?? current.objective,
        secondaryObjectives: Array.isArray(p.secondaryObjectives) ? p.secondaryObjectives : current.secondaryObjectives,
        conversionGoal: p.conversionGoal ?? current.conversionGoal,
        monetization: p.monetization ?? current.monetization,
        desiredPositioning: p.desiredPositioning ?? current.desiredPositioning,
        brandPersonality: p.brandPersonality ?? current.brandPersonality,
        contentPreferences: Array.isArray(p.contentPreferences) ? p.contentPreferences : current.contentPreferences,
        contentStyle: p.contentStyle ?? current.contentStyle,
        appearsOnCamera: typeof p.appearsOnCamera === "boolean" ? p.appearsOnCamera : current.appearsOnCamera,
        availableMinutesPerDay: typeof p.availableMinutesPerDay === "number" ? p.availableMinutesPerDay : current.availableMinutesPerDay,
        availableDaysPerWeek: typeof p.availableDaysPerWeek === "number" ? p.availableDaysPerWeek : current.availableDaysPerWeek,
        postingFrequency: p.postingFrequency ?? current.postingFrequency,
        contentAvoid: p.contentAvoid ?? current.contentAvoid,
        referenceProfiles: p.referenceProfiles ?? current.referenceProfiles,
        competitors: p.competitors ?? current.competitors,
        differentiators: p.differentiators ?? current.differentiators,
        currentChallenges: p.currentChallenges ?? current.currentChallenges,
        salesFunnel: p.salesFunnel ?? current.salesFunnel,
        ninetyDayGoal: p.ninetyDayGoal ?? current.ninetyDayGoal,
        successDefinition: p.successDefinition ?? current.successDefinition,
        constraints: p.constraints ?? current.constraints,
        location: p.location ?? current.location,
      }));
    }).finally(()=>setLoading(false));
  }, [router]);

  function set(key:string, value:any) {
    setForm(current => ({...current, [key]: value}));
  }

  function toggle(key:"secondaryObjectives"|"contentPreferences", value:string) {
    setForm(current => ({
      ...current,
      [key]: current[key].includes(value)
        ? current[key].filter((x:string)=>x!==value)
        : [...current[key], value],
    }));
  }

  function validate() {
    if (step === 0 && (!form.instagramProfileUrl || !form.profileDescription || !form.businessType || !form.niche || !form.offer)) return "Preencha o Instagram, quem você é, nicho e o que oferece.";
    if (step === 1 && (!form.audience || !form.audiencePainPoints)) return "Descreva seu público e o principal problema/desejo dele.";
    if (step === 2 && !form.objective) return "Escolha o objetivo principal.";
    if (step === 3 && (!form.desiredPositioning || !form.brandPersonality)) return "Defina como quer ser percebido e sua personalidade.";
    if (step === 4 && (!form.contentPreferences.length || !form.postingFrequency)) return "Escolha os formatos e a frequência que consegue manter.";
    if (step === 5 && (!form.monetization || !form.conversionGoal)) return "Informe como pretende monetizar e qual conversão deseja.";
    if (step === 6 && !form.differentiators) return "Conte o que diferencia você ou sua marca.";
    return "";
  }

  function next() {
    const message = validate();
    if (message) { setError(message); return; }
    setError("");
    setStep(s => Math.min(7, s + 1));
  }

  async function finish() {
    setError("");
    const message = validate();
    if (message) { setError(message); setStep(6); return; }
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (!response.ok) { setError(data.error || "Não foi possível salvar."); return; }
      router.replace("/dashboard");
    } catch {
      setError("Não foi possível conectar ao servidor.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <main className="auth"><div className="authbox"><p className="muted">Preparando seu diagnóstico...</p></div></main>;

  const check = (key:"secondaryObjectives"|"contentPreferences", value:string) => (
    <button type="button" className={form[key].includes(value) ? "btn primary" : "btn secondary"} onClick={()=>toggle(key,value)} style={{margin:"4px"}}>{value}</button>
  );

  return <main className="auth">
    <div className="authbox" style={{width:"min(820px,100%)"}}>
      <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center"}}>
        <div>
          <div className="logo">MidiaNet<span>AI</span></div>
          <h1 style={{marginBottom:8}}>Vamos construir o DNA do seu perfil.</h1>
          <p className="muted">Quanto melhor conhecermos você, seu público e seu objetivo, mais específica será a estratégia da IA.</p>
        </div>
        <strong>{step + 1}/{steps.length}</strong>
      </div>

      <div style={{height:8,background:"#27272a",borderRadius:99,margin:"24px 0"}}>
        <div style={{height:"100%",width:((step+1)/steps.length*100)+"%",background:"linear-gradient(90deg,#a855f7,#ec4899)",borderRadius:99}} />
      </div>
      <div className="badge">{steps[step]}</div>

      {step === 0 && <>
        <Field label="Perfil do Instagram" value={form.instagramProfileUrl} onChange={(v:string)=>set("instagramProfileUrl",v)} placeholder="@seuperfil ou https://instagram.com/seuperfil" />
        <Field label="Quem é você ou sua empresa?" value={form.profileDescription} onChange={(v:string)=>set("profileDescription",v)} placeholder="Conte sua história, experiência, momento atual e contexto." textarea />
        <Field label="Tipo de perfil/negócio" value={form.businessType} onChange={(v:string)=>set("businessType",v)} placeholder="Criador, loja, profissional, empresa, afiliado..." />
        <Field label="Nicho" value={form.niche} onChange={(v:string)=>set("niche",v)} placeholder="Ex.: marketing digital, moda, estética..." />
        <Field label="O que você oferece?" value={form.offer} onChange={(v:string)=>set("offer",v)} placeholder="Produtos, serviços, conteúdo, ofertas..." textarea />
        <Field label="Onde você atua?" value={form.location} onChange={(v:string)=>set("location",v)} placeholder="Cidade/região ou Brasil inteiro" />
      </>}

      {step === 1 && <>
        <Field label="Quem você quer atrair?" value={form.audience} onChange={(v:string)=>set("audience",v)} placeholder="Descreva seu cliente/seguidor ideal." textarea />
        <div className="grid3">
          <Field label="Faixa etária" value={form.audienceAge} onChange={(v:string)=>set("audienceAge",v)} placeholder="Ex.: 18 a 35" />
          <Field label="Gênero" value={form.audienceGender} onChange={(v:string)=>set("audienceGender",v)} placeholder="Todos, mulheres..." />
          <Field label="Localização" value={form.audienceLocation} onChange={(v:string)=>set("audienceLocation",v)} placeholder="Brasil, RJ..." />
        </div>
        <Field label="Interesses do público" value={form.audienceInterests} onChange={(v:string)=>set("audienceInterests",v)} placeholder="Assuntos, desejos, hábitos e referências." textarea />
        <Field label="Principal problema, dor ou desejo" value={form.audiencePainPoints} onChange={(v:string)=>set("audiencePainPoints",v)} placeholder="O que esse público quer resolver ou conquistar?" textarea />
      </>}

      {step === 2 && <>
        <h3>Qual é o principal objetivo?</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0 20px"}}>
          {["Crescer seguidores","Aumentar alcance","Criar autoridade","Vender produtos","Vender serviços","Conseguir clientes","Gerar leads","Monetizar conteúdo","Construir marca"].map(x => <button type="button" key={x} className={form.objective===x?"btn primary":"btn secondary"} onClick={()=>set("objective",x)}>{x}</button>)}
        </div>
        <Field label="O que você quer alcançar nos próximos 90 dias?" value={form.ninetyDayGoal} onChange={(v:string)=>set("ninetyDayGoal",v)} placeholder="Seja específico." textarea />
        <Field label="Como você vai considerar que deu certo?" value={form.successDefinition} onChange={(v:string)=>set("successDefinition",v)} placeholder="Ex.: gerar 30 leads qualificados por mês." textarea />
        <Field label="Quais objetivos secundários também importam?" value={form.secondaryObjectives.join(", ")} onChange={(v:string)=>set("secondaryObjectives",v.split(",").map(x=>x.trim()).filter(Boolean))} placeholder="Ex.: autoridade, seguidores, comunidade" />
      </>}

      {step === 3 && <>
        <h3>Como você quer que seu perfil seja percebido?</h3>
        <Field label="Posicionamento desejado" value={form.desiredPositioning} onChange={(v:string)=>set("desiredPositioning",v)} placeholder="Ex.: quero ser visto como uma autoridade acessível..." textarea />
        <Field label="Personalidade da marca/perfil" value={form.brandPersonality} onChange={(v:string)=>set("brandPersonality",v)} placeholder="Ex.: direto, humano, premium, divertido..." />
        <Field label="Estilo de comunicação" value={form.contentStyle} onChange={(v:string)=>set("contentStyle",v)} placeholder="Como você quer falar com o público?" />
        <Field label="Perfis que você admira ou quer usar como referência" value={form.referenceProfiles} onChange={(v:string)=>set("referenceProfiles",v)} placeholder="@perfil1, @perfil2..." />
        <Field label="O que você não quer que sua marca pareça?" value={form.constraints} onChange={(v:string)=>set("constraints",v)} placeholder="Ex.: genérico, apelativo, agressivo..." />
      </>}

      {step === 4 && <>
        <h3>Em quais formatos você quer investir seu tempo?</h3>
        <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0 20px"}}>
          {["Reels","Stories","Carrossel","Lives","Fotos","Conteúdo de venda","Conteúdo de autoridade","Conteúdo de comunidade"].map(x=>check("contentPreferences",x))}
        </div>
        <div className="grid3">
          <Field label="Minutos por dia" value={String(form.availableMinutesPerDay)} onChange={(v:string)=>set("availableMinutesPerDay",Number(v)||0)} placeholder="60" />
          <Field label="Dias por semana" value={String(form.availableDaysPerWeek)} onChange={(v:string)=>set("availableDaysPerWeek",Number(v)||0)} placeholder="5" />
          <Field label="Frequência que consegue manter" value={form.postingFrequency} onChange={(v:string)=>set("postingFrequency",v)} placeholder="Ex.: 4 posts + Stories" />
        </div>
        <Field label="Você aparece nos vídeos?" value={form.appearsOnCamera ? "Sim" : "Não"} onChange={(v:string)=>set("appearsOnCamera",v==="Sim")} placeholder="Sim ou Não" />
        <Field label="O que você não quer produzir?" value={form.contentAvoid} onChange={(v:string)=>set("contentAvoid",v)} placeholder="Formatos, temas ou estilos que não combinam com você." textarea />
      </>}

      {step === 5 && <>
        <h3>Como esse perfil vai gerar dinheiro?</h3>
        <Field label="Modelo de monetização" value={form.monetization} onChange={(v:string)=>set("monetization",v)} placeholder="Produtos, serviços, afiliados, publicidade..." />
        <Field label="Qual conversão você quer gerar?" value={form.conversionGoal} onChange={(v:string)=>set("conversionGoal",v)} placeholder="WhatsApp, checkout, DM, cadastro, venda..." />
        <Field label="Como funciona hoje seu caminho até a venda?" value={form.salesFunnel} onChange={(v:string)=>set("salesFunnel",v)} placeholder="Ex.: Reels → perfil → WhatsApp → fechamento." textarea />
        <Field label="Quais são seus principais desafios hoje?" value={form.currentChallenges} onChange={(v:string)=>set("currentChallenges",v)} placeholder="O que está travando seu crescimento ou vendas?" textarea />
      </>}

      {step === 6 && <>
        <Field label="O que diferencia você dos outros?" value={form.differentiators} onChange={(v:string)=>set("differentiators",v)} placeholder="Experiência, produto, método, personalidade, história..." textarea />
        <Field label="Quem você considera concorrente?" value={form.competitors} onChange={(v:string)=>set("competitors",v)} placeholder="Perfis, marcas ou referências do mesmo mercado." textarea />
        <Field label="Existe alguma restrição importante?" value={form.constraints} onChange={(v:string)=>set("constraints",v)} placeholder="Orçamento, tempo, equipe, regras, temas que não pode abordar..." textarea />
      </>}

      {step === 7 && <>
        <h2>Revise antes da IA começar</h2>
        <p className="muted">A IA vai cruzar todas essas informações com as informações públicas que conseguir encontrar sobre o perfil. Ela não deve inventar dados que não conseguir verificar.</p>
        <div className="feature" style={{marginTop:18}}>
          <strong>@{form.instagramProfileUrl.replace(/^.*instagram\.com\//,"").replace(/^@/,"").replace(/\/$/,"")}</strong>
          <p style={{marginTop:8}}>{form.businessType} · {form.niche}</p>
          <p style={{marginTop:8}}><strong>Objetivo:</strong> {form.objective}</p>
          <p style={{marginTop:8}}><strong>Posicionamento:</strong> {form.desiredPositioning}</p>
          <p style={{marginTop:8}}><strong>Conteúdo:</strong> {form.contentPreferences.join(", ")}</p>
          <p style={{marginTop:8}}><strong>Monetização:</strong> {form.monetization}</p>
        </div>
        <div className="feature" style={{marginTop:14}}>
          <h3>🧠 O que a IA vai fazer</h3>
          <p>Pesquisar informações públicas quando disponíveis, entender o cenário atual, cruzar seu objetivo com seu posicionamento desejado, definir pilares, formatos, estratégia de conversão e montar seu primeiro plano de conteúdo.</p>
        </div>
      </>}

      {error && <p className="small" style={{color:"#fda4af",marginTop:16}}>{error}</p>}

      <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:24}}>
        <button className="btn secondary" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}>Voltar</button>
        {step < 7
          ? <button className="btn primary" onClick={next}>Continuar →</button>
          : <button className="btn primary" onClick={finish} disabled={saving}>{saving ? "Salvando seu DNA..." : "Concluir diagnóstico →"}</button>}
      </div>
    </div>
  </main>;
}
