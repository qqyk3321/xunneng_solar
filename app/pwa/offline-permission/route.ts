import { cookies } from "next/headers";
import { PWA_ACCESS_COOKIE, pwaCookieIsValid } from "@/app/solar-analysis/access";

export const dynamic = "force-dynamic";
export async function GET() {
  const authorized = pwaCookieIsValid((await cookies()).get(PWA_ACCESS_COOKIE)?.value);
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (!authorized) return Response.json({ error: "请到 /pwa 输入下载密码，再准备离线资源。" }, { status: 401, headers });
  if (process.env.NODE_ENV !== "production") return Response.json({ error: "离线功能需要生产构建，请使用 build 后的服务测试。" }, { status: 409, headers });
  return Response.json({ authorized: true }, { headers });
}
