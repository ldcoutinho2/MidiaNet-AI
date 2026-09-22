"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function ConnectInstagram() {
 const router=useRouter(); const [account,setAccount]=useState<any>(null); const [loading,setLoading]=useState(true); const [message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/auth/me").then(r=>r.json()).then(x=>{if(!x.authenticated){router.replace("/login");return}setAccount(x.user.socialAccounts?.[0]||null)}).finally(()=>setLoading(false))},[router]);
 async function connect(){setMessage("A conexão oficial do Instagram será ativada aqui quando as credenciais Meta do aplicativo estiverem configuradas.");}
 if(loading)return <main className="auth"><div className="authbox"><p className="muted">Verificando conexão...</p></div></main>;
 return <main className="auth"><div className="authbox" style={{width:"min(760px,100%)"}}>
   <div className="badge">📸 Instagram</div><h1 style={{marginTop:14}}>{account?"Instagram conectado":"Conecte seu Instagram"}</h1>
   {account?<><p className="muted">Conta conectada: @{account.username||"perfil"}</p><button className="btn primary" style={{marginTop:18}} onClick={()=>router.push("/setup")}>Continuar para o diagnóstico →</button></>:<><p className="muted" style={{lineHeight:1.6,marginTop:7}}>Conecte uma conta profissional para o MidiaNet AI poder trabalhar com métricas e evolução do perfil quando a integração estiver ativa.</p><div className="feature" style={{marginTop:18}}><strong>O que essa conexão vai permitir</strong><p className="small muted" style={{marginTop:8}}>• acompanhar seguidores e alcance<br/>• analisar desempenho dos conteúdos<br/>• comparar semanas<br/>• alimentar os ajustes da estratégia<br/>• preparar publicação e gestão de conteúdo</p></div><button className="btn primary" style={{marginTop:18}} onClick={connect}>Conectar com Instagram</button>{message&&<p className="small muted" style={{marginTop:12}}>{message}</p>}<button className="btn secondary" style={{marginTop:10}} onClick={()=>router.push("/setup")}>Continuar sem conectar →</button></>}</div></main>;
}
