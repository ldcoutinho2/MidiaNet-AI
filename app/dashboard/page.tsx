"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Slot = { time:string; format:string; role:string; objective:string; title:string; topic:string; hook:string; script:string; caption:string; visualDirection:string; cta:string; executionSteps:string[] };
type Draft = { id:string; slotKey:string|null; status:"IDEA"|"DRAFT"|"APPROVED"|"SCHEDULED"|"PUBLISHED"; dayLabel:string|null; timeLabel:string|null; title:string; approvedAt?:string|null; publishedAt?:string|null };
type DayPlan = { day:string; mission:string; slots:Slot[] };
type AuditItem = {score:number;diagnosis:string;recommendation:string};
type ProfileAudit = { overallScore:number; summary:string; firstImpression:string; bio:AuditItem&{impact:string;suggestedBio:string}; profilePhoto:AuditItem; nameAndPositioning:AuditItem; highlights:AuditItem; grid:AuditItem; postingFrequency:AuditItem; conversion:AuditItem&{ctaSuggestion:string}; priorities:string[]; limitations:string[] };
type AIProfile = { objective:string; currentStage:string; diagnosis:string; mainProblem:string; strategy:string; weeklyMission:string; nextAction:string; postingFrequency:string; postingFrequencyReason:string; weeklyContentCount:number; dailyContentCount:string; positioning:string; audience:string; conversionStrategy:string; contentPillars:string[]; tone:string[]; strengths:string[]; opportunities:string[]; thirtyDayPlan:{phase:string;focus:string;action:string;expectedSignal:string}[]; weeklyPlan:DayPlan[]; profileAudit?:ProfileAudit };
type Profile = Record<string,any> & { aiProfile?:AIProfile|null; aiAnalyzedAt?:string|null };
type Me = { user:{name:string|null;email:string;phone?:string|null;strategicProfile:Profile|null;subscription?:any|null;socialAccounts?:{id:string;platform:string;username:string|null;fullName?:string|null;biography?:string|null;website?:string|null;profilePictureUrl?:string|null;followersCount?:number|null;followsCount?:number|null;mediaCount?:number|null;lastSyncedAt?:string|null;connectedAt:string}[]} };

const tabs=[
  ["home","Hoje","⌂"],["week","Semana","▦"],["diagnostic","Diagnóstico","◉"],["results","Resultados","↗"],["account","Conta","●"]
] as const;
const fmtIcon:Record<string,string>={Story:"⚡",Foto:"📸",Post:"📸",Reel:"🎬",Vídeo:"🎬",Carrossel:"📚"};

export default function Dashboard(){
 const router=useRouter();
 const [data,setData]=useState<Me|null>(null);
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [loading,setLoading]=useState(true);
 const [tab,setTab]=useState("home");
 const [analyzing,setAnalyzing]=useState(false);
 const [error,setError]=useState("");

 useEffect(()=>{
   fetch("/api/auth/me").then(async r=>{
     if(!r.ok){router.replace("/login");return null}
     return r.json()
   }).then(x=>{
     if(x){
       if(!x.user.strategicProfile?.onboardingCompletedAt){router.replace("/setup");return}
       setData(x);
       fetch("/api/content-drafts").then(r=>r.ok?r.json():null).then(v=>{if(v?.drafts)setDrafts(v.drafts)}).catch(()=>{})
     }
   }).finally(()=>setLoading(false))
 },[router]);

 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/")}

 async function analyze(){
   setAnalyzing(true);setError("");
   try{
     const r=await fetch("/api/ai/analyze-profile",{method:"POST"});
     const x=await r.json();
     if(!r.ok){setError(x.error||"Não foi possível montar sua estratégia.");return}
     setData(d=>d?.user.strategicProfile?{...d,user:{...d.user,strategicProfile:{...d.user.strategicProfile,aiProfile:x.aiProfile,aiAnalyzedAt:x.aiAnalyzedAt}}}:d);
     await fetch("/api/content-drafts/sync",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({weeklyPlan:x.aiProfile.weeklyPlan})});
     const draftsResponse=await fetch("/api/content-drafts");
     if(draftsResponse.ok){const v=await draftsResponse.json();if(v?.drafts)setDrafts(v.drafts)}
     setTab("home")
   }catch{setError("Não foi possível conectar à IA.")}finally{setAnalyzing(false)}
 }

 async function auditProfile(){
   setAnalyzing(true);setError("");
   try{
     const r=await fetch("/api/ai/audit-profile",{method:"POST"});
     const text=await r.text();let x:any={};try{x=text?JSON.parse(text):{}}catch{}
     if(!r.ok){setError(x.error||`A auditoria falhou (HTTP ${r.status}).`);return}
     setData((d:any)=>d?.user.strategicProfile?{...d,user:{...d.user,strategicProfile:{...d.user.strategicProfile,aiProfile:{...(d.user.strategicProfile.aiProfile||{}),profileAudit:x.profileAudit},aiAnalyzedAt:x.aiAnalyzedAt}}}:d)
   }catch(e){setError(e instanceof Error?e.message:"Não foi possível atualizar a auditoria.")}finally{setAnalyzing(false)}
 }

 if(loading)return <main className="auth"><div className="authbox"><p className="muted">Carregando seu painel...</p></div></main>;
 if(!data)return null;
 const p=data.user.strategicProfile!;
 const raw=p.aiProfile;
 const ai=isCurrentStrategy(raw)?raw:null;
 let panel:ReactNode;
 if(!ai) panel=<SetupStrategy analyzing={analyzing} analyze={analyze} hasOldStrategy={Boolean(raw)}/>;
 else if(tab==="home") panel=<Home ai={ai} onWeek={()=>setTab("week")}/>;
 else if(tab==="week") panel=<Week ai={ai} drafts={drafts} onDraftChange={(d)=>setDrafts(v=>v.some(x=>x.id===d.id)?v.map(x=>x.id===d.id?d:x):[...v,d])}/>;
 else if(tab==="diagnostic") panel=<Diagnostic ai={ai} onAnalyze={auditProfile} analyzing={analyzing}/>;
 else if(tab==="results") panel=<Results profile={p}/>;
 else if(tab==="create") panel=<Create/>;
 else panel=<Account user={data.user} profile={p} router={router}/>;

 return <main className="page dashboardPage">
   <nav className="nav dashboardNav">
     <div className="logo">MidiaNet<span>AI</span></div>
     <div className="dashboardTopActions">
       <span className="small muted">{data.user.subscription?.status==="TRIALING"?"🧪 Teste ativo":"✓ Plano ativo"}</span>
       <button className="muted logoutButton" onClick={logout}>Sair</button>
     </div>
   </nav>
   <section className="section dashboardSection">
     <div className="instagramStrip">
       <div className="igAvatar" style={{overflow:"hidden"}}>
         {data.user.socialAccounts?.[0]?.profilePictureUrl?<img src={data.user.socialAccounts[0].profilePictureUrl} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}}/>:"◎"}
       </div>
       <div style={{flex:1,minWidth:0}}>
         <strong>{data.user.socialAccounts?.[0]?.username ? "@"+data.user.socialAccounts[0].username : p.instagramProfileUrl || "Seu Instagram"}</strong>
         <div className="small muted">{data.user.socialAccounts?.length?"Conta conectada":"Perfil ainda não conectado"}</div>
       </div>
     </div>
     {error&&<p className="small dashboardError">{error}</p>}
     <div className="dashboardPanel">{panel}</div>
   </section>

   <button className="newIdeaFloat" onClick={()=>setTab("create")} aria-label="Nova ideia"><span>＋</span> Nova ideia</button>

   <nav className="bottomNav" aria-label="Navegação principal">
     {tabs.map(([id,label,icon])=><button key={id} className={tab===id?"active":""} onClick={()=>setTab(id)}><span className="bottomIcon">{icon}</span><span>{label}</span></button>)}
   </nav>
 </main>;
}

function isCurrentStrategy(v:any):v is AIProfile{
 return Boolean(v&&typeof v==="object"&&typeof v.objective==="string"&&Array.isArray(v.weeklyPlan)&&v.weeklyPlan.length>=2&&v.weeklyPlan.length<=7&&v.weeklyPlan.every((d:any)=>d&&Array.isArray(d.slots)&&d.slots.length>=1&&d.slots.length<=4));
}
function SetupStrategy({analyzing,analyze,hasOldStrategy}:{analyzing:boolean;analyze:()=>void;hasOldStrategy:boolean}){return <div className="feature" style={{marginTop:24}}><div className="badge">{hasOldStrategy?"Atualização":"1º passo"}</div><h2 style={{marginTop:12}}>{hasOldStrategy?"Sua estratégia ganhou a nova programação.":"Vamos transformar seu perfil em um plano."}</h2><p className="muted" style={{marginTop:8,maxWidth:760}}>A IA vai montar diagnóstico, estratégia, semana completa e conteúdos prontos para você executar — 1 Story + 3 publicações principais por dia.</p><button className="btn primary" onClick={analyze} disabled={analyzing} style={{marginTop:18}}>{analyzing?"Analisando seu perfil...":hasOldStrategy?"Atualizar minha estratégia →":"Montar minha estratégia →"}</button></div>}
function Home({ai,name,drafts,onWeek}:{ai:AIProfile;name:string;drafts:Draft[];onWeek:()=>void}){
 const dayIndex=Math.min(Math.max((new Date().getDay()+6)%7,0),(ai.weeklyPlan?.length||1)-1);
 const today=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 const actions=today?.slots||[];
 const score=ai.profileAudit?.overallScore;
 const completedDays=new Set(drafts.filter(d=>d.status==="PUBLISHED"&&d.slotKey).map(d=>String(d.slotKey).split(":")[0])).size;
 const progress=Math.min(100,Math.round((completedDays/7)*100));
 return <div className="todayPage">
   <div className="todayHeader">
     <div><div className="badge">HOJE</div><h1>Olá, {name} 👋</h1><p className="muted">Você não precisa decidir o que postar. Seu próximo passo está aqui.</p></div>
     <div className="scoreMini"><small>Nota do perfil</small><strong>{score??"—"}<span>/100</span></strong><div className="scoreTrack"><i style={{width:`${Math.max(0,Math.min(score||0,100))}%`}}/></div></div>
   </div>
   <div className="feature todayMainCard">
     <div className="row-between"><div><div className="badge">🚀 O QUE FAZER HOJE</div><h2 style={{marginTop:10}}>{today?.day||"Hoje"}</h2></div><span className="small muted">{actions.length} conteúdo{actions.length===1?"":"s"} hoje</span></div>
     <p className="muted" style={{marginTop:6}}>{today?.mission||"Siga o conteúdo recomendado para hoje."}</p>
     <div className="todayContentList">{actions.map((s,i)=>{const draft=drafts.find(d=>d.slotKey===`${dayIndex}:${i}`);const posted=draft?.status==="PUBLISHED";return <button className="todayContentItem" key={i} onClick={onWeek}><span className="todayTime">{s.time}</span><span className="todayFormat">{fmtIcon[s.format]||"✨"} {s.format}</span><strong>{s.title}</strong><span className="todayArrow">{posted?"✓":"→"}</span></button>})}</div>
     <button className="btn primary full" style={{marginTop:12}} onClick={onWeek}>Abrir conteúdo de hoje →</button>
   </div>
   <div className="weekProgressCard feature"><div className="row-between"><strong>📅 Progresso da semana</strong><span>{completedDays} de 7 dias concluídos</span></div><div className="weekTrack"><i style={{width:`${progress}%`}}/></div><p className="small muted" style={{marginTop:7}}>Marque os conteúdos como postados dentro de cada publicação.</p></div>
   <div className="feature quickFix"><div className="badge">🛠️ Corrija em 5 minutos</div><h2 style={{marginTop:10}}>Comece por estas 3 correções</h2><div className="quickFixList">{(ai.profileAudit?.priorities||["Revise sua bio","Deixe seu CTA mais claro","Escolha um tema principal para a semana"]).slice(0,3).map((x,i)=><div className="card" key={i}><b>{i+1}.</b> {x}</div>)}</div></div>
 </div>
}
function Week({ai,drafts,onDraftChange}:{ai:AIProfile;drafts:Draft[];onDraftChange:(d:Draft)=>void}){
 const [selected,setSelected]=useState<{slot:Slot;day:string;draft?:Draft}|null>(null);
 const [dayIndex,setDayIndex]=useState(0);
 const day=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 return <div style={{marginTop:8}}>
   <div className="feature weekTop"><div className="badge">SEMANA</div><h2 style={{marginTop:10}}>Sua semana pronta</h2><p className="muted" style={{marginTop:6}}>Escolha o dia e abra qualquer conteúdo para copiar, ajustar e marcar como postado.</p><div className="small muted" style={{marginTop:10}}>Ritmo atual: {ai.dailyContentCount||"2 conteúdos por dia"}</div></div>
   <div className="dayTabs">{ai.weeklyPlan.map((d,i)=><button key={i} className={i===dayIndex?"active":""} onClick={()=>setDayIndex(i)}>{d.day.slice(0,3)}</button>)}</div>
   {day&&<div className="feature" style={{marginTop:10}}><div className="row-between"><div><div className="badge">{day.day}</div><p className="muted" style={{marginTop:7}}>{day.mission}</p></div><span className="small muted">{day.slots.length} conteúdo{day.slots.length===1?"":"s"}</span></div><div style={{display:"grid",gap:9,marginTop:14}}>{day.slots.map((slot,j)=>{const draft=drafts.find(d=>d.slotKey===`${dayIndex}:${j}`);return <button key={j} onClick={()=>setSelected({slot,day:day.day,draft})} className="contentRow"><div style={{minWidth:0}}><strong>{fmtIcon[slot.format]||"✨"} {slot.time} · {slot.format}</strong><div style={{marginTop:5}}>{slot.title}</div><div className="small muted" style={{marginTop:4}}>{slot.objective}</div>{draft&&<div className="small" style={{marginTop:6}}>{draft.status==="PUBLISHED"?"✅ Publicado":draft.status==="APPROVED"?"🟢 Aprovado":draft.status==="SCHEDULED"?"🗓️ Agendado":draft.status==="DRAFT"?"✏️ Rascunho":"💡 Ideia"}</div>}</div><span>→</span></button>})}</div></div>}
   {selected&&<ContentWorkspace slot={selected.slot} day={selected.day} draft={selected.draft} onDraftChange={onDraftChange} onClose={()=>setSelected(null)}/>}
 </div>
}
function Audit({audit,onAnalyze,analyzing}:{audit?:ProfileAudit;onAnalyze:()=>void;analyzing:boolean}){
 if(!audit) return <div className="feature" style={{marginTop:22}}><div className="badge">🔍 Auditoria do perfil</div><h2 style={{marginTop:12}}>Vamos analisar seu Instagram.</h2><p className="muted" style={{marginTop:8}}>A análise usa os dados sincronizados do perfil e os conteúdos públicos disponíveis.</p><button className="btn primary" style={{marginTop:16}} onClick={onAnalyze} disabled={analyzing}>{analyzing?"Analisando perfil...":"🔍 Fazer auditoria agora"}</button></div>;
 const items=[
   ["Nome e @",audit.nameAndPositioning],
   ["Foto de perfil",audit.profilePhoto],
   ["Bio",audit.bio],
   ["Destaques",audit.highlights],
   ["Grade / feed",audit.grid],
   ["Frequência",audit.postingFrequency],
   ["Conversão",audit.conversion]
 ] as const;
 const scoreClass=(score:number)=>score>=70?"good":score>=45?"warn":"bad";
 return <div style={{marginTop:8}}>
   <div className="evolutionHero"><div><div className="badge">🔍 DIAGNÓSTICO</div><h2 style={{marginTop:12}}>Como seu perfil está sendo percebido?</h2><p style={{marginTop:7}}>{audit.summary}</p><p className="small muted" style={{marginTop:8}}>A nota é uma referência baseada nos dados disponíveis, não uma verdade objetiva.</p></div><div className="auditScoreHero"><small>NOTA GERAL</small><strong>{audit.overallScore}<span>/100</span></strong><button className="btn primary" style={{marginTop:10}} onClick={onAnalyze} disabled={analyzing}>{analyzing?"Atualizando...":"↻ Atualizar"}</button></div></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">👀 PRIMEIRA IMPRESSÃO</div><p style={{marginTop:10,lineHeight:1.6}}>{audit.firstImpression}</p></div>
   <div className="auditGrid">{items.map(([title,item])=><div className="feature auditItem" key={title}><div className="row-between"><div className="badge">{title}</div><span className={`auditScore ${scoreClass(item.score)}`}>{item.score}/100</span></div><h3 style={{marginTop:12}}>{item.diagnosis}</h3>{"impact" in item&&item.impact&&<p className="small muted" style={{marginTop:7}}><strong>Por que importa:</strong> {item.impact}</p>}<p style={{marginTop:9}}><strong>Como corrigir:</strong> {item.recommendation}</p>{"ctaSuggestion" in item&&item.ctaSuggestion&&<div className="card" style={{marginTop:10}}><small className="muted">CTA SUGERIDO</small><p style={{marginTop:5}}>{item.ctaSuggestion}</p></div>}</div>)}</div>
   <div className="feature" style={{marginTop:14}}><div className="badge">✨ VERSÃO PRONTA</div><h2 style={{marginTop:10}}>Bio sugerida</h2><div className="card" style={{marginTop:10,whiteSpace:"pre-line",lineHeight:1.6}}>{audit.bio.suggestedBio}</div><button className="btn secondary" style={{marginTop:10}} onClick={()=>navigator.clipboard?.writeText(audit.bio.suggestedBio)}>Copiar bio</button></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">🛠️ CORRIJA EM 5 MINUTOS</div><div style={{display:"grid",gap:8,marginTop:12}}>{audit.priorities.slice(0,3).map((x,i)=><div className="card" key={i}><b>{i+1}.</b> {x}</div>)}</div></div>
   {audit.limitations?.length>0&&<p className="small muted" style={{marginTop:12}}>ℹ️ {audit.limitations.join(" ")}</p>}
 </div>
}
}