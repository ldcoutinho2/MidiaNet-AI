import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getEntitlement } from "@/lib/entitlements";
export async function GET(){
 const user=await getCurrentUser();
 if(!user)return NextResponse.json({error:"Não autenticado."},{status:401});
 const e=await getEntitlement(user.id);
 return NextResponse.json({ok:true,entitlement:{
  active:e.active,
  trialActive:e.trialActive,
  paidActive:e.paidActive,
  contentRemaining:e.contentRemaining,
  contentLimit:e.contentLimit,
  imageRemaining:e.imageRemaining,
  imageLimit:e.imageLimit,
  contentUsed:e.contentUsed,
  imageUsed:e.imageUsed
}});
}