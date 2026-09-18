import { cookies } from "next/headers";
import { PWA_ACCESS_COOKIE, pwaCookieIsValid } from "@/app/solar-analysis/access";
import { unlockPwaDownload } from "./actions";
import OfflineTools from "./offline-tools";

export const dynamic = "force-dynamic";

export default async function PwaPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const authorized = pwaCookieIsValid((await cookies()).get(PWA_ACCESS_COOKIE)?.value);
  if (authorized) return <OfflineTools />;
  const { error } = await searchParams;
  return <main className="solar-lock-page"><section className="solar-lock-card" aria-labelledby="pwa-lock-title">
    <div className="solar-lock-mark" aria-hidden="true">S</div>
    <p className="solar-lock-eyebrow">SOL &amp; TIDE · OFFLINE DOWNLOAD</p>
    <h1 id="pwa-lock-title">离线应用下载</h1>
    <p className="solar-lock-copy">请输入专用密码，下载和安装本地分析工具。下载完成后，离线应用无需登录。</p>
    <form action={unlockPwaDownload} className="solar-lock-form">
      <label htmlFor="pwa-password">下载密码</label>
      <input id="pwa-password" name="password" type="password" autoComplete="current-password" required autoFocus />
      {error === "invalid_password" && <p className="solar-lock-error" role="alert">密码不正确，请重新输入。</p>}
      <button type="submit">进入下载页面</button>
    </form>
  </section></main>;
}
