"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Slot = { time:string; format:string; role:string; objective:string; title:string; topic:string; hook:string; script:string; caption:string; visualDirection:string; cta:string; executionSteps:string[] };
type Draft = { id:string; slotKey:string|null; status:"IDEA"|"DRAFT"|"APPROVED"|"SCHEDULED"|"PUBLISHED"; dayLabel:string|null; timeLabel:string|null; title:string; approvedAt?:string|null; publishedAt?:string|null };
type DayPlan = { day:string; mission:string; slots:Slot[] };
type ProfileAudit = { overallScore:number; summary:string; firstImpression:string; bio:{diagnosis:string;impact:string;recommendation:string;suggestedBio:string}; profilePhoto:{diagnosis:string;recommendation:string}; nameAndPositioning:{diagnosis:string;recommendation:string}; highlights:{diagnosis:string;recommendation:string}; grid:{diagnosis:string;recommendation:string}; conversion:{diagnosis:string;recommendation:string;ctaSuggestion:string}; priorities:string[]; limitations:string[] };
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
function Home({ai,onWeek}:{ai:AIProfile;onWeek:()=>void}){
 const dayIndex=Math.min(Math.max((new Date().getDay()+6)%7,0),(ai.weeklyPlan?.length||1)-1);
 const today=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 const actions=today?.slots||[];
 const score=ai.profileAudit?.overallScore;
 const published=0;
 return <div className="todayPage">
   <div className="todayHeader">
     <div><div className="badge">HOJE</div><h1>Olá, {ai.objective? "criador":"criador"} 👋</h1><p className="muted">Seu próximo passo está aqui. Não precisa decidir o que postar.</p></div>
     <div className="scoreMini"><small>Nota do perfil</small><strong>{score??"—"}<span>/100</span></strong><div className="scoreTrack"><i style={{width:`${Math.max(0,Math.min(score||0,100))}%`}}/></div></div>
   </div>
   <div className="feature todayMainCard">
     <div className="row-between"><div><div className="badge">🚀 O QUE FAZER HOJE</div><h2 style={{marginTop:10}}>{today?.day||"Hoje"}</h2></div><span className="small muted">{actions.length} conteúdo{actions.length===1?"":"s"} hoje</span></div>
     <p className="muted" style={{marginTop:6}}>{today?.mission||"Siga o conteúdo recomendado para hoje."}</p>
     <div className="todayContentList">{actions.map((s,i)=><button className="todayContentItem" key={i} onClick={onWeek}><span className="todayTime">{s.time}</span><span className="todayFormat">{fmtIcon[s.format]||"✨"} {s.format}</span><strong>{s.title}</strong><span className="todayArrow">→</span></button>)}</div>
     <button className="btn primary full" style={{marginTop:12}} onClick={onWeek}>Abrir conteúdo de hoje →</button>
   </div>
   <div className="weekProgressCard feature"><div className="row-between"><strong>📅 Progresso da semana</strong><span>0 de 7 dias concluídos</span></div><div className="weekTrack"><i style={{width:"0%"}}/></div><p className="small muted" style={{marginTop:7}}>Marque os conteúdos como postados para acompanhar seu ritmo.</p></div>
   <div className="feature quickFix"><div className="badge">🛠️ Corrija em 5 minutos</div><h2 style={{marginTop:10}}>Comece por estas correções</h2><div className="quickFixList">{(ai.profileAudit?.priorities||["Revise sua bio","Deixe seu CTA mais claro","Escolha um tema principal para a semana"]).slice(0,3).map((x,i)=><div className="card" key={i}><b>{i+1}.</b> {x}</div>)}</div></div>
 </div>
}
function Audit({audit,onAnalyze,analyzing}:{audit?:ProfileAudit;onAnalyze:()=>void;analyzing:boolean}){
 if(!audit) return <div className="feature" style={{marginTop:22}}><div className="badge">🔍 Auditoria do perfil</div><h2 style={{marginTop:12}}>Vamos analisar a primeira impressão do seu Instagram.</h2><p className="muted" style={{marginTop:8}}>A IA vai revisar posicionamento, nome, bio, foto, destaques, grade e conversão usando as informações disponíveis.</p><button className="btn primary" style={{marginTop:16}} onClick={onAnalyze} disabled={analyzing}>{analyzing?"Analisando perfil...":"🔍 Fazer auditoria agora"}</button></div>;
 const items=[
  ["✍️ Bio",audit.bio.diagnosis,audit.bio.impact,audit.bio.recommendation],
  ["🖼️ Foto de perfil",audit.profilePhoto.diagnosis,"",audit.profilePhoto.recommendation],
  ["🎯 Nome e posicionamento",audit.nameAndPositioning.diagnosis,"",audit.nameAndPositioning.recommendation],
  ["📌 Destaques",audit.highlights.diagnosis,"",audit.highlights.recommendation],
  ["🧱 Grade",audit.grid.diagnosis,"",audit.grid.recommendation],
  ["💰 Conversão",audit.conversion.diagnosis,"",audit.conversion.recommendation]
 ];
 return <div style={{marginTop:22}}>
  <div className="evolutionHero"><div><div className="badge">🔍 Auditoria do perfil</div><h2 style={{marginTop:12}}>Como seu perfil está sendo percebido?</h2><p style={{marginTop:7}}>{audit.summary}</p><p className="small muted" style={{marginTop:8}}>Esta análise usa os dados públicos e imagens disponíveis no momento da última análise.</p></div><div style={{textAlign:"center"}}><div className="small muted">Referência da análise</div><strong style={{fontSize:42}}>{audit.overallScore}<span style={{fontSize:16}}>/100</span></strong><button className="btn primary" style={{marginTop:10}} onClick={onAnalyze} disabled={analyzing}>{analyzing?"Atualizando...":"↻ Atualizar auditoria"}</button></div></div>
  <div className="feature" style={{marginTop:18}}><div className="badge">👀 Primeira impressão</div><h2 style={{marginTop:10}}>O que um visitante entende</h2><p style={{marginTop:8,lineHeight:1.65}}>{audit.firstImpression}</p></div>
  <div className="grid2" style={{marginTop:18}}>{items.map(([title,diagnosis,impact,recommendation])=><div className="feature" key={title}><div className="badge">{title}</div><h3 style={{marginTop:10}}>{diagnosis}</h3>{impact&&<p className="small muted" style={{marginTop:8}}><strong>Impacto:</strong> {impact}</p>}<p style={{marginTop:10}}><strong>→ O que mudar:</strong> {recommendation}</p></div>)}</div>
  <div className="feature" style={{marginTop:18}}><div className="badge">✨ Bio sugerida</div><h2 style={{marginTop:10}}>Uma versão mais clara</h2><div className="card" style={{marginTop:12,whiteSpace:"pre-line",lineHeight:1.6}}>{audit.bio.suggestedBio}</div></div>
  <div className="feature" style={{marginTop:18}}><div className="badge">🚀 Ordem de correção</div><h2 style={{marginTop:10}}>Comece por aqui</h2><ol style={{marginTop:12,paddingLeft:22,lineHeight:1.8}}>{audit.priorities.map((x,i)=><li key={i}>{x}</li>)}</ol></div>
  {audit.limitations?.length>0&&<p className="small muted" style={{marginTop:14}}>ℹ️ Limitações da análise: {audit.limitations.join(" ")}</p>}
 </div>
}

function Strategy({ai}:{ai:AIProfile}){return <div style={{marginTop:22}}><div className="feature"><div className="badge">🎯 Diagnóstico</div><h2 style={{marginTop:12}}>O perfil hoje</h2><p style={{marginTop:8}}>{ai.diagnosis}</p><p style={{marginTop:14}}><strong>Posicionamento:</strong> {ai.positioning}</p><p style={{marginTop:10}}><strong>Público:</strong> {ai.audience}</p><p style={{marginTop:10}}><strong>Conversão:</strong> {ai.conversionStrategy}</p></div><div className="feature" style={{marginTop:18}}><h2>🗓️ Plano de 30 dias</h2><div className="grid3" style={{marginTop:14}}>{ai.thirtyDayPlan.map((x,i)=><div className="card" key={i}><small>{x.phase}</small><strong style={{display:"block",marginTop:6}}>{x.focus}</strong><p style={{marginTop:8}}>{x.action}</p><p className="small muted" style={{marginTop:8}}>Sinal esperado: {x.expectedSignal}</p></div>)}</div></div></div>}
function Week({ai,drafts,onDraftChange}:{ai:AIProfile;drafts:Draft[];onDraftChange:(d:Draft)=>void}){
 const [selected,setSelected]=useState<{slot:Slot;day:string;draft?:Draft}|null>(null);
 const [dayIndex,setDayIndex]=useState(0);
 const day=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 return <div style={{marginTop:8}}>
   <div className="feature weekTop"><div className="badge">SEMANA</div><h2 style={{marginTop:10}}>Sua semana pronta</h2><p className="muted" style={{marginTop:6}}>Escolha o dia e abra qualquer conteúdo para copiar, ajustar e marcar como postado.</p></div>
   <div className="dayTabs">{ai.weeklyPlan.map((d,i)=><button key={i} className={i===dayIndex?"active":""} onClick={()=>setDayIndex(i)}>{d.day.slice(0,3)}</button>)}</div>
   {day&&<div className="feature" style={{marginTop:10}}><div className="row-between"><div><div className="badge">{day.day}</div><p className="muted" style={{marginTop:7}}>{day.mission}</p></div><span className="small muted">{day.slots.length} conteúdo{day.slots.length===1?"":"s"}</span></div><div style={{display:"grid",gap:9,marginTop:14}}>{day.slots.map((slot,j)=>{const draft=drafts.find(d=>d.slotKey===`${dayIndex}:${j}`);return <button key={j} onClick={()=>setSelected({slot,day:day.day,draft})} className="contentRow"><div style={{minWidth:0}}><strong>{fmtIcon[slot.format]||"✨"} {slot.time} · {slot.format}</strong><div style={{marginTop:5}}>{slot.title}</div><div className="small muted" style={{marginTop:4}}>{slot.objective}</div>{draft&&<div className="small" style={{marginTop:6}}>{draft.status==="PUBLISHED"?"✅ Publicado":draft.status==="APPROVED"?"🟢 Aprovado":draft.status==="SCHEDULED"?"🗓️ Agendado":draft.status==="DRAFT"?"✏️ Rascunho":"💡 Ideia"}</div>}</div><span>→</span></button>})}</div></div>}
   {selected&&<ContentWorkspace slot={selected.slot} day={selected.day} draft={selected.draft} onDraftChange={onDraftChange} onClose={()=>setSelected(null)}/>}
 </div>
}
function MiniSlot({slot}:{slot:Slot}){return <div className="card2"><strong>{fmtIcon[slot.format]||"✨"} {slot.time} · {slot.format}</strong><div style={{marginTop:6}}>{slot.title}</div><div className="small muted" style={{marginTop:5}}>{slot.role}</div></div>}
function ContentWorkspace({slot:initialSlot,day,draft,onDraftChange,onClose}:{slot:Slot;day:string;draft?:Draft;onDraftChange:(d:Draft)=>void;onClose:()=>void}){const [slot,setSlot]=useState(initialSlot);const [instruction,setInstruction]=useState("");const [busy,setBusy]=useState(false);const [image,setImage]=useState("");const [imageBusy,setImageBusy]=useState(false);const [status,setStatus]=useState<Draft["status"]>(draft?.status||"IDEA");const [statusBusy,setStatusBusy]=useState(false);const [checked,setChecked]=useState<number[]>([]);
 async function changeStatus(next:Draft["status"]){setStatusBusy(true);try{const r=await fetch("/api/content-drafts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:draft?.id,status:next})});const x=await r.json();if(r.ok&&x.draft){setStatus(x.draft.status);onDraftChange(x.draft)}}finally{setStatusBusy(false)}}
 async function refine(text?:string){const msg=(text||instruction).trim();if(!msg)return;setBusy(true);try{const r=await fetch("/api/ai/refine-content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"refine",idea:{...slot,format:slot.format,title:slot.title},message:msg,history:[],format:slot.format})});const x=await r.json();if(r.ok&&x.result){setSlot(s=>({...s,title:x.result.title||s.title,format:x.result.format||s.format,objective:x.result.objective||s.objective,hook:x.result.hook||s.hook,script:x.result.script||s.script,caption:x.result.caption||s.caption,visualDirection:x.result.visualDirection||s.visualDirection,cta:x.result.cta||s.cta,topic:x.result.angle||s.topic,executionSteps:x.result.executionSteps||s.executionSteps}));setInstruction("")}}finally{setBusy(false)}}
 async function generateImage(){setImageBusy(true);try{const r=await fetch("/api/ai/generate-image",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:"Crie uma imagem para Instagram. Conteúdo: "+slot.title+". Tema: "+slot.topic+". Direção visual: "+slot.visualDirection+". Objetivo: "+slot.objective+". Estilo profissional, vertical 4:5, sem texto ilegível."})});const x=await r.json();if(r.ok)setImage(x.image||"")}finally{setImageBusy(false)}}
 return <div className="modalWrap"><div className="modal"><div className="row-between"><div><div className="badge">{fmtIcon[slot.format]||"✨"} {day} · {slot.time}</div><h2 style={{marginTop:10}}>{slot.title}</h2><p className="muted" style={{marginTop:5}}>{slot.role} · {slot.objective}</p></div><button className="btn secondary" onClick={onClose}>Fechar</button></div><div className="grid2" style={{marginTop:16}}><Detail title="🎯 Objetivo" text={slot.objective}/><Detail title="💡 Ideia/Tema" text={slot.topic}/></div><Detail title="🪝 Gancho" text={slot.hook}/><Detail title={slot.format==="Carrossel"?"📚 Estrutura do carrossel":"🎬 Roteiro"} text={slot.script}/><Detail title="✍️ Legenda pronta" text={slot.caption}/><Detail title="🎥 Como produzir" text={slot.visualDirection}/><Detail title="📣 CTA" text={slot.cta}/>{slot.executionSteps?.length>0&&<div className="card" style={{marginTop:12}}><strong>✅ Checklist</strong>{slot.executionSteps.map((x,i)=><button key={i} onClick={()=>setChecked(v=>v.includes(i)?v.filter(n=>n!==i):[...v,i])} className="checkRow"><span>{checked.includes(i)?"☑":"☐"}</span>{x}</button>)}</div>}{(slot.format==="Foto"||slot.format==="Carrossel")&&<div className="card" style={{marginTop:12}}><strong>✨ Criar com IA</strong><p className="small muted" style={{marginTop:6}}>Você pode produzir sozinho seguindo a orientação acima ou pedir uma referência visual para começar.</p><button className="btn primary" style={{marginTop:10}} onClick={generateImage} disabled={imageBusy}>{imageBusy?"Gerando imagem...":"Gerar imagem com IA"}</button>{image&&<img src={image} alt="Imagem gerada" style={{width:"100%",borderRadius:14,marginTop:12}}/>}</div>}<div className="card" style={{marginTop:12}}><strong>💬 O que você quer melhorar?</strong><div className="row" style={{gap:6,flexWrap:"wrap",margin:"10px 0"}}>{["Deixar mais natural","Mais chamativo","Mais focado em vendas","Quero outra ideia","Tenho outra visão"].map(x=><button key={x} className="pill" onClick={()=>refine(x)}>{x}</button>)}</div><textarea value={instruction} onChange={e=>setInstruction(e.target.value)} placeholder="Ex.: gostei, mas quero trocar o assunto e falar sobre..."/><button className="btn primary" style={{marginTop:10}} onClick={()=>refine()} disabled={busy}>{busy?"Ajustando...":"Melhorar com a IA"}</button></div><div className="card" style={{marginTop:14}}><strong>📌 Status do conteúdo</strong><p className="small muted" style={{marginTop:5}}>Use o status para saber o que já foi preparado e o que ainda precisa ser publicado.</p><div className="row" style={{gap:8,flexWrap:"wrap",marginTop:10}}>{([["IDEA","💡 Ideia"],["DRAFT","✏️ Rascunho"],["APPROVED","🟢 Aprovado"],["SCHEDULED","🗓️ Agendado"],["PUBLISHED","✅ Publicado"]] as const).map(([value,label])=><button key={value} className={status===value?"btn primary":"btn secondary"} disabled={statusBusy||!draft} onClick={()=>changeStatus(value)}>{label}</button>)}</div>{!draft&&<p className="small muted" style={{marginTop:8}}>Atualize sua estratégia para salvar este conteúdo no seu calendário.</p>}</div></div></div>}
function Detail({title,text}:{title:string;text:string}){return <div className="card" style={{marginTop:12}}><strong>{title}</strong><p style={{marginTop:7,whiteSpace:"pre-line",lineHeight:1.55}}>{text||"—"}</p></div>}
function Create(){const [idea,setIdea]=useState("");const [loading,setLoading]=useState(false);const [options,setOptions]=useState<any[]>([]);const [error,setError]=useState("");async function multiply(){if(!idea.trim())return;setLoading(true);setError("");try{const r=await fetch("/api/ai/multiply-idea",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea})});const x=await r.json();if(!r.ok){setError(x.error||"Não foi possível multiplicar a ideia.");return}setOptions(x.options||[])}catch{setError("Não foi possível conectar à IA.")}finally{setLoading(false)}}return <div style={{marginTop:22}}><div className="feature"><div className="badge">✨ Criar</div><h2 style={{marginTop:12}}>Você traz a ideia. A IA encontra os caminhos.</h2><p className="muted" style={{marginTop:7}}>Escreva uma ideia do jeito que vier à cabeça. Não precisa criar prompt.</p><textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Ex.: quero falar sobre os erros que pequenos negócios cometem no Instagram..." style={{marginTop:16,minHeight:120}}/><button className="btn primary" style={{marginTop:12}} onClick={multiply} disabled={loading}>{loading?"Encontrando caminhos...":"🚀 Multiplicar minha ideia"}</button>{error&&<p className="small" style={{color:"#fda4af",marginTop:10}}>{error}</p>}</div>{options.length>0&&<div style={{marginTop:18}}><h2>5 formas de transformar essa ideia</h2><p className="muted" style={{marginTop:6}}>Escolha um caminho, depois refine com a IA até ficar com a sua cara.</p><div style={{display:"grid",gap:12,marginTop:14}}>{options.map((o,i)=><div className="card" key={i}><div className="row-between"><div><span className="badge">{i+1} · {o.format}</span><h3 style={{marginTop:9}}>{o.title}</h3></div><span className="small muted">{o.angle}</span></div><p style={{marginTop:9}}><strong>🪝 {o.hook}</strong></p><p className="small muted" style={{marginTop:7}}>{o.objective}</p><button className="btn secondary" style={{marginTop:10}} onClick={()=>{setIdea(o.title+" — "+o.hook);setOptions([])}}>Usar esta ideia</button></div>)}</div></div>}</div>}
function Plans({subscription}:{subscription:any}) {
 const router=useRouter();
 const end=subscription?.currentPeriodEnd?new Date(subscription.currentPeriodEnd):null;
 const trialEnd=subscription?.trialEndsAt?new Date(subscription.trialEndsAt):null;
 const days=trialEnd?Math.max(0,Math.ceil((trialEnd.getTime()-Date.now())/86400000)):0;
 return <div style={{marginTop:22}}>
  <div className="feature">
   <div className="badge">💳 Seu acesso</div>
   <h2 style={{marginTop:12}}>{subscription?.status==="TRIALING"?"Teste gratuito ativo":"Planos MidiaNet AI"}</h2>
   <p className="muted" style={{marginTop:7}}>{subscription?.status==="TRIALING"?`Você tem ${days} dia(s) restante(s) no teste.`:end?`Plano ${subscription?.plan||""} ativo até ${end.toLocaleDateString("pt-BR")}.`:"Escolha um plano para continuar usando o MidiaNet AI."}</p>
   <div className="grid2" style={{marginTop:18}}>
    <div className="card">
      <div className="badge">SEMANAL</div><h2 style={{marginTop:8}}>R$ 14,99</h2>
      <p className="small muted" style={{marginTop:6}}>7 dias de acesso completo.</p>
      <p className="small" style={{marginTop:10}}>✓ Estratégia com IA<br/>✓ Auditoria do Instagram<br/>✓ Conteúdos e ajustes com IA<br/>✓ Evolução e métricas</p>
      <button className="btn primary" style={{marginTop:14,width:"100%"}} onClick={()=>router.push("/checkout?plan=weekly")}>Pagar R$ 14,99 →</button>
    </div>
    <div className="card">
      <div className="badge">MENSAL</div><h2 style={{marginTop:8}}>R$ 29,99</h2>
      <p className="small muted" style={{marginTop:6}}>30 dias de acesso completo.</p>
      <p className="small" style={{marginTop:10}}>✓ Estratégia com IA<br/>✓ Auditoria do Instagram<br/>✓ Conteúdos e ajustes com IA<br/>✓ Evolução e métricas</p>
      <button className="btn primary" style={{marginTop:14,width:"100%"}} onClick={()=>router.push("/checkout?plan=monthly")}>Pagar R$ 29,99 →</button>
    </div>
   </div>
   <div className="card" style={{marginTop:14}}>
    <strong>🔒 Pagamento seguro</strong>
    <p className="small muted" style={{marginTop:6}}>Você será levado para um checkout próprio do MidiaNet AI. O Pix é processado pelo Mercado Pago e a confirmação ativa seu acesso automaticamente.</p>
   </div>
  </div>
 </div>;
}
function Results({profile}:{profile:Profile}){
 const [data,setData]=useState<any>(null); const [business,setBusiness]=useState<any>(null);
 const [form,setForm]=useState({instagramDms:"",instagramLeads:"",instagramSales:"",whatsappConversations:"",whatsappLeads:"",whatsappSales:"",salesCount:"",revenue:""});
 const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false); const [syncing,setSyncing]=useState(false); const [syncError,setSyncError]=useState("");
 async function load(){const [a,b]=await Promise.all([fetch("/api/metrics/summary").then(r=>r.json()),fetch("/api/metrics/business").then(r=>r.json())]);setData(a);setBusiness(b)}
 useEffect(()=>{load()},[]);
 const latest=data?.latest, previous=data?.previous; const delta=(key:string)=>latest&&previous&&latest[key]!=null&&previous[key]!=null?latest[key]-previous[key]:null;
 async function syncInstagram(){setSyncing(true);setSyncError("");try{const r=await fetch("/api/instagram/sync",{method:"POST"});const x=await r.json();if(!r.ok){setSyncError(x.error||"Não foi possível sincronizar o Instagram.");return}await load()}catch{setSyncError("Não foi possível conectar ao Instagram agora.")}finally{setSyncing(false)}}
 async function saveBusiness(){setSaving(true);setSaved(false);try{const r=await fetch("/api/metrics/business",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});if(r.ok){const x=await r.json();setBusiness((v:any)=>({snapshots:[x.snapshot,...(v?.snapshots||[])]}));setSaved(true);setForm({instagramDms:"",instagramLeads:"",instagramSales:"",whatsappConversations:"",whatsappLeads:"",whatsappSales:"",salesCount:"",revenue:""})}}finally{setSaving(false)}}
 const account=data?.account; const media=Array.isArray(account?.mediaCache)?account.mediaCache:[];
 const lastBusiness=business?.snapshots?.[0], prevBusiness=business?.snapshots?.[1];
 const bDelta=(key:string):number|null=>lastBusiness&&prevBusiness?Number(lastBusiness[key]||0)-Number(prevBusiness[key]||0):null;
 const instagramDmsDelta=bDelta("instagramDms");
 const instagramLeadsDelta=bDelta("instagramLeads");
 const salesCountDelta=bDelta("salesCount");
 const revenueDelta=bDelta("revenue");
 const insights:string[]=[];
 if(instagramDmsDelta!==null&&instagramDmsDelta>0) insights.push("As conversas no Instagram aumentaram. Observe quais conteúdos e ofertas estavam ativos nesse período e repita o padrão.");
 if(instagramLeadsDelta!==null&&instagramLeadsDelta<0) insights.push("Os leads do Instagram caíram em relação ao registro anterior. Revise CTA, oferta e caminho entre conteúdo e conversa.");
 if(salesCountDelta!==null&&salesCountDelta>0) insights.push("As vendas registradas aumentaram. Identifique a origem das vendas que funcionaram e transforme esse tema em novas peças.");
 if(revenueDelta!==null&&revenueDelta<0) insights.push("O faturamento registrado caiu. Compare volume de leads, vendas e ticket antes de mudar toda a estratégia.");
 if(latest&&previous){if((delta("followers")||0)>0) insights.push("O perfil ganhou seguidores desde o snapshot anterior. Use os conteúdos recentes como referência e acompanhe se esse crescimento também gera conversas ou vendas.");if((delta("likes")||0)<0) insights.push("As interações dos 12 conteúdos analisados caíram. Teste novos ganchos e formatos e acompanhe a reação no próximo ciclo.")}
 if(!insights.length) insights.push("Ainda faltam registros suficientes para uma leitura comparativa. Sincronize o Instagram e registre seus resultados periodicamente para o painel identificar padrões.");
 return <div style={{marginTop:22}}>
  <div className="evolutionHero"><div><div className="badge">📈 Evolução do perfil</div><h2 style={{marginTop:12}}>Seu Instagram + seus resultados</h2><p style={{marginTop:7}}>Crescimento, conversas, leads e vendas em um só lugar.</p></div><button className="btn instagramCta" onClick={()=>window.location.href="/connect-instagram"}>📸 {data?.connected?"Gerenciar Instagram":"Conectar Instagram"}</button></div>
  <div className="feature" style={{marginTop:18}}><div className="row-between"><div><div className="badge">📸 Instagram</div><h2 style={{marginTop:10}}>{data?.connected?("@"+(account?.username||"perfil")):"Conecte para acompanhar automaticamente"}</h2></div>{data?.connected&&<button className="btn secondary" onClick={syncInstagram} disabled={syncing}>{syncing?"Sincronizando...":"↻ Sincronizar agora"}</button>}</div>
   {data?.connected?<><div className="grid3" style={{marginTop:16}}><Metric title="Seguidores" value={account?.followersCount??latest?.followers} change={delta("followers")}/><Metric title="Seguindo" value={account?.followsCount}/><Metric title="Publicações" value={account?.mediaCount}/><Metric title="Curtidas (12 posts)" value={latest?.likes} change={delta("likes")}/><Metric title="Comentários (12 posts)" value={latest?.comments} change={delta("comments")}/><MetricPercent title="Engajamento estimado" value={latest?.followers&&latest?.likes!=null&&latest?.comments!=null?(((latest.likes+latest.comments)/Math.max(media.length,1))/latest.followers)*100:null}/></div>
   <div className="card" style={{marginTop:14}}><div className="row" style={{gap:12,alignItems:"flex-start"}}>{account?.profilePictureUrl?<img src={account.profilePictureUrl} alt="" style={{width:68,height:68,borderRadius:"50%",objectFit:"cover"}}/>:<div className="igAvatar">◎</div>}<div style={{flex:1}}><strong>{account?.fullName||"Perfil conectado"}</strong><p className="small muted" style={{marginTop:5}}>{account?.biography||"Bio ainda não retornada pela API."}</p>{account?.website&&<p className="small" style={{marginTop:5}}>{account.website}</p>}<p className="small muted" style={{marginTop:6}}>{account?.lastSyncedAt?"Última sincronização: "+new Date(account.lastSyncedAt).toLocaleString("pt-BR"):"Ainda não sincronizado"}</p></div></div></div>
   {media.length>0&&<div style={{marginTop:14}}><div className="row-between"><strong>Últimos conteúdos</strong><span className="small muted">{media.length} carregados</span></div><div className="grid3" style={{marginTop:10}}>{media.slice(0,6).map((item:any)=><a key={item.id} href={item.permalink||"#"} target="_blank" rel="noreferrer" className="card" style={{textDecoration:"none",color:"inherit"}}>{(item.media_url||item.thumbnail_url)&&<img src={item.media_url||item.thumbnail_url} alt="" style={{width:"100%",aspectRatio:"1/1",objectFit:"cover",borderRadius:10}}/>}<strong style={{display:"block",marginTop:8}}>{item.media_type||"Conteúdo"}</strong><span className="small muted">{Number(item.like_count||0).toLocaleString("pt-BR")} curtidas · {Number(item.comments_count||0).toLocaleString("pt-BR")} comentários</span></a>)}</div></div>}</>:<p style={{marginTop:8}}>Você também pode usar o painel manualmente enquanto decide conectar.</p>}
   {syncError&&<p className="small" style={{color:"#fda4af",marginTop:10}}>{syncError}</p>}
  </div>
  <div className="feature" style={{marginTop:18,border:"1px solid rgba(255,255,255,.12)"}}><div className="badge">🧠 LEITURA DOS RESULTADOS</div><h2 style={{marginTop:10}}>O que os seus números estão dizendo</h2><p className="muted" style={{marginTop:7}}>Use isso como orientação prática, não como promessa de resultado.</p><div style={{display:"grid",gap:9,marginTop:14}}>{insights.map((x,i)=><div className="card" key={i}>💡 {x}</div>)}</div></div>
  <div className="feature" style={{marginTop:18}}><div className="badge">💬 Conversas → vendas</div><h2 style={{marginTop:10}}>Registre os resultados do período</h2><p style={{marginTop:7}}>Quanto mais registros você fizer, melhor fica a comparação entre conteúdo, conversas, leads e vendas.</p><div className="metricForm"><MetricInput label="DMs recebidas no Instagram" value={form.instagramDms} onChange={v=>setForm({...form,instagramDms:v})}/><MetricInput label="Leads pelo Instagram" value={form.instagramLeads} onChange={v=>setForm({...form,instagramLeads:v})}/><MetricInput label="Vendas pelo Instagram" value={form.instagramSales} onChange={v=>setForm({...form,instagramSales:v})}/><MetricInput label="Conversas no WhatsApp" value={form.whatsappConversations} onChange={v=>setForm({...form,whatsappConversations:v})}/><MetricInput label="Leads no WhatsApp" value={form.whatsappLeads} onChange={v=>setForm({...form,whatsappLeads:v})}/><MetricInput label="Vendas pelo WhatsApp" value={form.whatsappSales} onChange={v=>setForm({...form,whatsappSales:v})}/><MetricInput label="Vendas fechadas" value={form.salesCount} onChange={v=>setForm({...form,salesCount:v})}/><MetricInput label="Faturamento (R$)" value={form.revenue} onChange={v=>setForm({...form,revenue:v})}/></div><button className="btn primary" style={{marginTop:14}} onClick={saveBusiness} disabled={saving}>{saving?"Salvando...":"💾 Salvar resultados"}</button>{saved&&<span className="small savedMsg">✓ Registrado</span>}</div>
  <div className="feature" style={{marginTop:18}}><h2>📊 Histórico de conversão</h2>{business?.snapshots?.length?<div style={{marginTop:12,display:"grid",gap:8}}>{business.snapshots.map((x:any)=><div className="card" key={x.id}><div className="row-between"><strong>{new Date(x.capturedAt).toLocaleDateString("pt-BR")}</strong><span className="small muted">{x.salesCount} vendas · R$ {Number(x.revenue||0).toFixed(2)}</span></div><p className="small muted" style={{marginTop:6}}>Instagram: {x.instagramDms} DMs · {x.instagramLeads} leads · {x.instagramSales} vendas · WhatsApp: {x.whatsappConversations} conversas · {x.whatsappLeads} leads · {x.whatsappSales} vendas</p></div>)}</div>:<p className="muted" style={{marginTop:8}}>Ainda não há registros manuais.</p>}</div>
 </div>
}
function MetricInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="metricInput"><span>{label}</span><input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)} placeholder="0"/></label>}
function Metric({title,value,change}:{title:string;value?:number|null;change?:number|null}){return <div className="feature"><small className="muted">{title}</small><p style={{marginTop:8,fontSize:28,fontWeight:800}}>{value==null?"—":value.toLocaleString("pt-BR")}</p><p className="small muted" style={{marginTop:4}}>{change==null?"Sem comparação":(change>=0?"+":"")+change.toLocaleString("pt-BR")+" desde o snapshot anterior"}</p></div>}
function MetricPercent({title,value}:{title:string;value?:number|null}){return <div className="feature"><small className="muted">{title}</small><p style={{marginTop:8,fontSize:28,fontWeight:800}}>{value==null?"—":value.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%"}</p><p className="small muted" style={{marginTop:4}}>Média de interações por post ÷ seguidores</p></div>}
function Account({user,profile,router}:{user:Me["user"];profile:Profile;router:ReturnType<typeof useRouter>}){
 const subscription=user.subscription;
 const end=subscription?.currentPeriodEnd?new Date(subscription.currentPeriodEnd):null;
 const trialEnd=subscription?.trialEndsAt?new Date(subscription.trialEndsAt):null;
 const days=trialEnd?Math.max(0,Math.ceil((trialEnd.getTime()-Date.now())/86400000)):0;
 return <div style={{marginTop:8}}>
   <div className="feature accountHero"><div><div className="badge">CONTA</div><h2 style={{marginTop:10}}>{profile.niche||"Seu negócio"}</h2><p className="muted" style={{marginTop:6}}>{profile.offer||"Seu posicionamento e oferta aparecem aqui."}</p></div><button className="btn secondary" onClick={()=>router.push("/setup")}>Editar perfil</button></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">💳 PLANO ATUAL</div><h2 style={{marginTop:10}}>{subscription?.status==="TRIALING"?"Teste gratuito ativo":"Acesso ativo"}</h2><p className="muted" style={{marginTop:6}}>{subscription?.status==="TRIALING"?`Seu teste vence em ${days} dia(s).`:end?`Seu plano vence em ${Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000))} dia(s), em ${end.toLocaleDateString("pt-BR")}.`:"Escolha um plano para continuar."}</p><button className="btn primary" style={{marginTop:12}} onClick={()=>router.push("/checkout?plan=monthly")}>Renovar por Pix →</button></div>
   <div className="grid2" style={{marginTop:14}}><div className="card"><small className="muted">SEMANAL</small><strong style={{fontSize:30,display:"block",marginTop:7}}>R$ 14,99</strong><p className="small muted">7 dias de acesso completo.</p><button className="btn secondary full" style={{marginTop:10}} onClick={()=>router.push("/checkout?plan=weekly")}>Escolher semanal</button></div><div className="card"><small className="muted">MENSAL</small><strong style={{fontSize:30,display:"block",marginTop:7}}>R$ 29,99</strong><p className="small muted">30 dias de acesso completo.</p><button className="btn primary full" style={{marginTop:10}} onClick={()=>router.push("/checkout?plan=monthly")}>Escolher mensal</button></div></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">👤 SEU PERFIL</div><div className="profileGrid" style={{marginTop:14}}>{[["Instagram",profile.instagramProfileUrl],["Tipo de negócio",profile.businessType],["Nicho",profile.niche],["Oferta",profile.offer],["Objetivo",profile.objective],["Público",profile.audience],["Localização",profile.audienceLocation||profile.location],["Posicionamento",profile.desiredPositioning],["WhatsApp",user.phone],["Frequência",profile.postingFrequency]].map(([label,value])=><div className="card" key={label}><small className="muted">{label}</small><p style={{marginTop:6,whiteSpace:"pre-line"}}>{String(value||"—")}</p></div>)}</div><button className="btn secondary" style={{marginTop:14}} onClick={()=>router.push("/setup")}>Editar meus dados →</button></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">💬 SUPORTE</div><h3 style={{marginTop:10}}>Precisa de ajuda?</h3><p className="muted" style={{marginTop:6}}>Fale com o suporte pelo WhatsApp.</p><a className="btn secondary" style={{display:"inline-block",marginTop:10}} href="https://wa.me/?text=Oi! Preciso de ajuda com o MidiaNet AI." target="_blank" rel="noreferrer">Falar com suporte →</a></div>
 </div>
}
function Info({title,value}:{title:string;value:string}){return <div className="feature"><small className="muted">{title}</small><p style={{marginTop:8,fontSize:17,lineHeight:1.45}}>{value||"—"}</p></div>}