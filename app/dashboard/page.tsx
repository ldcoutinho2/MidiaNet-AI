"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

type Slot = { time:string; format:string; role:string; objective:string; title:string; topic:string; hook:string; script:string; caption:string; visualDirection:string; cta:string; executionSteps:string[] };
type Draft = { id:string; slotKey:string|null; status:"IDEA"|"DRAFT"|"APPROVED"|"SCHEDULED"|"PUBLISHED"; dayLabel:string|null; timeLabel:string|null; title:string; format?:string; objective?:string|null; hook?:string|null; script?:string|null; caption?:string|null; visualDirection?:string|null; cta?:string|null; approvedAt?:string|null; publishedAt?:string|null };
type DayPlan = { day:string; mission:string; slots:Slot[] };
type AuditItem = {score:number;diagnosis:string;recommendation:string};
type ProfileAudit = { overallScore:number; summary:string; firstImpression:string; bio:AuditItem&{impact:string;suggestedBio:string}; profilePhoto:AuditItem; nameAndPositioning:AuditItem; highlights:AuditItem; grid:AuditItem; postingFrequency:AuditItem; conversion:AuditItem&{ctaSuggestion:string}; priorities:string[]; limitations:string[] };
type AIProfile = { objective:string; currentStage:string; diagnosis:string; mainProblem:string; strategy:string; weeklyMission:string; nextAction:string; postingFrequency:string; postingFrequencyReason:string; weeklyContentCount:number; dailyContentCount:string; positioning:string; audience:string; conversionStrategy:string; contentPillars:string[]; tone:string[]; strengths:string[]; opportunities:string[]; thirtyDayPlan:{phase:string;focus:string;action:string;expectedSignal:string}[]; weeklyPlan:DayPlan[]; profileAudit?:ProfileAudit };
type Profile = Record<string,any> & { aiProfile?:AIProfile|null; aiAnalyzedAt?:string|null };
type Entitlement = {contentRemaining:number;contentLimit:number;imageRemaining:number;imageLimit:number;contentUsed:number;imageUsed:number;};
type Me = { user:{name:string|null;email:string;phone?:string|null;strategicProfile:Profile|null;subscription?:any|null;socialAccounts?:{id:string;platform:string;username:string|null;fullName?:string|null;biography?:string|null;website?:string|null;profilePictureUrl?:string|null;followersCount?:number|null;followsCount?:number|null;mediaCount?:number|null;lastSyncedAt?:string|null;connectedAt:string}[]} };

const tabs=[
  ["home","Hoje","⌂"],["week","Semana","▦"],["diagnostic","Diagnóstico","◉"],["results","Resultados","↗"],["account","Conta","●"]
] as const;
const fmtIcon:Record<string,string>={Story:"⚡",Foto:"📸",Post:"📸",Reel:"🎬",Vídeo:"🎬",Carrossel:"📚"};

export default function Dashboard(){
 const router=useRouter();
 const [data,setData]=useState<Me|null>(null);
 const [drafts,setDrafts]=useState<Draft[]>([]);
 const [weekOpen,setWeekOpen]=useState<{day:number;slot:number}|null>(null);
 const [loading,setLoading]=useState(true);
 const [tab,setTab]=useState("home");
 const [analyzing,setAnalyzing]=useState(false);
 const [error,setError]=useState(""); const [entitlement,setEntitlement]=useState<Entitlement|null>(null);

 useEffect(()=>{
   fetch("/api/auth/me").then(async r=>{
     if(!r.ok){router.replace("/login");return null}
     return r.json()
   }).then(x=>{
     if(x){
       if(!x.user.strategicProfile?.onboardingCompletedAt){router.replace("/setup");return}
       setData(x);
       fetch("/api/content-drafts").then(r=>r.ok?r.json():null).then(v=>{if(v?.drafts)setDrafts(v.drafts)}).catch(()=>{}); fetch("/api/entitlements").then(r=>r.ok?r.json():null).then(v=>{if(v?.entitlement)setEntitlement(v.entitlement)}).catch(()=>{})
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
 else if(tab==="home") panel=<Home ai={ai} name={data.user.name||"criador"} drafts={drafts} onWeek={()=>setTab("week")} onOpenToday={(day,slot)=>{setWeekOpen({day,slot});setTab("week")}}/>;
 else if(tab==="week") panel=<Week ai={ai} trial={data.user.subscription?.status==="TRIALING"} drafts={drafts} onDraftChange={(d)=>setDrafts(v=>v.some(x=>x.id===d.id)?v.map(x=>x.id===d.id?d:x):[...v,d])} openSlot={weekOpen} onConsumeOpen={()=>setWeekOpen(null)}/>;
 else if(tab==="diagnostic") panel=<Diagnostic ai={ai} onAnalyze={auditProfile} analyzing={analyzing}/>;
 else if(tab==="results") panel=<Results profile={p}/>;
 else if(tab==="create") panel=<Create ai={ai} drafts={drafts} onDraftChange={(d)=>setDrafts(v=>v.some(x=>x.id===d.id)?v.map(x=>x.id===d.id?d:x):[...v,d])}/>;
 else panel=<Account user={data.user} profile={p} router={router} entitlement={entitlement}/>;

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
 return Boolean(v&&typeof v==="object"&&typeof v.objective==="string"&&Array.isArray(v.weeklyPlan)&&v.weeklyPlan.length>=2&&v.weeklyPlan.length<=7&&v.weeklyPlan.every((d:any)=>d&&Array.isArray(d.slots)&&d.slots.length>=1&&d.slots.length<=3));
}
function SetupStrategy({analyzing,analyze,hasOldStrategy}:{analyzing:boolean;analyze:()=>void;hasOldStrategy:boolean}){return <div className="feature" style={{marginTop:24}}><div className="badge">{hasOldStrategy?"Atualização":"1º passo"}</div><h2 style={{marginTop:12}}>{hasOldStrategy?"Sua estratégia ganhou a nova programação.":"Vamos transformar seu perfil em um plano."}</h2><p className="muted" style={{marginTop:8,maxWidth:760}}>A IA vai montar diagnóstico, estratégia, semana completa e conteúdos prontos para você executar — 1 a 3 conteúdos por dia, conforme sua estratégia.</p><button className="btn primary" onClick={analyze} disabled={analyzing} style={{marginTop:18}}>{analyzing?"Analisando seu perfil...":hasOldStrategy?"Atualizar minha estratégia →":"Montar minha estratégia →"}</button></div>}
function Home({ai,name,drafts,onWeek,onOpenToday}:{ai:AIProfile;name:string;drafts:Draft[];onWeek:()=>void;onOpenToday:(dayIndex:number,slotIndex:number)=>void}){
 const dayIndex=Math.min(Math.max((new Date().getDay()+6)%7,0),(ai.weeklyPlan?.length||1)-1);
 const today=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 const actions=today?.slots||[];
 const score=ai.profileAudit?.overallScore;
 const totalContent=(ai.weeklyPlan||[]).reduce((n,d)=>n+(d.slots?.length||0),0);
 const publishedContent=drafts.filter(d=>d.status==="PUBLISHED"&&d.slotKey).length;
 const progress=totalContent?Math.min(100,Math.round((publishedContent/totalContent)*100)):0;
 const completedDays=new Set(drafts.filter(d=>d.status==="PUBLISHED"&&d.slotKey).map(d=>String(d.slotKey).split(":")[0])).size;
 return <div className="todayPage">
   <div className="todayHeader">
     <div><div className="badge">HOJE</div><h1>Olá, {name} 👋</h1><p className="muted">Você não precisa decidir o que postar. Seu próximo passo está aqui.</p></div>
     <div className="scoreMini"><small>Nota do perfil</small><strong>{score??"—"}<span>/100</span></strong><div className="scoreTrack"><i style={{width:`${Math.max(0,Math.min(score||0,100))}%`}}/></div></div>
   </div>
   <div className="feature todayMainCard">
     <div className="row-between"><div><div className="badge">🚀 O QUE FAZER HOJE</div><h2 style={{marginTop:10}}>{today?.day||"Hoje"}</h2></div><span className="small muted">{actions.length} conteúdo{actions.length===1?"":"s"} hoje</span></div>
     <p className="muted" style={{marginTop:6}}>{today?.mission||"Siga o conteúdo recomendado para hoje."}</p>
     <div className="todayContentList">{actions.map((s,i)=>{const draft=drafts.find(d=>d.slotKey===`${dayIndex}:${i}`);const posted=draft?.status==="PUBLISHED";return <button className="todayContentItem" key={i} onClick={()=>onOpenToday(dayIndex,i)}><span className="todayTime">{s.time}</span><span className="todayFormat">{fmtIcon[s.format]||"✨"} {s.format}</span><strong>{s.title}</strong><span className="todayArrow">{posted?"✓":"→"}</span></button>})}</div>
     <button className="btn primary full" style={{marginTop:12}} onClick={onWeek}>Abrir conteúdo de hoje →</button>
   </div>
   <div className="weekProgressCard feature"><div className="row-between"><strong>📅 Progresso da semana</strong><span>{publishedContent} de {totalContent} conteúdos publicados</span></div><div className="weekTrack"><i style={{width:`${progress}%`}}/></div><p className="small muted" style={{marginTop:7}}>Cada ✓ significa que aquele conteúdo já foi publicado.</p></div>
   <div className="feature quickFix"><div className="badge">🛠️ Corrija em 5 minutos</div><h2 style={{marginTop:10}}>Comece por estas 3 correções</h2><div className="quickFixList">{(ai.profileAudit?.priorities||["Revise sua bio","Deixe seu CTA mais claro","Escolha um tema principal para a semana"]).slice(0,3).map((x,i)=><div className="card" key={i}><b>{i+1}.</b> {x}</div>)}</div></div>
 </div>
}
function Week({ai,trial,drafts,onDraftChange,openSlot,onConsumeOpen}:{ai:AIProfile;trial:boolean;drafts:Draft[];onDraftChange:(d:Draft)=>void;openSlot?:{day:number;slot:number}|null;onConsumeOpen:()=>void}){
 const [selected,setSelected]=useState<{slot:Slot;day:string;draft?:Draft}|null>(null);
 const [dayIndex,setDayIndex]=useState(openSlot?.day||0);
 const day=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0];
 useEffect(()=>{if(openSlot){setDayIndex(openSlot.day);const d=ai.weeklyPlan?.[openSlot.day];const slot=d?.slots?.[openSlot.slot];if(slot){const draft=drafts.find(x=>x.slotKey===`${openSlot.day}:${openSlot.slot}`);setSelected({slot:draft?.title?{...slot,title:draft.title,format:draft.format||slot.format,objective:draft.objective||slot.objective,hook:draft.hook||slot.hook,script:draft.script||slot.script,caption:draft.caption||slot.caption,visualDirection:draft.visualDirection||slot.visualDirection,cta:draft.cta||slot.cta}:slot,day:d.day,draft});}onConsumeOpen()}},[openSlot]);
 return <div style={{marginTop:8}}>
   <div className="feature weekTop"><div className="badge">SEMANA</div><h2 style={{marginTop:10}}>Sua semana pronta</h2><p className="muted" style={{marginTop:6}}>Escolha o dia e abra qualquer conteúdo para copiar, ajustar e marcar como postado.</p><div className="small muted" style={{marginTop:10}}>Ritmo atual: {ai.dailyContentCount||"2 conteúdos por dia"}</div>{trial&&<div className="trialLockBanner">🎁 No teste grátis, o primeiro dia está liberado. Os outros dias ficam bloqueados até liberar a semana.</div>}</div>
   <div className="dayTabs">{ai.weeklyPlan.map((d,i)=>{const locked=trial&&i>0;return <button key={i} className={i===dayIndex?"active":""} disabled={locked} onClick={()=>!locked&&setDayIndex(i)}>{locked?"🔒":" "}{d.day.slice(0,3)}</button>})}</div>
   {day&&<div className="feature" style={{marginTop:10}}><div className="row-between"><div><div className="badge">{day.day}</div><p className="muted" style={{marginTop:7}}>{day.mission}</p></div><span className="small muted">{day.slots.length} conteúdo{day.slots.length===1?"":"s"}</span></div><div style={{display:"grid",gap:9,marginTop:14}}>{day.slots.map((slot,j)=>{const draft=drafts.find(d=>d.slotKey===`${dayIndex}:${j}`);const shown=draft?.title?{...slot,title:draft.title,format:draft.format||slot.format,objective:draft.objective||slot.objective,hook:draft.hook||slot.hook,script:draft.script||slot.script,caption:draft.caption||slot.caption,visualDirection:draft.visualDirection||slot.visualDirection,cta:draft.cta||slot.cta}:slot;return <button key={j} onClick={()=>setSelected({slot:shown,day:day.day,draft})} className="contentRow"><div style={{minWidth:0}}><strong>{fmtIcon[shown.format]||"✨"} {shown.time} · {shown.format}</strong><div style={{marginTop:5}}>{shown.title}</div><div className="small muted" style={{marginTop:4}}>{shown.objective}</div>{draft&&<div className="small" style={{marginTop:6}}>{draft.status==="PUBLISHED"?"✅ Publicado":draft.status==="APPROVED"?"🟢 Aprovado":draft.status==="SCHEDULED"?"🗓️ Agendado":draft.status==="DRAFT"?"✏️ Rascunho":"💡 Ideia"}</div>}</div><span>→</span></button>})}</div></div>}
   {selected&&<ContentWorkspace slot={selected.slot} day={selected.day} draft={selected.draft} onDraftChange={onDraftChange} onClose={()=>setSelected(null)}/>}
 </div>
}
function ContentWorkspace({slot,day,draft,onDraftChange,onClose}:{slot:Slot;day:string;draft?:Draft;onDraftChange:(d:Draft)=>void;onClose:()=>void}){
 const [busy,setBusy]=useState(false); const [copied,setCopied]=useState(""); const [current,setCurrent]=useState<Slot>(slot);
 const fields=[["Gancho",current.hook],["Roteiro",current.script],["Legenda",current.caption],["CTA",current.cta],["Visual",current.visualDirection]];
 async function copy(label:string,value:string){await navigator.clipboard?.writeText(value||"");setCopied(label);setTimeout(()=>setCopied(""),1200)}
 async function status(next:"APPROVED"|"PUBLISHED"){if(!draft)return;setBusy(true);try{const r=await fetch("/api/content-drafts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:draft.id,status:next})});const x=await r.json();if(r.ok&&x.draft)onDraftChange(x.draft)}finally{setBusy(false)}}
 async function redo(){setBusy(true);try{
   const r=await fetch("/api/ai/refine-content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:"refine",format:current.format,idea:current,message:"Refaça este post mantendo o objetivo, mas crie uma nova versão mais forte e diferente."})});
   const x=await r.json(); if(!r.ok)throw new Error(x.error||"Não foi possível refazer.");
   const next={...current,title:x.result.title,format:x.result.format,objective:x.result.objective,hook:x.result.hook,script:x.result.script,caption:x.result.caption,visualDirection:x.result.visualDirection,cta:x.result.cta,executionSteps:x.result.executionSteps||[]};
   setCurrent(next);
   if(draft){const u=await fetch("/api/content-drafts",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:draft.id,status:"DRAFT",title:next.title,format:next.format,objective:next.objective,hook:next.hook,script:next.script,caption:next.caption,visualDirection:next.visualDirection,cta:next.cta,conversationHistory:next.executionSteps})});const y=await u.json();if(u.ok&&y.draft)onDraftChange(y.draft)}
 }catch(e){alert(e instanceof Error?e.message:"Não foi possível refazer o post.")}finally{setBusy(false)}}
 const all=fields.map(([label,value])=>`${label}: ${value||""}`).join("\n\n");
 return <div className="feature contentWorkspace"><div className="row-between"><div><div className="badge">{day} · {current.time} · {current.format}</div><h2 style={{marginTop:10}}>{current.title}</h2><p className="small muted" style={{marginTop:5}}>Objetivo: {current.objective}</p></div><button className="btn secondary" onClick={onClose}>Fechar</button></div>
  <div className="workspaceFields">{fields.map(([label,value])=><div className="workspaceField" key={label}><div className="row-between"><strong>{label}</strong><button className="copyBtn" onClick={()=>copy(label,value||"")}>{copied===label?"✓ Copiado":"Copiar"}</button></div><p style={{whiteSpace:"pre-line",lineHeight:1.6,marginTop:8}}>{value||"—"}</p></div>)}</div>
  <button className="btn secondary full" style={{marginTop:12}} onClick={()=>copy("all",all)}>{copied==="all"?"✓ Tudo copiado":"📋 Copiar tudo"}</button>
  <div className="workspaceActions"><button className="btn secondary" onClick={redo} disabled={busy}>{busy?"Gerando...":"↻ Refazer este post"}</button><button className="btn primary" onClick={()=>status("PUBLISHED")} disabled={busy}>✓ Marcar como postado</button></div>
 </div>
}
function Diagnostic({ai,onAnalyze,analyzing}:{ai:AIProfile;onAnalyze:()=>void;analyzing:boolean}){
 return <div style={{marginTop:8}}>
   <div className="diagnosticSwitch"><a href="#audit">Auditoria</a><a href="#strategy">Estratégia</a></div>
   <div id="audit"><Audit audit={ai.profileAudit} onAnalyze={onAnalyze} analyzing={analyzing}/></div>
   <div id="strategy" style={{marginTop:30}}><Strategy ai={ai}/></div>
 </div>
}
function Strategy({ai}:{ai:AIProfile}){
 const plan=Array.isArray(ai.thirtyDayPlan)?ai.thirtyDayPlan:[];
 return <div style={{marginTop:8}}>
  <div className="feature"><div className="badge">🎯 ESTRATÉGIA</div><h2 style={{marginTop:10}}>Seu direcionamento em poucas frases</h2><div className="strategyGrid" style={{marginTop:14}}><div className="card"><small className="muted">POSICIONAMENTO</small><p style={{marginTop:7}}>{ai.positioning}</p></div><div className="card"><small className="muted">PÚBLICO</small><p style={{marginTop:7}}>{ai.audience}</p></div><div className="card"><small className="muted">COMO CONVERTER</small><p style={{marginTop:7}}>{ai.conversionStrategy}</p></div><div className="card"><small className="muted">PRÓXIMO PASSO</small><p style={{marginTop:7}}>{ai.nextAction}</p></div></div></div>
  <div className="feature" style={{marginTop:14}}><div className="badge">📅 PLANO DE 30 DIAS</div><div className="strategyGrid" style={{marginTop:14}}>{plan.slice(0,4).map((x:any,i:number)=><div className="card" key={i}><small className="muted">FASE {i+1}</small><h3 style={{marginTop:7}}>{x.phase||x.title||("Semana "+(i+1))}</h3><p className="small muted" style={{marginTop:6}}>{x.focus||x.description||x.objective||""}</p></div>)}</div></div>
 </div>
}
function Audit({audit,onAnalyze,analyzing}:{audit?:ProfileAudit;onAnalyze:()=>void;analyzing:boolean}){
 async function shareAudit(){
   if(!audit)return;
   const canvas=document.createElement("canvas");canvas.width=1080;canvas.height=1920;
   const ctx=canvas.getContext("2d");if(!ctx)return;
   ctx.fillStyle="#09090b";ctx.fillRect(0,0,canvas.width,canvas.height);
   ctx.fillStyle="#ffffff";ctx.font="800 64px Arial";ctx.fillText("MidiaNet AI",70,105);
   ctx.fillStyle="#d946ef";ctx.font="700 34px Arial";ctx.fillText("DIAGNÓSTICO DO INSTAGRAM",70,165);
   ctx.fillStyle="#ffffff";ctx.font="900 170px Arial";ctx.fillText(String(audit.overallScore),70,370);
   ctx.fillStyle="#a1a1aa";ctx.font="32px Arial";ctx.fillText("/100",330,365);
   ctx.fillStyle="#ffffff";ctx.font="700 34px Arial";ctx.fillText("Como seu perfil está sendo percebido",70,470);
   const items:[string,number][]=[["Nome e @",audit.nameAndPositioning.score],["Foto de perfil",audit.profilePhoto.score],["Bio",audit.bio.score],["Destaques",audit.highlights.score],["Grade / feed",audit.grid.score],["Frequência",audit.postingFrequency.score],["Conversão",audit.conversion.score]];
   let y=560;ctx.font="700 30px Arial";
   for(const [label,score] of items){ctx.fillStyle="#18181b";ctx.fillRect(70,y-34,940,82);ctx.fillStyle="#ffffff";ctx.fillText(label,95,y+5);ctx.fillStyle=score>=70?"#86efac":score>=45?"#fde68a":"#fca5a5";ctx.fillText(score+"/100",850,y+5);y+=105}
   ctx.fillStyle="#d4d4d8";ctx.font="28px Arial";const lines=(audit.summary||"").match(/.{1,55}(?:\s|$)/g)||[];y+=35;for(const line of lines.slice(0,6)){ctx.fillText(line.trim(),70,y);y+=42}
   ctx.fillStyle="#71717a";ctx.font="24px Arial";ctx.fillText("Analise seu perfil. Corrija. Publique. Meça. Melhore.",70,1810);
   const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/png"));if(!blob)return;
   const file=new File([blob],"diagnostico-midianet-ai.png",{type:"image/png"});
   if(navigator.share&&navigator.canShare?.({files:[file]}))await navigator.share({title:"Meu diagnóstico do Instagram",files:[file]});
   else{const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="diagnostico-midianet-ai.png";a.click();URL.revokeObjectURL(url);}
 }

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
   <div className="feature" style={{marginTop:14}}><div className="badge">✨ VERSÃO PRONTA</div><h2 style={{marginTop:10}}>Bio sugerida</h2><div className="card" style={{marginTop:10,whiteSpace:"pre-line",lineHeight:1.6}}>{audit.bio.suggestedBio}</div><div style={{display:"flex",gap:9,flexWrap:"wrap",marginTop:10}}><button className="btn secondary" onClick={()=>navigator.clipboard?.writeText(audit.bio.suggestedBio)}>Copiar bio</button><button className="btn primary" onClick={shareAudit}>📤 Compartilhar diagnóstico</button></div></div>
   <div className="feature" style={{marginTop:14}}><div className="badge">🛠️ CORRIJA EM 5 MINUTOS</div><div style={{display:"grid",gap:8,marginTop:12}}>{audit.priorities.slice(0,3).map((x,i)=><div className="card" key={i}><b>{i+1}.</b> {x}</div>)}</div></div>
   {audit.limitations?.length>0&&<p className="small muted" style={{marginTop:12}}>ℹ️ {audit.limitations.join(" ")}</p>}
 </div>
}
function Results({profile}:{profile:Profile}){
 const [data,setData]=useState<any>(null); const [business,setBusiness]=useState<any>(null);
 const [form,setForm]=useState({instagramDms:"",instagramLeads:"",instagramSales:"",whatsappConversations:"",whatsappLeads:"",whatsappSales:"",salesCount:"",revenue:""});
 const [saving,setSaving]=useState(false); const [saved,setSaved]=useState(false); const [syncing,setSyncing]=useState(false); const [syncError,setSyncError]=useState("");
 async function load(){const [a,b]=await Promise.all([fetch("/api/metrics/summary").then(r=>r.json()),fetch("/api/metrics/business").then(r=>r.json())]);setData(a);setBusiness(b)}
 useEffect(()=>{load()},[]);
 const snapshots=Array.isArray(data?.snapshots)?data.snapshots:[];
 const latest=data?.latest, previous=data?.previous;
 const delta=(key:string)=>latest&&previous&&latest[key]!=null&&previous[key]!=null?Number(latest[key])-Number(previous[key]):null;
 const account=data?.account;
 const media=Array.isArray(account?.mediaCache)?account.mediaCache:[];
 const bestPost=[...media].sort((a:any,b:any)=>(Number(b.like_count||0)+Number(b.comments_count||0))-(Number(a.like_count||0)+Number(a.comments_count||0)))[0];
 const engagement=(x:any)=>x?.followers?((Number(x.likes||0)+Number(x.comments||0))/Math.max(Number(x.followers),1))*100:null;
 const currentEngagement=engagement(latest), previousEngagement=engagement(previous);
 const insights:string[]=[];
 if(delta("followers")!==null&&delta("followers")!>0) insights.push(`Você ganhou ${delta("followers")!.toLocaleString("pt-BR")} seguidores desde o registro anterior.`);
 if(currentEngagement!==null&&previousEngagement!==null&&currentEngagement>previousEngagement) insights.push(`O engajamento estimado subiu de ${previousEngagement.toFixed(2)}% para ${currentEngagement.toFixed(2)}%.`);
 if(currentEngagement!==null&&previousEngagement!==null&&currentEngagement<previousEngagement) insights.push(`O engajamento estimado caiu de ${previousEngagement.toFixed(2)}% para ${currentEngagement.toFixed(2)}%; teste novos ganchos e formatos.`);
 if(!insights.length) insights.push("Faça novas sincronizações para construir seu histórico e receber comparações reais.");
 async function syncInstagram(){setSyncing(true);setSyncError("");try{const r=await fetch("/api/instagram/sync",{method:"POST"});const x=await r.json();if(!r.ok){setSyncError(x.error||"Não foi possível sincronizar o Instagram.");return}await load()}catch{setSyncError("Não foi possível conectar ao Instagram agora.")}finally{setSyncing(false)}}
 async function saveBusiness(){setSaving(true);setSaved(false);try{const r=await fetch("/api/metrics/business",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});if(r.ok){const x=await r.json();setBusiness((v:any)=>({snapshots:[x.snapshot,...(v?.snapshots||[])]}));setSaved(true);setForm({instagramDms:"",instagramLeads:"",instagramSales:"",whatsappConversations:"",whatsappLeads:"",whatsappSales:"",salesCount:"",revenue:""})}}finally{setSaving(false)}}
 return <div style={{marginTop:8}}>
  <div className="evolutionHero"><div><div className="badge">📈 RESULTADOS</div><h2 style={{marginTop:12}}>Entenda o que está funcionando</h2><p style={{marginTop:7}}>Sincronize, compare e use os números para decidir o próximo conteúdo.</p></div><button className="btn instagramCta" onClick={syncInstagram} disabled={!data?.connected||syncing}>{syncing?"Sincronizando...":"↻ Sincronizar agora"}</button></div>
  {!data?.connected&&<div className="feature" style={{marginTop:14}}><h3>📸 Conecte seu Instagram</h3><p className="muted" style={{marginTop:6}}>Sem a conta conectada, você ainda pode registrar WhatsApp e vendas manualmente.</p></div>}
  {data?.connected&&<div className="feature" style={{marginTop:14}}><div className="row-between"><div><div className="badge">📊 COMPARAÇÃO</div><h2 style={{marginTop:10}}>@{account?.username||"perfil"}</h2></div><span className="small muted">{snapshots.length} registros</span></div>
    <div className="grid3" style={{marginTop:14}}><Metric title="Seguidores" value={account?.followersCount??latest?.followers} change={delta("followers")}/><Metric title="Curtidas" value={latest?.likes} change={delta("likes")}/><Metric title="Comentários" value={latest?.comments} change={delta("comments")}/><MetricPercent title="Engajamento estimado" value={currentEngagement}/></div>
    <div className="resultInsights">{insights.map((x,i)=><div className="card" key={i}>💡 {x}</div>)}</div>
  </div>}
  {snapshots.length>1&&<div className="feature" style={{marginTop:14}}><div className="badge">📈 EVOLUÇÃO</div><h2 style={{marginTop:10}}>Seguidores por sincronização</h2><div className="miniChart">{snapshots.slice(-12).map((x:any,i:number)=>{const max=Math.max(...snapshots.slice(-12).map((n:any)=>Number(n.followers||0)),1);const h=Math.max(8,Math.round((Number(x.followers||0)/max)*100));return <div className="chartPoint" key={i}><i style={{height:h+"%"}}/><span>{Number(x.followers||0).toLocaleString("pt-BR")}</span><small>{new Date(x.capturedAt).toLocaleDateString("pt-BR",{day:"2-digit",month:"2-digit"})}</small></div>})}</div></div>}
  {bestPost&&<div className="feature" style={{marginTop:14}}><div className="badge">🏆 MELHOR CONTEÚDO DA AMOSTRA</div><h2 style={{marginTop:10}}>Veja o que teve mais interação</h2><div className="bestPostCard">{(bestPost.media_url||bestPost.thumbnail_url)&&<img src={bestPost.media_url||bestPost.thumbnail_url} alt="" /> }<div><strong>{bestPost.caption||"Conteúdo sem legenda disponível"}</strong><p className="small muted" style={{marginTop:7}}>{Number(bestPost.like_count||0).toLocaleString("pt-BR")} curtidas · {Number(bestPost.comments_count||0).toLocaleString("pt-BR")} comentários</p><p className="small" style={{marginTop:8}}>Use o tema, formato e gancho deste conteúdo como referência para criar novas variações.</p></div></div></div>}
  {syncError&&<p className="small" style={{color:"#fda4af",marginTop:10}}>{syncError}</p>}
  <div className="feature" style={{marginTop:14}}><div className="badge">💬 WHATSAPP + VENDAS</div><h2 style={{marginTop:10}}>Registre o resultado da semana</h2><p className="muted" style={{marginTop:7}}>Esses números ajudam o MidiaNet a entender se o conteúdo está virando conversa, lead e venda.</p><div className="metricForm"><MetricInput label="DMs recebidas no Instagram" value={form.instagramDms} onChange={v=>setForm({...form,instagramDms:v})}/><MetricInput label="Leads pelo Instagram" value={form.instagramLeads} onChange={v=>setForm({...form,instagramLeads:v})}/><MetricInput label="Vendas pelo Instagram" value={form.instagramSales} onChange={v=>setForm({...form,instagramSales:v})}/><MetricInput label="Conversas no WhatsApp" value={form.whatsappConversations} onChange={v=>setForm({...form,whatsappConversations:v})}/><MetricInput label="Leads no WhatsApp" value={form.whatsappLeads} onChange={v=>setForm({...form,whatsappLeads:v})}/><MetricInput label="Vendas pelo WhatsApp" value={form.whatsappSales} onChange={v=>setForm({...form,whatsappSales:v})}/><MetricInput label="Vendas fechadas" value={form.salesCount} onChange={v=>setForm({...form,salesCount:v})}/><MetricInput label="Faturamento (R$)" value={form.revenue} onChange={v=>setForm({...form,revenue:v})}/></div><button className="btn primary" style={{marginTop:14}} onClick={saveBusiness} disabled={saving}>{saving?"Salvando...":"💾 Salvar resultados"}</button>{saved&&<span className="small savedMsg">✓ Registrado</span>}</div>
  <div className="feature" style={{marginTop:14}}><h2>📋 Histórico de conversão</h2>{business?.snapshots?.length?<div style={{marginTop:12,display:"grid",gap:8}}>{business.snapshots.map((x:any)=><div className="card" key={x.id}><div className="row-between"><strong>{new Date(x.capturedAt).toLocaleDateString("pt-BR")}</strong><span className="small muted">{x.salesCount} vendas · R$ {Number(x.revenue||0).toFixed(2)}</span></div><p className="small muted" style={{marginTop:6}}>Instagram: {x.instagramDms} DMs · {x.instagramLeads} leads · {x.instagramSales} vendas · WhatsApp: {x.whatsappConversations} conversas · {x.whatsappLeads} leads · {x.whatsappSales} vendas</p></div>)}</div>:<p className="muted" style={{marginTop:8}}>Ainda não há registros manuais.</p>}</div>
 </div>
}
function MetricInput({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="metricInput"><span>{label}</span><input type="number" min="0" value={value} onChange={e=>onChange(e.target.value)} placeholder="0"/></label>}
function Metric({title,value,change}:{title:string;value?:number|null;change?:number|null}){return <div className="feature"><small className="muted">{title}</small><p style={{marginTop:8,fontSize:28,fontWeight:800}}>{value==null?"—":value.toLocaleString("pt-BR")}</p><p className="small muted" style={{marginTop:4}}>{change==null?"Sem comparação":(change>=0?"+":"")+change.toLocaleString("pt-BR")+" desde o snapshot anterior"}</p></div>}
function MetricPercent({title,value}:{title:string;value?:number|null}){return <div className="feature"><small className="muted">{title}</small><p style={{marginTop:8,fontSize:28,fontWeight:800}}>{value==null?"—":value.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2})+"%"}</p><p className="small muted" style={{marginTop:4}}>Interações ÷ seguidores</p></div>}
function Account({user,profile,router,entitlement}:{user:Me["user"];profile:Profile;router:ReturnType<typeof useRouter>;entitlement:Entitlement|null}){
 const subscription=user.subscription;
 const end=subscription?.currentPeriodEnd?new Date(subscription.currentPeriodEnd):null;
 const trialEnd=subscription?.trialEndsAt?new Date(subscription.trialEndsAt):null;
 const days=trialEnd?Math.max(0,Math.ceil((trialEnd.getTime()-Date.now())/86400000)):0;
 return <div style={{marginTop:8}}>
  <div className="feature accountHero"><div><div className="badge">CONTA</div><h2 style={{marginTop:10}}>{profile.niche||"Seu negócio"}</h2><p className="muted" style={{marginTop:6}}>{profile.offer||"Seu posicionamento e oferta aparecem aqui."}</p></div><button className="btn secondary" onClick={()=>router.push("/setup")}>Editar perfil</button></div>
  <div className="feature" style={{marginTop:14}}><div className="badge">💳 PLANO ATUAL</div><h2 style={{marginTop:10}}>{subscription?.status==="TRIALING"?"Teste gratuito ativo":"Acesso ativo"}</h2><p className="muted" style={{marginTop:6}}>{subscription?.status==="TRIALING"?`Seu teste vence em ${days} dia(s).`:end?`Seu plano vence em ${Math.max(0,Math.ceil((end.getTime()-Date.now())/86400000))} dia(s), em ${end.toLocaleDateString("pt-BR")}.`:"Escolha um plano para continuar."}</p><button className="btn primary" style={{marginTop:12}} onClick={()=>router.push("/checkout?plan=monthly")}>Renovar por Pix →</button></div>
  <div className="feature" style={{marginTop:14}}><div className="badge">🧠 USO DE IA</div><h3 style={{marginTop:10}}>Gerações restantes</h3><div className="grid2" style={{marginTop:10}}><div className="card"><small className="muted">CONTEÚDO</small><strong style={{fontSize:25,display:"block",marginTop:5}}>{entitlement?.contentRemaining??"—"}</strong><p className="small muted">de {entitlement?.contentLimit??"—"}</p></div><div className="card"><small className="muted">IMAGENS</small><strong style={{fontSize:25,display:"block",marginTop:5}}>{entitlement?.imageRemaining??"—"}</strong><p className="small muted">de {entitlement?.imageLimit??"—"}</p></div></div></div>
  <div className="grid2" style={{marginTop:14}}><div className="card"><small className="muted">SEMANAL</small><strong style={{fontSize:30,display:"block",marginTop:7}}>R$ 14,99</strong><p className="small muted">7 dias de acesso completo.</p><button className="btn secondary full" style={{marginTop:10}} onClick={()=>router.push("/checkout?plan=weekly")}>Escolher semanal</button></div><div className="card"><small className="muted">MENSAL</small><strong style={{fontSize:30,display:"block",marginTop:7}}>R$ 29,99</strong><p className="small muted">30 dias de acesso completo.</p><button className="btn primary full" style={{marginTop:10}} onClick={()=>router.push("/checkout?plan=monthly")}>Escolher mensal</button></div></div>
  <div className="feature" style={{marginTop:14}}><div className="badge">👤 SEU PERFIL</div><div className="profileGrid" style={{marginTop:14}}>{[["Instagram",profile.instagramProfileUrl],["Tipo de negócio",profile.businessType],["Nicho",profile.niche],["Oferta",profile.offer],["Objetivo",profile.objective],["Público",profile.audience],["Localização",profile.audienceLocation||profile.location],["Posicionamento",profile.desiredPositioning],["WhatsApp",user.phone],["Frequência",profile.postingFrequency]].map(([label,value])=><div className="card" key={label}><small className="muted">{label}</small><p style={{marginTop:6,whiteSpace:"pre-line"}}>{String(value||"—")}</p></div>)}</div><button className="btn secondary" style={{marginTop:14}} onClick={()=>router.push("/setup")}>Editar meus dados →</button></div>
  <div className="feature" style={{marginTop:14}}><div className="badge">💬 SUPORTE</div><h3 style={{marginTop:10}}>Precisa de ajuda?</h3><p className="muted" style={{marginTop:6}}>Fale com o suporte pelo WhatsApp.</p><a className="btn secondary" style={{display:"inline-block",marginTop:10}} href="https://wa.me/?text=Oi! Preciso de ajuda com o MidiaNet AI." target="_blank" rel="noreferrer">Falar com suporte →</a></div>
 </div>
}
function Create({ai,drafts,onDraftChange}:{ai:AIProfile;drafts:Draft[];onDraftChange:(d:Draft)=>void}){
 const [idea,setIdea]=useState(""); const [loading,setLoading]=useState(false); const [saving,setSaving]=useState<number|null>(null); const [options,setOptions]=useState<any[]>([]); const [error,setError]=useState("");
 const [dayIndex,setDayIndex]=useState(0); const [slotIndex,setSlotIndex]=useState(0);
 const selectedDay=ai.weeklyPlan?.[dayIndex]||ai.weeklyPlan?.[0]; const selectedSlot=selectedDay?.slots?.[slotIndex]||selectedDay?.slots?.[0];
 useEffect(()=>{setSlotIndex(0)},[dayIndex]);
 async function multiply(){if(!idea.trim())return;setLoading(true);setError("");try{const r=await fetch("/api/ai/multiply-idea",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({idea})});const x=await r.json();if(!r.ok){setError(x.error||"Não foi possível transformar a ideia.");return}setOptions(x.options||[])}catch{setError("Não foi possível conectar à IA.")}finally{setLoading(false)}}
 async function addToWeek(o:any,i:number){
   if(!selectedDay||!selectedSlot){setError("Escolha um dia e um horário.");return}
   setSaving(i);setError("");
   try{
     const slotKey=`${dayIndex}:${slotIndex}`;
     const existing=drafts.find(d=>d.slotKey===slotKey);
     const payload={status:"DRAFT",slotKey,dayLabel:selectedDay.day,timeLabel:selectedSlot.time,format:o.format,role:"Nova ideia",objective:o.objective,title:o.title,topic:idea,hook:o.hook,script:o.script,caption:o.caption,visualDirection:o.direction,cta:o.cta,conversationHistory:Array.isArray(o.executionSteps)?o.executionSteps:[]};
     const r=await fetch("/api/content-drafts",{method:existing?"PATCH":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(existing?{id:existing.id,...payload}:payload)});
     const x=await r.json();
     if(!r.ok){setError(x.error||"Não foi possível adicionar à semana.");return}
     if(x.draft)onDraftChange(x.draft);
     setOptions(v=>v.filter((_,idx)=>idx!==i));setIdea("");
   }catch{setError("Não foi possível salvar a ideia.")}finally{setSaving(null)}
 }
 return <div style={{marginTop:8}}>
  <div className="feature"><div className="badge">✨ NOVA IDEIA</div><h2 style={{marginTop:10}}>Você traz a ideia. A IA encontra 3 formatos.</h2><p className="muted" style={{marginTop:7}}>Digite do seu jeito, escolha o formato e coloque o conteúdo direto em um dia da sua semana.</p><textarea value={idea} onChange={e=>setIdea(e.target.value)} placeholder="Ex.: quero falar sobre os erros que pequenos negócios cometem no Instagram..." style={{marginTop:16,minHeight:130}}/><button className="btn primary" style={{marginTop:12}} onClick={multiply} disabled={loading}>{loading?"Criando 3 formatos...":"🚀 Transformar minha ideia"}</button>{error&&<p className="small" style={{color:"#fda4af",marginTop:10}}>{error}</p>}</div>
  {options.length>0&&<div style={{marginTop:18}}><div className="feature"><div className="badge">📅 ONDE PUBLICAR?</div><h2 style={{marginTop:10}}>Escolha o dia e o horário</h2><div className="dayTabs" style={{marginTop:12}}>{ai.weeklyPlan.map((d,i)=><button key={i} className={i===dayIndex?"active":""} onClick={()=>setDayIndex(i)}>{d.day.slice(0,3)}</button>)}</div><select value={slotIndex} onChange={e=>setSlotIndex(Number(e.target.value))} style={{marginTop:12}}>{selectedDay?.slots?.map((s,j)=><option key={j} value={j}>{s.time} · {s.format} · {s.title}</option>)}</select><p className="small muted" style={{marginTop:8}}>A ideia escolhida substituirá o conteúdo desse horário na sua semana.</p></div>
   <h2 style={{marginTop:20}}>Escolha um formato</h2><div style={{display:"grid",gap:12,marginTop:12}}>{options.map((o,i)=><div className="card" key={i}><div className="row-between"><span className="badge">{i+1} · {o.format}</span><span className="small muted">{o.angle}</span></div><h3 style={{marginTop:10}}>{o.title}</h3><p style={{marginTop:8}}><strong>🪝 {o.hook}</strong></p><div className="small muted" style={{marginTop:8}}><strong>Roteiro:</strong> {o.script}</div><div className="small muted" style={{marginTop:8}}><strong>Legenda:</strong> {o.caption}</div><div className="small" style={{marginTop:8}}>CTA: {o.cta}</div><button className="btn primary" style={{marginTop:12}} onClick={()=>addToWeek(o,i)} disabled={saving===i}>{saving===i?"Salvando na semana...":"＋ Adicionar à minha semana"}</button></div>)}</div>
  </div>}
 </div>
}