// Loopback-only in-memory backend for regression tests. No real accounts or database.
import http from 'node:http';
import {createHash} from 'node:crypto';
const fixtures=['AG','DM','legacy'].map((label,i)=>({
 label,token:`cleanup-fixture-${label}-`.padEnd(43,'x'),
 submission:{submission_id:`preview-test-${label}`,country_code:label==='DM'?'DM':'AG',name:'Regression fixture',email:'fixture@example.test',phone:'+12685550123',address:{},preview_url:'https://tally.so/forms/fixture/submissions/fixture/preview',submitted_at:'2026-10-10T13:10:00Z',monthly_kwh:i===2?null:300,consumption_profile:i===2?null:'night'},
}));
let compensation=500;const rows=new Map();let writes=0;
const prices=()=>({id:1,version:1,inverter_5kw_usd:800,inverter_8kw_usd:1100,inverter_10kw_usd:1200,battery_5kwh_usd:600,panel_usd:100,price_multiplier:4,compensation_xcd:compensation,updated_at:'2026-10-12T00:00:00Z'});
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');let status=200,data;
 if(url.pathname==='/fixtures')data=fixtures;
 else if(url.pathname==='/control'&&req.method==='POST'){let body='';for await(const c of req)body+=c;compensation=JSON.parse(body).compensation;data={ok:true};}
 else if(url.pathname==='/stats')data={writes};
 else if(url.pathname==='/rest/v1/consultation_preview_tokens'){
  const hash=url.searchParams.get('token_hash')?.slice(3);const fixture=fixtures.find(f=>createHash('sha256').update(f.token).digest('hex')===hash);
  data=fixture?[{tally_form_submissions:fixture.submission}]:[];
 }else if(url.pathname==='/rest/v1/quote_pricing_settings')data=prices();
 else if(url.pathname==='/rest/v1/tally_form_submissions')data=[];
 else if(url.pathname==='/rest/v1/island_wishlist'&&req.method==='POST'){writes++;data=null;}
 else if(url.pathname==='/rest/v1/anonymous_inquiries_preview'){
  if(req.method==='GET'){const id=url.searchParams.get('id')?.slice(3);data=rows.has(id)?[rows.get(id)]:[];}
  else if(req.method==='POST'){let body='';for await(const c of req)body+=c;const row={...JSON.parse(body),created_at:new Date().toISOString()};rows.set(row.id,row);writes++;status=201;data=row;}
  else status=405;
 }else{status=404;data={error:'Unmocked endpoint'};}
 res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data??null));
});
server.listen(3199,'127.0.0.1',()=>console.log('Loopback fixture backend ready on 3199'));
