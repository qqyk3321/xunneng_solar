import type { Metadata } from "next";
import { cookies } from "next/headers";
import { accessCookieIsValid, SOLAR_ACCESS_COOKIE } from "./access";
import { unlockSolarAnalysis } from "./actions";
import SolarAnalysis from "./solar-analysis-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "光伏与储能系统分析 | Sol & Tide Energy",
  robots: { index: false, follow: false, nocache: true },
};

type SolarAnalysisPageProps = {
  searchParams: Promise<{ error?: string }>;
};

export default async function SolarAnalysisPage({
  searchParams,
}: SolarAnalysisPageProps) {
  const cookieStore = await cookies();
  const unlocked = accessCookieIsValid(
    cookieStore.get(SOLAR_ACCESS_COOKIE)?.value,
  );

  if (unlocked) return <SolarAnalysis />;

  const { error } = await searchParams;
  return (
    <main className="solar-lock-page">
      <section className="solar-lock-card" aria-labelledby="solar-lock-title">
        <div className="solar-lock-mark" aria-hidden="true">S</div>
        <p className="solar-lock-eyebrow">SOL &amp; TIDE · PRIVATE ANALYSIS</p>
        <h1 id="solar-lock-title">受保护的光伏分析</h1>
        <p className="solar-lock-copy">
          此页面包含内部系统配置和能源估算数据。请输入访问密码继续。
        </p>
        <form action={unlockSolarAnalysis} className="solar-lock-form">
          <label htmlFor="solar-password">访问密码</label>
          <input
            id="solar-password"
            name="password"
            type="password"
            autoComplete="current-password"
            autoFocus
            required
          />
          {error === "invalid_password" && (
            <p className="solar-lock-error" role="alert">密码不正确，请重新输入。</p>
          )}
          <button type="submit">进入分析页面</button>
        </form>
        <small>验证前不会显示或预览任何分析内容。</small>
      </section>
    </main>
  );
}
