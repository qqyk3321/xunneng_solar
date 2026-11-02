// Local-only PostgREST proxy and idempotent mail stub; never part of the app runtime.
import http from 'node:http';
const deliveries = new Map(); let failNext = false;
http.createServer(async (req,res) => {
  try {
    let body=''; for await (const chunk of req) { body+=chunk; if(body.length>2_000_000) throw Error('too large'); }
    const path = req.url || '/';
    if(path.startsWith('/rest/v1/')) {
      const upstream = await fetch('http://127.0.0.1:55490/'+path.slice('/rest/v1/'.length), {method:req.method,headers:Object.fromEntries(Object.entries(req.headers).filter(([k])=>!['host','connection','content-length'].includes(k))),...(body?{body}:{})});
      res.writeHead(upstream.status,Object.fromEntries([...upstream.headers].filter(([k])=>!['content-encoding','transfer-encoding'].includes(k)))); res.end(await upstream.text()); return;
    }
    if(path==='/mail' && req.method==='POST') {
      if(failNext) {failNext=false;res.writeHead(503,{'Content-Type':'application/json'});res.end('{"error":"temporary"}');return;}
      const key=req.headers['idempotency-key'];
      if(!key) throw Error('missing idempotency key');
      if(!deliveries.has(key)) deliveries.set(key,{id:'mail-'+(deliveries.size+1),body:JSON.parse(body)});
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({id:deliveries.get(key).id}));return;
    }
    if(path==='/__test/fail-next-mail' && req.method==='POST'){failNext=true;res.end('ok');return;}
    if(path==='/__test/mail-count'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({count:deliveries.size}));return;}
    if(path==='/__test/deliveries'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify([...deliveries.values()]));return;}
    res.writeHead(404);res.end();
  } catch {res.writeHead(500);res.end('local fixture error');}
}).listen(3138,'127.0.0.1',()=>console.log('Local database proxy and mail stub: http://127.0.0.1:3138'));
