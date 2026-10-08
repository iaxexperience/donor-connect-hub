import { supabase } from '@/integrations/supabase/client';
export interface Branding { system_name:string;logo_url:string;primary_color:string;secondary_color:string;cnpj?:string;address?:string;phone?:string;email?:string }
export const BRANDING_EVENT='donorconnect:branding-saved';
export function publishBranding(value:Branding){
 try { localStorage.setItem('white_label_settings',JSON.stringify(value)); } catch { /* DB remains authoritative when storage is full. */ }
 window.dispatchEvent(new CustomEvent(BRANDING_EVENT,{detail:value}));
}
export async function loadBranding():Promise<Branding>{
 const {data,error}=await supabase.from('white_label_settings').select('*').eq('id',1).single();
 if(error) throw error;
 return data;
}
export async function logoForPDF(url:string):Promise<string|null>{
 if(!url)return null;
 return new Promise(resolve=>{
 const img=new Image();img.crossOrigin='anonymous';
 const timeout=window.setTimeout(()=>resolve(null),8000);
 img.onload=()=>{clearTimeout(timeout);try{const canvas=document.createElement('canvas');canvas.width=400;canvas.height=160;const ctx=canvas.getContext('2d')!;const scale=Math.min(400/img.width,160/img.height);ctx.drawImage(img,(400-img.width*scale)/2,(160-img.height*scale)/2,img.width*scale,img.height*scale);resolve(canvas.toDataURL('image/png'));}catch{resolve(null);}};
 img.onerror=()=>{clearTimeout(timeout);resolve(null);};img.src=url;
 });
}
