"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const steps = ["Seu negócio", "Público e objetivo", "Conteúdo e vendas", "Revisão"];

type SetupForm = {
  instagramProfileUrl:string; profileDescription:string; businessType:string; niche:string; offer:string; desiredOutcome:string;
  audience:string; audienceAge:string; audienceGender:string; audienceLocation:string; audienceInterests:string; audiencePainPoints:string;
  objective:string; secondaryObjectives:string[]; conversionGoal:string; monetization:string; desiredPositioning:string; brandPersonality:string;
  contentPreferences:string[]; contentStyle:string; appearsOnCamera:boolean; availableMinutesPerDay:number; availableDaysPerWeek:number;
  postingFrequency:string; contentAvoid:string; referenceProfiles:string; competitors:string; differentiators:string; currentChallenges:string;
  salesFunnel:string; ninetyDayGoal:string; successDefinition:string; constraints:string; location:string;
};

const initial:SetupForm={
  instagramProfileUrl:"",profileDescription:"",businessType:"",niche:"",offer:"",desiredOutcome:"",
  audience:"",audienceAge:"",audienceGender:"",audienceLocation:"",audienceInterests:"",audiencePainPoints:"",
  objective:"",secondaryObjectives:[],conversionGoal:"",monetization:"",desiredPositioning:"",brandPersonality:"",
  contentPreferences:[],contentStyle:"",appearsOnCamera:true,availableMinutesPerDay:60,availableDaysPerWeek:5,
  postingFrequency:"",contentAvoid:"",referenceProfiles:"",competitors:"",differentiators:"",currentChallenges:"",
  salesFunnel:"",ninetyDayGoal:"",successDefinition:"",constraints:"",location:""
};

function Field({label,value,onChange,placeholder,textarea=false,optional=false}:any){
  return <div className="field"><label>{label}{optional&&<span className="small muted"> · opcional</span>}</label>
    {textarea?<textarea value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder}/>:<input value={value} onChange={(e:any)=>onChange(e.target.value)} placeholder={placeholder}/>}
  </div>;
}

export default function SetupPage(){
 const router=useRouter(); const [step,setStep]=useState(0); const [form,setForm]=useState<SetupForm>(initial);
 const [loading,setLoading]=useState(true); const [saving,setSaving]=useState(false); const [error,setError]=useState("");

 useEffect(()=>{fetch("/api/auth/me").then(async r=>{if(!r.ok){router.replace("/login");return null}return r.json()}).then(data=>{
   const p=data?.user?.strategicProfile as Partial<SetupForm>&{onboardingCompletedAt?:string|null}|null|undefined;
   if(!p)return; if(p.onboardingCompletedAt){router.replace("/dashboard");return;}
   setForm(current=>({...current,...Object.fromEntries(Object.keys(initial).map(k=>[k,(p as any)[k]??(current as any)[k]]))}));
 }).finally(()=>setLoading(false))},[router]);

 function set(key:string,value:any){setForm(current=>({...current,[key]:value}));}
 function toggle(key:"secondaryObjectives"|"contentPreferences",value:string){
   setForm(current=>({...current,[key]:current[key].includes(value)?current[key].filter((x:string)=>x!==value):[...current[key],value]}));
 }
 function validate(){
   if(step===0 && (!form.instagramProfileUrl||!form.businessType||!form.niche||!form.offer)) return "Preencha seu Instagram, tipo de negócio, nicho e o que você oferece.";
   if(step===1 && (!form.audience||!form.objective)) return "Informe quem você quer atrair e escolha seu objetivo principal.";
   if(step===2 && (!form.contentPreferences.length||!form.postingFrequency)) return "Escolha pelo menos um tipo de conteúdo e uma frequência que você consegue manter.";
   return "";
 }
 function next(){const m=validate();if(m){setError(m);return;}setError("");setStep(s=>Math.min(3,s+1));}
 async function finish(){
   setError(""); const m=validate(); if(m){setError(m);setStep(2);return;} setSaving(true);
   try{const response=await fetch("/api/profile",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
   const data=await response.json(); if(!response.ok){setError(data.error||"Não foi possível salvar.");return;} router.replace("/dashboard");
   }catch{setError("Não foi possível conectar ao servidor.");}finally{setSaving(false);}
 }
 if(loading)return <main className="auth"><div className="authbox"><p className="muted">Preparando seu diagnóstico...</p></div></main>;

 const check=(value:string)=><button type="button" className={form.contentPreferences.includes(value)?"btn primary":"btn secondary"} onClick={()=>toggle("contentPreferences",value)} style={{margin:"4px"}}>{value}</button>;

 return <main className="auth"><div className="authbox" style={{width:"min(820px,100%)"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center"}}>
    <div><div className="logo">MidiaNet<span>AI</span></div><h1 style={{marginBottom:8}}>Vamos direto ao ponto.</h1>
    <p className="muted">São só 4 etapas. Responda o essencial e a IA organiza o restante.</p></div><strong>{step+1}/{steps.length}</strong>
   </div>
   <div style={{height:8,background:"#27272a",borderRadius:99,margin:"24px 0"}}><div style={{height:"100%",width:((step+1)/steps.length*100)+"%",background:"linear-gradient(90deg,#a855f7,#ec4899)",borderRadius:99}}/></div>
   <div className="badge">{steps[step]}</div>

   {step===0&&<>
    <Field label="Seu Instagram" value={form.instagramProfileUrl} onChange={(v:string)=>set("instagramProfileUrl",v)} placeholder="@seuperfil ou link do Instagram"/>
    <div className="grid2">
      <Field label="Tipo de negócio" value={form.businessType} onChange={(v:string)=>set("businessType",v)} placeholder="Loja, serviço, criador, afiliado..."/>
      <Field label="Nicho" value={form.niche} onChange={(v:string)=>set("niche",v)} placeholder="Ex.: estética, moda, marketing..."/>
    </div>
    <Field label="O que você vende ou oferece?" value={form.offer} onChange={(v:string)=>set("offer",v)} placeholder="Produto, serviço, conteúdo ou oferta principal." textarea/>
    <Field label="Conte rapidamente sobre você ou sua marca" value={form.profileDescription} onChange={(v:string)=>set("profileDescription",v)} placeholder="Ex.: sou barbeiro há 8 anos e quero atrair clientes da minha cidade." textarea optional/>
    <div className="grid2">
      <Field label="Cidade/região" value={form.location} onChange={(v:string)=>set("location",v)} placeholder="Ex.: Rio de Janeiro" optional/>
      <Field label="O que diferencia você?" value={form.differentiators} onChange={(v:string)=>set("differentiators",v)} placeholder="Método, experiência, produto, história..." optional/>
    </div>
   </>}

   {step===1&&<>
    <Field label="Quem você quer atrair?" value={form.audience} onChange={(v:string)=>set("audience",v)} placeholder="Ex.: mulheres de 25–40 que querem cuidar da pele." textarea/>
    <Field label="Qual o principal problema ou desejo desse público?" value={form.audiencePainPoints} onChange={(v:string)=>set("audiencePainPoints",v)} placeholder="O que ele quer resolver, conquistar ou comprar?" textarea optional/>
    <h3 style={{marginTop:18}}>Qual é seu principal objetivo?</h3>
    <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0 8px"}}>
      {["Crescer seguidores","Aumentar alcance","Criar autoridade","Vender produtos","Vender serviços","Conseguir clientes","Gerar leads","Monetizar conteúdo","Construir marca"].map(x=><button type="button" key={x} className={form.objective===x?"btn primary":"btn secondary"} onClick={()=>set("objective",x)}>{x}</button>)}
    </div>
    <Field label="Meta para os próximos 90 dias" value={form.ninetyDayGoal} onChange={(v:string)=>set("ninetyDayGoal",v)} placeholder="Ex.: gerar 30 leads por mês ou fechar 10 clientes." optional/>
   </>}

   {step===2&&<>
    <h3>O que você consegue produzir?</h3>
    <p className="muted" style={{marginTop:6}}>Escolha os formatos que realmente consegue manter.</p>
    <div style={{display:"flex",flexWrap:"wrap",gap:8,margin:"14px 0 20px"}}>
      {["Reels","Stories","Carrossel","Lives","Fotos","Conteúdo de venda","Conteúdo de autoridade","Conteúdo de comunidade"].map(check)}
    </div>
    <div className="grid3">
      <Field label="Frequência" value={form.postingFrequency} onChange={(v:string)=>set("postingFrequency",v)} placeholder="Ex.: 4 posts + Stories"/>
      <Field label="Minutos por dia" value={String(form.availableMinutesPerDay)} onChange={(v:string)=>set("availableMinutesPerDay",Number(v)||0)} placeholder="60"/>
      <Field label="Dias por semana" value={String(form.availableDaysPerWeek)} onChange={(v:string)=>set("availableDaysPerWeek",Number(v)||0)} placeholder="5"/>
    </div>
    <div className="grid2">
      <Field label="Como você quer gerar vendas?" value={form.conversionGoal} onChange={(v:string)=>set("conversionGoal",v)} placeholder="WhatsApp, DM, site, checkout..." optional/>
      <Field label="Como monetiza hoje?" value={form.monetization} onChange={(v:string)=>set("monetization",v)} placeholder="Produto, serviço, afiliado..." optional/>
    </div>
    <Field label="Alguma coisa que você não quer fazer?" value={form.contentAvoid} onChange={(v:string)=>set("contentAvoid",v)} placeholder="Ex.: não quero aparecer em vídeo." optional/>
   </>}

   {step===3&&<>
    <h2>Está tudo certo?</h2><p className="muted">A IA vai usar essas respostas, seu Instagram público quando disponível e os resultados do perfil para montar a estratégia.</p>
    <div className="feature" style={{marginTop:18}}>
      <strong>@{form.instagramProfileUrl.replace(/^.*instagram\.com\//,"").replace(/^@/,"").replace(/\/$/,"")}</strong>
      <p style={{marginTop:8}}>{form.businessType} · {form.niche}</p>
      <p style={{marginTop:8}}><strong>Oferta:</strong> {form.offer}</p>
      <p style={{marginTop:8}}><strong>Público:</strong> {form.audience}</p>
      <p style={{marginTop:8}}><strong>Objetivo:</strong> {form.objective}</p>
      <p style={{marginTop:8}}><strong>Conteúdo:</strong> {form.contentPreferences.join(", ")}</p>
      <p style={{marginTop:8}}><strong>Frequência:</strong> {form.postingFrequency}</p>
    </div>
    <div className="feature" style={{marginTop:14}}><h3>🧠 Depois disso</h3><p>A IA transforma essas informações em auditoria do perfil, diagnóstico, posicionamento, estratégia, plano semanal e próximos conteúdos.</p></div>
   </>}

   {error&&<p className="small" style={{color:"#fda4af",marginTop:16}}>{error}</p>}
   <div style={{display:"flex",justifyContent:"space-between",gap:12,marginTop:24}}>
    <button className="btn secondary" onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}>Voltar</button>
    {step<3?<button className="btn primary" onClick={next}>Continuar →</button>:<button className="btn primary" onClick={finish} disabled={saving}>{saving?"Salvando...":"🚀 Criar minha estratégia"}</button>}
   </div>
 </div></main>;
}
