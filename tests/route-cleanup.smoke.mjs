// Read-only by default. Local integration mode talks only to the loopback fixture backend.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {randomUUID} from 'node:crypto';
const origin=process.env.HOME_TEST_ORIGIN;
assert.ok(origin);
let bypass;
if(process.env.VERCEL_AUTH_FILE){
 const {token}=JSON.parse(fs.readFileSync(process.env.VERCEL_AUTH_FILE));
 const response=await fetch('https://api.vercel.com/v9/projects/prj_V9hqlf9ybbaco7V56luBpw6eMJzr?teamId=team_R29wiwcEoeAPJbdxNgrOsajx',{headers:{Authorization:`Bearer ${token}`}});
 assert.ok(response.ok);const project=await response.json();bypass=Object.keys(project.protectionBypass||{})[0];
}
async function request(path,options={}){
 const headers={...options.headers,...(bypass?{'x-vercel-protection-bypass':bypass}:{})};
 return fetch(origin+path,{...options,headers,redirect:'manual'});
}
const publicPaths=['/','/privacy',...['antigua','dominica'].flatMap(r=>['','/consultation','/faq','/how-it-works'].map(s=>'/'+r+s))];
for(const path of publicPaths){
 const response=await request(path);assert.equal(response.status,200,path);
 const html=await response.text();assert.match(html,/<main/);assert.match(html,/<link[^>]+rel="canonical"/);
}
const retired=JSON.parse(fs.readFileSync(new URL('./fixtures/retired-routes.json',import.meta.url)));
for(const {path,methods} of retired){
 for(const method of methods){
  const response=await request(path.replace('[id]','4583a8b3-a6a3-435d-b332-bfab81c1fb91'),{method});
  assert.equal(response.status,404,`${method} ${path}`);assert.equal(response.headers.get('location'),null,path);
 }
}
for(const path of ['/consultation','/faq','/how-it-works','/antigua/privacy','/dominica/privacy','/quote-settings','/solution-suggest','/solar-analysis','/pwa'])assert.equal((await request(path)).status,404,path);
const sitemap=await (await request('/sitemap.xml')).text();
assert.equal((sitemap.match(/<loc>/g)||[]).length,10);assert.doesNotMatch(sitemap,/submission|preview|test-pages/);
for(const path of ['/robots.txt','/opengraph-image','/icon.svg'])assert.equal((await request(path)).status,200,path);
for(const path of ['/api/contact','/api/island-wishlist'])assert.equal((await request(path)).status,405,path);
assert.equal((await request('/api/cron/supabase-keepalive')).status,401);
console.log(`PASS ${publicPaths.length} public pages, ${retired.length} retired routes and legacy paths, metadata, API methods and cron protection`);
if(process.env.LOCAL_FIXTURE_INTEGRATION==='1'){
 assert.equal(new URL(origin).hostname,'127.0.0.1');
 for(const path of ['/api/contact','/api/island-wishlist']){
  assert.equal((await request(path,{method:'POST',headers:{origin:'https://evil.example'}})).status,403);
 }
 const id=randomUUID();const body=new FormData();body.set('requestId',id);body.set('email','fixture@example.test');body.set('country_code','AG');body.set('website','');body.set('format','plain');body.set('content',JSON.stringify({type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Local isolated regression message.'}]}]}));
 const save=()=>request('/api/contact',{method:'POST',headers:{origin:'https://release-check.example'},body});
 for(let n=0;n<2;n++){const response=await save();assert.equal(response.status,201);assert.equal((await response.json()).reference,id);}
 assert.equal((await request('/api/island-wishlist',{method:'POST',headers:{origin:'https://release-check.example','content-type':'application/json'},body:JSON.stringify({email:'fixture@example.test',islandCode:'OTHER',otherIsland:'Fixture island'})})).status,200);
 assert.equal((await request('/api/cron/supabase-keepalive',{headers:{authorization:'Bearer fixture-cron'}})).status,200);
 const stats=await fetch('http://127.0.0.1:3199/stats').then(r=>r.json());assert.equal(stats.writes,2,'contact retry must not create a second record');
 console.log('PASS real local API handlers: origin protection, contact persistence/idempotency, wishlist and authorized cron (in-memory backend only)');
}
