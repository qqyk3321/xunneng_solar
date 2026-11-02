// Synthetic local credentials only. Never import into application code.
import { createHmac } from "node:crypto";
const jwtSecret='native-test-jwt-secret-at-least-32-characters';
const part=v=>Buffer.from(JSON.stringify(v)).toString('base64url');
const data=part({alg:'HS256',typ:'JWT'})+'.'+part({role:'service_role',iss:'native-local-test',exp:4102444800});
const key=data+'.'+createHmac('sha256',jwtSecret).update(data).digest('base64url');
export const localEnv={...process.env,NODE_ENV:'development',SITE_URL:'http://127.0.0.1:3136',NATIVE_CONSULTATION_ENABLED:'true',NATIVE_CONSULTATION_PRIMARY:'false',
  CONSULTATION_ENVIRONMENT:'local',CONSULTATION_DATABASE_URL:'http://127.0.0.1:3138',CONSULTATION_DATABASE_KEY:key,
  CONSULTATION_TOKEN_SECRET:'native-local-token-secret-at-least-32-characters',CONSULTATION_WORKER_SECRET:'native-local-worker-secret-at-least-32-characters',
  CONSULTATION_SITE_URL:'http://127.0.0.1:3136',CONSULTATION_EMAIL_MODE:'send',CONSULTATION_LOCAL_MAIL_ENDPOINT:'http://127.0.0.1:3138/mail',CONSULTATION_TEST_EMAILS:'native-test@example.com',
  RESEND_API_KEY:'local-not-a-real-key',RESEND_FROM_EMAIL:'test@example.com',RESEND_TEMPLATE_ID:'local-template',ANTIGUA_SUPPORT_EMAIL:'test@example.com',DOMINICA_SUPPORT_EMAIL:'test@example.com',CONTACT_UPSTASH_ENABLED:'false',
  SUPABASE_URL:'http://127.0.0.1:3138',SUPABASE_SERVICE_ROLE_KEY:key,SUPABASE_SECRET_KEY:key,NEXT_PUBLIC_SUPABASE_URL:'http://127.0.0.1:3138',NEXT_PUBLIC_SUPABASE_ANON_KEY:'local-only',
  STAFF_SUPABASE_URL:'http://127.0.0.1:3138',STAFF_SUPABASE_SECRET_KEY:key,STAFF_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_local_fixture',
  STAFF_AUTH_SUPABASE_URL:'http://127.0.0.1:3138',STAFF_AUTH_SUPABASE_ANON_KEY:'local-only',STAFF_AUTH_SUPABASE_SERVICE_ROLE_KEY:key};
for(const name of ['VERCEL','VERCEL_URL','VERCEL_ENV','VERCEL_PROJECT_PRODUCTION_URL']) delete localEnv[name];
