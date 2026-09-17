import { cookies } from "next/headers";
import { accessCookieIsValid, SOLAR_ACCESS_COOKIE } from "../access";

export const dynamic = "force-dynamic";

export async function GET() {
  const cookieStore = await cookies();
  const authorized = accessCookieIsValid(cookieStore.get(SOLAR_ACCESS_COOKIE)?.value);
  const headers = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };
  if (!authorized) return Response.json({ error: "请联网重新输入访问密码，再准备离线资源。" }, { status: 401, headers });
  if (process.env.NODE_ENV !== "production") return Response.json({ error: "离线功能需要生产构建，请使用本地 build 后的服务测试；开发模式不缓存热更新文件。" }, { status: 409, headers });
  return Response.json({ authorized: true }, { headers });
}
