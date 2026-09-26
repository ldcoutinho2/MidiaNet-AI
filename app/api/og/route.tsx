import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    <div style={{width:"1200px",height:"630px",display:"flex",flexDirection:"column",justifyContent:"center",padding:"70px",background:"linear-gradient(135deg,#09090b,#24102e,#7b164d)",color:"white",fontFamily:"Arial"}}>
      <div style={{fontSize:30,fontWeight:800,color:"#f472b6"}}>MidiaNet AI</div>
      <div style={{fontSize:68,fontWeight:900,lineHeight:1.05,marginTop:28}}>Sua semana de posts<br/>pronta em 5 minutos.</div>
      <div style={{fontSize:27,marginTop:26,color:"#e4e4e7"}}>Diagnóstico + estratégia + conteúdo pronto para Instagram.</div>
      <div style={{display:"flex",marginTop:38,fontSize:24,fontWeight:800,color:"#111",background:"#facc15",padding:"14px 22px",borderRadius:16}}>2 dias grátis · sem cartão</div>
    </div>,
    {width:1200,height:630}
  );
}