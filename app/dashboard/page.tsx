"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type PlanItem={day:string;format:string;idea:string;hook:string;cta:string};
type AIProfile={positioning:string;audience:string;painPoints:string[];desires:string[];contentPillars:string[];tone:string[];contentFormats:string[];ctaStrategy:string;conversionStrategy:string;strengths:string[];opportunities:string[];weeklyPlan:PlanItem[];summary:string};
type Profile=Record<string,any>&{aiProfile?:AIProfile|null;aiAnalyzedAt?:string|null};
type Me={user:{name:string|null;email:string;strategicProfile:Profile|null;socialAccounts:{id:string;platform:string;username:string|null}[]}};

const tabs = [["overview","🏠 Visão geral"],["dna","🧬 Meu DNA"],["ideas","💡 Ideias"],["scripts","🎬 Roteiros"],["captions","✍️ Legendas"],["planner","📅 Planejamento"],["results","📊 Resultados"],["profile","👤 Meu perfil"]] as const;

export default function Dashboard(){
 const router=useRouter(); const [data,setData]=useState<Me|null>(null); const [loading,setLoading]=useState(true); const [tab,setTab]=useState("overview"); const [analyzing,setAnalyzing]=useState(false); const [error,setError]=useState("");
 useEffect(()=>{fetch("/api/auth/me").then(async r=>{if(!r.ok){router.replace("/login");return null}return r.json()}).then(x=>{if(x){if(!x.user.strategicProfile?.onboardingCompletedAt){router.replace("/setup");return}setData(x)}}).finally(()=>setLoading(false))},[router]);
 async function logout(){await fetch("/api/auth/logout",{method:"POST"});router.replace("/")}
 async function analyze(){setAnalyzing(true);setError("");try{const r=await fetch("/api/ai/analyze-profile",{method:"POST"});const x=await r.json();if(!r.ok){setError(x.error||"Não foi possível analisar.");return}setData(d => {\n      if (!d || !d.user.strategicProfile) return d;\n      return { ...d, user: { ...d.user, strategicProfile: { ...d.user.strategicProfile, aiProfile: x.aiProfile, aiAnalyzedAt: x.aiAnalyzedAt } } };\n    });setTab("dna")}catch{setError("Não foi possível conectar à IA.")}finally{setAnalyzing(false)}}
 if(loading)return <main className="auth"><div className="authbox"><p className="muted">Carregando seu painel...</p></div></main>;
 if(!data)return null; const p=data.user.strategicProfile!; const ai=p.aiProfile; const plan=ai?.weeklyPlan||[]; const activeTitle=tabs.find(x=>x[0]===tab)?.[1]||"Painel";
 return <main className="page"><nav className="nav"><div className="logo">MidiaNet<span>AI</span></div><button className="muted" onClick={logout} style={{background:"none",border:0,cursor:"pointer"}}>Sair</button></nav>
 <section className="section" style={{paddingTop:28}}>
  <div style={{display:"flex",gap:10,overflowX:"auto",paddingBottom:8}}>{tabs.map(([id,label])=><button key={id} className={tab===id?"btn primary":"btn secondary"} onClick={()=>setTab(id)} style={{whiteSpace:"nowrap"}}>{label}</button>)}</div>
  <div style={{marginTop:28}}><div className="badge">{activeTitle}</div><h1 style={{fontSize:40,letterSpacing:-2,margin:"16px 0 8px"}}>Olá, {data.user.name||"criador"}.</h1><p className="muted">Sua estratégia, conteúdo e evolução em um só lugar.</p></div>
  {error&&<p className="small" style={{color:"#fda4af",marginTop:14}}>{error}</p>}
  {tab==="overview"&&<Overview p={p} ai={ai} plan={plan} analyzing={analyzing} analyze={analyze}/>}
  {tab==="dna"&&<DNA ai={ai}/>}
  {tab==="ideas"&&<ContentList title="💡 Banco de ideias" items={plan.map(x=>({title:x.idea,meta:x.format,body:"Hook: "+x.hook+" · CTA: "+x.cta}))} empty="A IA vai gerar ideias depois da análise estratégica."/>}
  {tab==="scripts"&&<ContentList title="🎬 Roteiros" items={plan.filter(x=>/reel|vídeo/i.test(x.format)).map(x=>({title:x.idea,meta:x.format,body:"Abertura: "+x.hook+"\nCTA: "+x.cta}))} empty="Os roteiros serão construídos a partir das ideias e formatos escolhidos."/>}
  {tab==="captions"&&<ContentList title="✍️ Legendas" items={plan.map(x=>({title:x.idea,meta:x.format,body:"Comece com: "+x.hook+"\nFinalize com: "+x.cta}))} empty="As legendas aparecerão aqui conforme o conteúdo for planejado."/>}
  {tab==="planner"&&<Planner plan={plan}/>}
  {tab==="results"&&<div style={{marginTop:20}}><div className="feature"><h3>📊 Resultados</h3><p>Esta área será alimentada pelas métricas dos conteúdos. A integração oficial do Instagram poderá trazer métricas reais para comparar desempenho e ajustar os próximos planos.</p></div></div>}
  {tab==="profile"&&<div style={{marginTop:20}}><div className="feature"><h3>👤 Seu diagnóstico</h3><p><strong>Nicho:</strong> {p.niche||"—"}</p><p><strong>Oferta:</strong> {p.offer||"—"}</p><p><strong>Posicionamento:</strong> {p.desiredPositioning||"—"}</p><p><strong>Formatos:</strong> {Array.isArray(p.contentPreferences)?p.contentPreferences.join(", "):"—"}</p><button className="btn secondary" onClick={()=>router.push("/setup")} style={{marginTop:16}}>Editar diagnóstico</button></div></div>}
 </section></main>;
}

function Overview({p,ai,plan,analyzing,analyze}:{p:Profile;ai:AIProfile|null|undefined;plan:PlanItem[];analyzing:boolean;analyze:()=>void}){
 return <div>{!ai?<div className="feature" style={{marginTop:20}}><h3>🧠 Criar seu DNA estratégico</h3><p>Seu diagnóstico está completo. A IA vai cruzar suas respostas com informações públicas disponíveis sobre o perfil e montar sua estratégia.</p><button className="btn primary" onClick={analyze} disabled={analyzing} style={{marginTop:16}}>{analyzing?"Analisando seu perfil...":"Criar meu DNA estratégico →"}</button></div>:<><div className="grid3" style={{marginTop:22}}><div className="feature"><h3>🧬 Posicionamento</h3><p>{ai.positioning}</p></div><div className="feature"><h3>👥 Público</h3><p>{ai.audience}</p></div><div className="feature"><h3>🎯 Conversão</h3><p>{ai.conversionStrategy}</p></div></div><div className="feature" style={{marginTop:20}}><h3>📅 Próximos conteúdos</h3>{plan.slice(0,3).map((x,i)=><div className="card" key={i} style={{marginTop:10}}><strong>{x.day} · {x.format}</strong><p style={{marginTop:6}}>{x.idea}</p><span className="small muted">Hook: {x.hook}</span></div>)}</div></>}</div>
}

function DNA({ai}:{ai:AIProfile|null|undefined}){return <div style={{marginTop:20}}>{ai?<><div className="grid3"><div className="feature"><h3>Posicionamento</h3><p>{ai.positioning}</p></div><div className="feature"><h3>Público</h3><p>{ai.audience}</p></div><div className="feature"><h3>Tom</h3><p>{ai.tone.join(" · ")}</p></div></div><div className="feature" style={{marginTop:16}}><h3>Resumo estratégico</h3><p>{ai.summary}</p><div className="grid3" style={{marginTop:18}}><div><strong>Forças</strong><ul>{ai.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><strong>Oportunidades</strong><ul>{ai.opportunities.map((x,i)=><li key={i}>{x}</li>)}</ul></div><div><strong>Dores</strong><ul>{ai.painPoints.map((x,i)=><li key={i}>{x}</li>)}</ul></div></div></div><div className="feature" style={{marginTop:16}}><h3>Pilares de conteúdo</h3><div className="grid3">{ai.contentPillars.map((x,i)=><div className="card" key={i}><strong>{x}</strong></div>)}</div></div></>:<div className="feature"><h3>DNA ainda não criado</h3><p>Inicie a análise na Visão geral.</p></div>}</div>}

function Planner({plan}:{plan:PlanItem[]}){return <div style={{marginTop:20}}><div className="feature"><h3>📅 Plano semanal</h3>{plan.length?plan.map((x,i)=><div key={i} className="card" style={{marginTop:10}}><strong>{x.day} · {x.format}</strong><p style={{marginTop:6}}>{x.idea}</p><p className="small muted" style={{marginTop:6}}>Hook: {x.hook} · CTA: {x.cta}</p></div>):<p>Nenhum plano ainda.</p>}</div></div>}

function ContentList({title,items,empty}:{title:string;items:{title:string;meta:string;body:string}[];empty:string}){return <div style={{marginTop:20}}><div className="feature"><h3>{title}</h3>{items.length?items.map((x,i)=><div className="card" key={i} style={{marginTop:10}}><small>{x.meta}</small><strong style={{display:"block",fontSize:18,marginTop:5}}>{x.title}</strong><p style={{whiteSpace:"pre-line",marginTop:8}}>{x.body}</p></div>):<p>{empty}</p>}</div></div>}
