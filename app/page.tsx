import Link from "next/link";
import { ArrowRight, BatteryCharging, SunMedium } from "lucide-react";
import packageJson from "@/package.json";

export default function HomePage() {
  return (
    <main className="landing-shell">
      <section className="hero">
        <div className="hero-copy">
          <p className="kicker">Xunneng Solar</p>
          <h1>家庭光伏与储能方案</h1>
          <p className="hero-text">
            面向家庭和小型场景的太阳能光伏咨询。先提交基础信息和安装位置，我们再根据你的情况整理具体方案与报价。
          </p>
          <div className="hero-actions">
            <Link className="primary landing-button" href="/consultation">
              <SunMedium aria-hidden="true" />
              开始方案咨询
            </Link>
            <div className="hero-note">
              <BatteryCharging aria-hidden="true" />
              <span>屋顶光伏、储能、电价优化等内容后续可继续补充。</span>
            </div>
          </div>
        </div>

        <div className="hero-panel">
          <div className="metric-card">
            <span>暂定首页内容</span>
            <strong>光伏方案咨询入口</strong>
            <p>这里先保留最小首页，后面再补品牌信息、案例和报价展示。</p>
          </div>
          <Link className="ghost landing-secondary" href="/consultation">
            进入咨询页
            <ArrowRight aria-hidden="true" />
          </Link>
        </div>
      </section>
      <footer className="landing-footer">
        <span>Xunneng Solar</span>
        <span>Version {packageJson.version}</span>
      </footer>
    </main>
  );
}
