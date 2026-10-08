import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { signReceipt, verifyReceipt } from '../_shared/receiptSignature.ts';
const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info', 'Cache-Control': 'no-store', 'Content-Type': 'application/json' };
Deno.serve(async req => {
 if(req.method==='OPTIONS') return new Response('ok',{headers});
 const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{headers,status});
 if(req.method!=='POST') return reply({error:'Método inválido'},405);
 try {
 const body=await req.json();
 const secret=Deno.env.get('RECEIPT_SIGNING_SECRET')!;
 const url=Deno.env.get('SUPABASE_URL')!;
 if(body.action==='verify') {
 const id=await verifyReceipt(body.hash,secret);
 if(!id) return reply({status:'invalid'});
 const db=createClient(url,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
 const {data:r,error}=await db.from('receipts').select('number,status,issued_at,organization,route_items(snapshot)').eq('id',id).maybeSingle();
 if(error) throw error;
 if(!r) return reply({status:'invalid'});
 const s=r.route_items.snapshot;
 // Never expose donor address, phone, document or courier document publicly.
 return reply({status:r.status,number:r.number,issued_at:r.issued_at,organization:r.organization.name,contact:r.organization.phone,donor:s.donor_name.split(' ').map((v:string,i:number)=>i===0?v:v[0]+'.').join(' '),description:s.description,quantity:s.quantity,amount:s.amount});
 }
 const db=createClient(url,Deno.env.get('SUPABASE_ANON_KEY')!,{global:{headers:{Authorization:req.headers.get('Authorization')||''}}});
 const {data:{user},error:authError}=await db.auth.getUser();
 if(authError||!user) return reply({error:'Não autorizado'},401);
 if(body.action!=='routes') return reply({error:'Ação inválida'},400);
 const {data,error}=await db.from('routes').select('*,route_items(*,receipts(*))').order('dispatched_at',{ascending:false}).limit(100);
 if(error) throw error;
 const origin=Deno.env.get('PUBLIC_APP_URL');
 if(!origin || !origin.startsWith('https://')) throw new Error('Configure PUBLIC_APP_URL HTTPS');
 for(const route of data||[]) for(const item of route.route_items) for(const receipt of item.receipts) {
 receipt.verification_url=`${origin.replace(/\/$/,'')}/validar-recibo?hash=${await signReceipt(receipt.id,secret)}`;
 }
 return reply(data);
 } catch { return reply({error:'Serviço indisponível. Tente novamente.'},503); }
});
