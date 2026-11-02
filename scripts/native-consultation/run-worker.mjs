// Run from a scheduler or as a supervised service. Reads only explicit env vars.
// node scripts/native-consultation/run-worker.mjs --once
const base=new URL(process.env.CONSULTATION_SITE_URL||'');
const secret=process.env.CONSULTATION_WORKER_SECRET;
if(!secret || secret.length<32 || (base.protocol!=='https:' && !['localhost','127.0.0.1'].includes(base.hostname)))throw Error('Worker URL/secret missing or invalid');
const endpoint=new URL('/api/consultations/process-notifications',base);
let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});
do {
  try {
    const response=await fetch(endpoint,{method:'POST',headers:{Authorization:`Bearer ${secret}`},signal:AbortSignal.timeout(65_000)});
    if(!response.ok)throw Error(`Worker returned ${response.status}`);
    const {accepted,pending,failed}=await response.json();
    console.log(JSON.stringify({time:new Date().toISOString(),accepted,pending,failed}));
  } catch(error) { console.error(error instanceof Error?error.message:'Worker request failed');if(process.argv.includes('--once'))process.exitCode=1; }
  if(process.argv.includes('--once'))break;
  // Await the current batch before starting another; database leases also protect multiple workers.
  for(let i=0;i<60 && !stopped;i++)await new Promise(resolve=>setTimeout(resolve,1000));
} while(!stopped);
