const fs = await import('node:fs');
const env=Object.fromEntries(fs.readFileSync('.env','utf8').split(/\r?\n/).filter(x=>/^[A-Z_]+=/.test(x)).map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1).replace(/^['"]|['"]$/g,'')]}));
const base=env.VITE_SUPABASE_URL;const key=env.VITE_SUPABASE_ANON_KEY;
if(!base||!key)throw new Error('Missing public Supabase configuration');
const response=await fetch(base+'/rest/v1/white_label_settings?select=id&limit=1',{headers:{apikey:key,Authorization:'Bearer '+key}});
const data=await response.json();console.log(JSON.stringify({http:response.status,result:Array.isArray(data)?{visibleRows:data.length}:data}));
