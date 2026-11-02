"""Isolated staff UI fixture. Auth stubs are never written into the real app."""
from pathlib import Path
import shutil,tempfile
src=Path(__file__).resolve().parents[2]/'ticket-query-local'
out=Path(tempfile.mkdtemp(prefix='xunneng-native-staff-'))
shutil.copytree(src,out,dirs_exist_ok=True,ignore=shutil.ignore_patterns('node_modules','.next','.git','.vercel','.env*','*.tsbuildinfo'))
(out/'node_modules').symlink_to(src/'node_modules',target_is_directory=True)
(out/'middleware.ts').unlink(missing_ok=True)
(out/'lib/auth/server.ts').write_text('''import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { nativeDatabase } from "../submissions/native";
export type StaffProfile={id:string;email:string;display_name:string;role:"employee"|"admin";status:"active"|"pending"|"disabled";created_at:string};
const profile:StaffProfile={id:"010c98ce-d3ed-420b-ad3a-c5a39f34c179",email:"staff@example.com",display_name:"Test employee",role:"admin",status:"active",created_at:"2026-10-29T00:00:00Z"};
export async function currentStaff(){if((await cookies()).get("fixture-denied")?.value==="true")return null;return {user:{id:profile.id,email:profile.email},profile};}
export async function requireStaff(){const staff=await currentStaff();if(!staff)redirect("/login");return staff;}
export const requireAdmin=requireStaff;
export async function authClient(){return nativeDatabase();}
''')
(out/'app/api/staff/activity/route.ts').write_text('export async function POST(){return Response.json({ok:true});}\n')
print(out)
