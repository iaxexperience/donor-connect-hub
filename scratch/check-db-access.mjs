import fs from 'node:fs';
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(x=>/^\s*[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return[x.slice(0,i).trim(),x.slice(i+1).trim().replace(/^['"]|['"]$/g,'')]}));
const configured=new URL(env.VITE_SUPABASE_URL).hostname.split('.')[0];
const linked=fs.readFileSync('supabase/.temp/project-ref','utf8').trim();
console.log(JSON.stringify({configuredProjectMatchesLinked:configured===linked,hasPublicKey:!!env.VITE_SUPABASE_ANON_KEY,hasServiceRoleKey:!!env.SUPABASE_SERVICE_ROLE_KEY,hasDatabaseUrl:!!(env.DATABASE_URL||env.SUPABASE_DB_URL)}));
for(const table of ['white_label_settings','profiles','routes','route_items','receipts','system_settings']){
 const response=await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/${table}?select=*&limit=0`,{headers:{apikey:env.VITE_SUPABASE_ANON_KEY,Authorization:`Bearer ${env.VITE_SUPABASE_ANON_KEY}`}});
 const body=await response.json();console.log(JSON.stringify({table,http:response.status,code:body.code||null,message:body.message||null}));
}
