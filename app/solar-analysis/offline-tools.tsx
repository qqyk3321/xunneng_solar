"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import AnalysisDialog from "./analysis-dialog";
import { MODEL_TABLE_STORAGE_KEY } from "@/lib/solar-analysis/model-table-cache";

type OfflineStatus = { ready: boolean; version?: string; bytes?: number; preparedAt?: string };
type WorkerReply = OfflineStatus & { error?: string; progress?: boolean; percent?: number; message?: string; done?: boolean };
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const SCOPE = "/solar-analysis";

function send(worker: ServiceWorker, type: string, progress?: (reply: WorkerReply) => void): Promise<OfflineStatus> {
  return new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    let timer: ReturnType<typeof setTimeout>;
    const close = () => { clearTimeout(timer); channel.port1.close(); };
    const arm = () => { clearTimeout(timer); timer = setTimeout(() => { close(); reject(new Error("离线工具响应超时，请重试。")); }, 90000); };
    channel.port1.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
      arm();
      if (data.progress) progress?.(data);
      if (data.done) { close(); if (data.error) reject(new Error(data.error)); else resolve(data); }
    };
    arm(); worker.postMessage({ type }, [channel.port2]);
  });
}

async function activeWorker(registration: ServiceWorkerRegistration) {
  const worker = registration.installing || registration.waiting || registration.active;
  if (!worker) throw new Error("浏览器未能启动离线工具，请重试。");
  if (worker.state === "activated") return worker;
  await new Promise<void>((resolve, reject) => {
    const finish = () => {
      if (worker.state === "activated" || worker.state === "redundant") {
        clearTimeout(timer); worker.removeEventListener("statechange", finish);
        if (worker.state === "activated") resolve(); else reject(new Error("离线工具安装失败，请重试。"));
      }
    };
    const timer = setTimeout(() => { worker.removeEventListener("statechange", finish); reject(new Error("离线工具启动超时，请重试。")); }, 20000);
    worker.addEventListener("statechange", finish); finish();
  });
  return worker;
}

export default function OfflineTools() {
  const [open, setOpen] = useState(false);
  const [supported, setSupported] = useState(false);
  const [online, setOnline] = useState(true);
  const [status, setStatus] = useState<OfflineStatus>({ ready: false });
  const [busy, setBusy] = useState(false);
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [installed, setInstalled] = useState(false);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const registration = useRef<ServiceWorkerRegistration | null>(null);
  const preparation = useRef<AbortController | null>(null);
  const refresh = async () => {
    const current = await navigator.serviceWorker.getRegistration(SCOPE);
    if (current?.scope === new URL(SCOPE, location.origin).href) {
      registration.current = current;
      if (current.active) setStatus(await send(current.active, "STATUS"));
    }
  };

  useEffect(() => {
    const usable = window.isSecureContext && "serviceWorker" in navigator && "caches" in window;
    setSupported(usable); setOnline(navigator.onLine);
    setInstalled(window.matchMedia("(display-mode: standalone)").matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
    if (usable) void refresh().catch(() => {});
    const connectivity = () => setOnline(navigator.onLine);
    const beforeInstall = (event: Event) => { event.preventDefault(); setPrompt(event as InstallPrompt); };
    const onInstalled = () => { setInstalled(true); setPrompt(null); };
    window.addEventListener("online", connectivity); window.addEventListener("offline", connectivity);
    window.addEventListener("beforeinstallprompt", beforeInstall); window.addEventListener("appinstalled", onInstalled);
    // Next streams dynamic-route metadata into BODY; Chromium does not use a
    // body manifest for installability. Attach only this authorized page's link
    // to HEAD and remove it on navigation, without changing the global layout.
    const manifestLink = document.createElement("link");
    manifestLink.rel = "manifest"; manifestLink.href = "/solar-analysis/manifest.webmanifest";
    document.head.appendChild(manifestLink);
    return () => {
      manifestLink.remove();
      window.removeEventListener("online", connectivity); window.removeEventListener("offline", connectivity);
      window.removeEventListener("beforeinstallprompt", beforeInstall); window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  useEffect(() => {
    if (!busy) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [busy]);

  const prepare = async () => {
    const abort = new AbortController(); preparation.current = abort;
    setBusy(true); setError(""); setPercent(0); setMessage("正在验证访问权限并准备离线工具…");
    try {
      const response = await fetch("/solar-analysis/offline-permission", { cache: "no-store", signal: AbortSignal.any([abort.signal, AbortSignal.timeout(15000)]) });
      const permission = await response.json();
      if (!response.ok || permission.authorized !== true) throw new Error(permission.error || "请联网验证密码后重试。");
      const reg = await navigator.serviceWorker.register("/solar-analysis/sw.js", { scope: SCOPE, updateViaCache: "none" });
      registration.current = reg;
      const worker = await activeWorker(reg);
      abort.signal.throwIfAborted();
      const result = await send(worker, "PREPARE", reply => { setPercent(reply.percent || 0); setMessage(reply.message || "正在下载…"); });
      setStatus(result); setPercent(100);
      let persistent = false;
      try { persistent = await navigator.storage?.persist?.() || false; } catch { /* Optional storage hint. */ }
      setMessage(persistent ? "已可离线使用，并已获得浏览器持久存储许可。" : "已可离线使用。浏览器可能清理缓存，请在外出前检查离线状态。");
    } catch (e) {
      setError(abort.signal.aborted ? "已取消，原有离线版本不受影响。" : e instanceof Error ? e.message : "离线准备失败，请重试。");
      await refresh().catch(() => {});
    } finally { preparation.current = null; setBusy(false); }
  };

  const remove = async () => {
    if (!window.confirm("清除此设备上的离线程序、模型和 PDF 资源？不会删除已下载的客户 PDF，也不会影响官网其他页面。")) return;
    setBusy(true); setError("");
    try {
      if (registration.current?.active) await send(registration.current.active, "CLEAR");
      await registration.current?.unregister(); registration.current = null;
      try { localStorage.removeItem(MODEL_TABLE_STORAGE_KEY); } catch { /* Optional browser storage. */ }
      setStatus({ ready: false }); setMessage("已清除离线资源。再次启用需要联网验证。");
    } catch { setError("清除失败，请重试。"); } finally { setBusy(false); }
  };

  return <>
    <button type="button" className="offline-launch" onClick={() => { setOpen(true); if (supported) void refresh().catch(() => {}); }}>
      <span aria-hidden="true">{status.ready ? "✓" : "↓"}</span> {status.ready ? online ? "离线已就绪" : "离线使用中" : "离线使用"}
    </button>
    {open && createPortal(<AnalysisDialog title="离线使用与安装" onClose={() => setOpen(false)} closeDisabled={busy} className="offline-dialog">
      <div className="offline-intro"><span className="eyebrow">SOL&TIDE · OFFLINE</span><h3>{status.ready ? "这台设备已准备好离线分析" : "把分析工具带到没有网络的地方"}</h3><p>下载本页面、模型、图表和报告资源后，断网也能重新打开、调整方案并生成 PDF。无需运行本地服务器。</p></div>
      <div className="offline-status" role="status"><strong>{busy ? "正在准备，请勿关闭或刷新" : status.ready ? "✓ 离线资源完整" : "尚未准备离线资源"}</strong>
        {status.ready && <small>版本 {status.version?.slice(0, 8)} · {((status.bytes || 0) / 1048576).toFixed(1)} MB · {status.preparedAt ? new Date(status.preparedAt).toLocaleString() : ""}</small>}
        {!online && <small>当前设备处于离线状态。访问日志与在线统计不会阻止分析。</small>}
        {busy && <progress aria-label="离线资源下载进度" value={percent} max={100} />}
        {message && <p>{message}</p>}
      </div>
      <ul className="offline-notes"><li>首次启用、更新资源都需要联网并通过密码验证。</li><li>仅在你信任的设备启用：离线副本可直接打开，不会每次联网验密；离线时无法即时撤销权限。在线重新出现密码页时，会清除离线副本。</li><li>官网、FAQ、邮件和咨询仍需要网络。清除浏览器网站数据后，需要重新下载。</li></ul>
      {!supported && <p role="alert">当前环境不能启用离线功能。请使用支持 Service Worker 的浏览器，通过 HTTPS 或 http://localhost 访问；普通局域网 HTTP 地址不支持。</p>}
      {error && <p role="alert" className="offline-error">{error}</p>}
      <div className="offline-actions">
        <button type="button" disabled={!supported || !online || busy} onClick={() => void prepare()}>{status.ready ? "检查更新并重新下载" : "启用离线使用"}</button>
        {busy && <button type="button" className="secondary" onClick={() => { preparation.current?.abort(); if (registration.current?.active) void send(registration.current.active, "CANCEL").catch(() => {}); }}>取消下载</button>}
        {status.ready && !installed && <button type="button" className="secondary" disabled={busy} onClick={async () => {
          if (prompt) { try { await prompt.prompt(); await prompt.userChoice; setPrompt(null); } catch { setError("请通过浏览器菜单安装此应用。"); } }
          else setMessage("请在浏览器菜单选择“安装应用”或“添加到主屏幕”；iPhone / iPad 使用 Safari 的分享菜单。安装入口因浏览器而异，不能安装时仍可从书签离线打开。");
        }}>安装到桌面</button>}
        {(status.ready || registration.current) && <button type="button" className="offline-clear" disabled={busy} onClick={() => void remove()}>清除离线资源</button>}
      </div>
      {installed && <p className="offline-installed">已在独立应用窗口中打开。</p>}
    </AnalysisDialog>, document.body)}
  </>;
}
