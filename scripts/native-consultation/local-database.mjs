// Creates an isolated Docker fixture. Does not inspect project .env files.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const postgres='xunneng-native-test-20261029', rest='xunneng-native-rest-20261029', network=postgres;
const docker=(args,options={})=>execFileSync('docker',args,{stdio:'pipe',...options});
const exists=(type,name)=>{try{docker([type,'inspect',name]);return true;}catch{return false;}};
if(process.argv.includes('--stop')) {
  for(const name of [rest,postgres]) if(exists('container',name)) docker(['stop',name]);
  console.log('Local fixture containers stopped; data retained.');process.exit(0);
}
if(!exists('network',network)) docker(['network','create',network]);
const fresh=!exists('container',postgres);
if(fresh) docker(['run','-d','--name',postgres,'--network',network,'-p','127.0.0.1:55489:5432','-e','POSTGRES_PASSWORD=native-local-only','-e','POSTGRES_DB=consultations','postgres:17-alpine']);
else docker(['start',postgres]);
let ready=false;
for(let n=0;n<60;n++){try{docker(['exec',postgres,'pg_isready','-U','postgres','-d','consultations']);ready=true;break;}catch{await new Promise(r=>setTimeout(r,500));}}
if(!ready)throw Error('Local PostgreSQL did not become ready');
if(fresh) for(const file of ['tests/fixtures/native-consultation/bootstrap.sql','supabase/migrations/20261029062138_native_consultations.sql','supabase/migrations/20261030011931_consultation_self_service.sql','supabase/migrations/20261030025725_consultation_request_context.sql','supabase/migrations/20261030034426_consultation_native_only_views.sql','tests/fixtures/native-consultation/seed.sql'])
  docker(['exec','-i',postgres,'psql','-U','postgres','-d','consultations','-v','ON_ERROR_STOP=1'],{input:readFileSync(file)});
if(!exists('container',rest)) docker(['run','-d','--name',rest,'--network',network,'-p','127.0.0.1:55490:3000',
  '-e',`PGRST_DB_URI=postgres://authenticator:native-local-only@${postgres}:5432/consultations`,
  '-e','PGRST_DB_ANON_ROLE=anon','-e','PGRST_JWT_SECRET=native-test-jwt-secret-at-least-32-characters','public.ecr.aws/supabase/postgrest:v14.12']);
else docker(['start',rest]);
console.log('Local PostgreSQL :55489 and PostgREST :55490 ready. Existing fixture data was retained.');
