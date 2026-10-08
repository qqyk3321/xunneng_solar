"use client";

import { useEffect, useRef, useState } from "react";
import AnalysisDialog from "./analysis-dialog";
import { SiteLoadingVisual } from "@/components/site-loading-visual";
import { createReportIdSuffix, createSolarReport, reportProject, REPORT_ADVISOR, REPORT_PAGES, REPORT_TITLES, REPORT_REGIONS, type ReportBasis, type ReportCustomer, type SolarReport } from "@/lib/solution-suggest/report";
import { batteryOperatingWindow } from "@/lib/solution-suggest/simulation";
import { isReportTextSupported, reportCustomerTextError } from "@/lib/solution-suggest/report-text";
import type { ReportProgress } from "./report-pdf";
import "./report.css";

type Output = { url: string; previews: string[]; report: SolarReport; filename: string; previewError?: string };
export default function ReportDialog({ basis, onClose }: { basis: ReportBasis; onClose: () => void }) {
  const [customer, setCustomer] = useState<ReportCustomer>({ name: "", address: "", title: "" });
  const country = basis.installation.region;
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ReportProgress>({ percent: 0, message: "正在加载报告工具…" });
  const [error, setError] = useState("");
  const [output, setOutput] = useState<Output | null>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const ownedUrls = useRef<string[]>([]);
  const mismatch = basis.installation.source !== "hoymiles" && basis.installation.region !== country;
  const customerError = reportCustomerTextError(customer);
  const disposeUrls = () => { ownedUrls.current.forEach(url=>URL.revokeObjectURL(url)); ownedUrls.current=[]; };
  useEffect(() => () => {controller.current?.abort();disposeUrls();}, []);
  useEffect(() => {
    if(!busy)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[busy]);

  async function generate() {
    if(controller.current || mismatch || customerError)return;
    const abort=new AbortController();controller.current=abort;setBusy(true);setError("");disposeUrls();setOutput(null);
    setProgress({percent:0,message:"正在加载报告工具…"});
    const timer=window.setTimeout(()=>abort.abort(new Error("生成时间过长，请检查网络后重试。")),180000);
    try {
      // Freeze values once: subsequent changes must never mix into this report.
      const report=createSolarReport({...basis,billCountry:country},customer,new Date(),createReportIdSuffix());
      const {generateReportPdf}=await import("./report-pdf");
      abort.signal.throwIfAborted();
      const bytes=await generateReportPdf(report,setProgress,abort.signal);
      const blob=new Blob([bytes.slice().buffer],{type:"application/pdf"});
      const url=URL.createObjectURL(blob);ownedUrls.current.push(url);
      let previews:string[]=[];let previewError:string|undefined;
      try {
        setProgress({percent:71,message:"PDF 已生成，正在准备预览…"});
        const {renderReportPreview}=await import("./report-preview");
        previews=await renderReportPreview(bytes,setProgress,abort.signal);
        ownedUrls.current.push(...previews);
      } catch(e) {
        if(abort.signal.aborted)throw e;
        previewError="PDF 已生成，但当前浏览器无法显示预览。仍可下载或在新标签页中打开检查。";
      }
      abort.signal.throwIfAborted();setPage(0);setZoom(false);setProgress({percent:100,message:"报告已生成"});
      setOutput({url,previews,report,filename:`SolTide-Solar-Proposal-${report.id}.pdf`,previewError});
    } catch(e) {
      disposeUrls();
      setError(abort.signal.aborted ? (abort.signal.reason instanceof Error && abort.signal.reason.name!=="AbortError"?abort.signal.reason.message:"已取消生成，可修改信息后重试。") : e instanceof Error?e.message:"生成失败，请重试。");
    } finally {window.clearTimeout(timer);controller.current=null;setBusy(false);}
  }

  return <AnalysisDialog title={output?"客户方案报告预览":"生成客户方案报告"} onClose={onClose} closeDisabled={busy} className={`report-dialog ${output?"report-preview-dialog":""}`}>
    {!output && !busy && <form className="report-form" onSubmit={event=>{event.preventDefault();void generate();}}>
      <p className="report-intro">正式英文售前方案 · 7 页 A4 · 先展示设备方案与年度节省，再展开配置、逐月分析及客户服务。客户信息仅用于本次文件，不上传服务器。</p>
      <p id="report-language-note" className="report-intro">客户姓名与地址请使用英文；支持 José、Renée 等常见拉丁字母姓名。不再加载中文字库。</p>
      <fieldset className="report-country" disabled><legend>客户所属国家（固定）</legend><label><input type="radio" name="report-country" value="antigua" checked readOnly/>安提瓜 · Antigua</label></fieldset>
      <div className="report-fields">
        <label className="v2-field"><span>客户称谓</span><select aria-label="客户称谓" value={customer.title} onChange={e=>setCustomer({...customer,title:e.target.value as ReportCustomer["title"]})}>{REPORT_TITLES.map(value=><option key={value} value={value}>{value||"中性称呼（不指定头衔）"}</option>)}</select></label>
        <label className="v2-field"><span>客户名称<small>（选填）</small></span><input maxLength={80} value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="例如 Jane Morris（不重复填写称谓）" aria-invalid={!isReportTextSupported(customer.name) || undefined} aria-describedby={customerError ? "report-character-error" : "report-language-note"}/></label>
        <label className="v2-field report-wide"><span>安装地址 / 项目地点<small>（选填）</small></span><input maxLength={180} value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} placeholder="例如 St John's, Antigua" aria-invalid={!isReportTextSupported(customer.address) || undefined} aria-describedby={customerError ? "report-character-error" : "report-language-note"}/></label>
      </div>
      <div className="report-correspondence"><span>称呼预览：{customer.name.trim()?`Dear ${customer.title?customer.title+" ":""}${customer.name.trim()},`:"Dear Valued Customer,"}</span><span>项目：{reportProject(country)}</span><span>方案顾问 / 落款：{REPORT_ADVISOR}</span></div>
      <div className="report-snapshot"><strong>本次方案</strong><span>逆变器 {basis.inverterKw} kW · 电池 {basis.batteryKwh} kWh · 光伏 {basis.panelCount} × {basis.panelW} W（{basis.capacityKwp.toFixed(2)} kWp）</span>{basis.batteryKwh > 0 && <span>SOC 保留 {basis.reserveSocPercent}% · 可用容量 {batteryOperatingWindow(basis.batteryKwh, basis.reserveSocPercent).usableKwh.toFixed(2)} kWh；报告包含每月及年均电池利用率。</span>}<span>客户国家 / 电费参考：{REPORT_REGIONS[country]} · EC$（东加勒比元）</span><small>全部 A4 竖版；月份图分两页，每页 2 列 × 3 行。不包含右侧浮窗、教程与操作按钮。</small></div>
      {mismatch&&<div className="report-warning" role="alert"><span>该客户国家与当前气象参考地区不同，请关闭报告并重新计算方案。</span></div>}
      {error&&<p role="alert" className="report-error">{error}</p>}
      {customerError&&<p id="report-character-error" role="alert" className="report-error">{customerError}</p>}
      <div className="report-actions"><button type="button" className="report-secondary" onClick={onClose}>取消</button><button type="submit" className="report-primary" disabled={mismatch || Boolean(customerError)}>生成并预览 PDF</button></div>
    </form>}
    {busy&&<section className="report-generating" data-testid="report-brand-loading">
      <SiteLoadingVisual embedded label="正在生成客户方案报告" caption="Your personal energy proposal">
        <div className="report-generation-details">
          <h3>正在生成客户方案报告</h3><p className="report-generation-stage">{progress.message}</p>
          <div className="report-progress-row"><progress max={100} value={progress.percent} aria-label="报告生成进度"/><strong>{progress.percent}%</strong></div>
          <p className="report-generation-warning">请勿关闭或刷新页面。<br />生成在本机完成，不会上传客户资料。</p>
          <button type="button" className="report-secondary" onClick={()=>controller.current?.abort()}>取消生成</button>
        </div>
      </SiteLoadingVisual>
    </section>}
    {output&&!busy&&<>
      <div className="report-preview-toolbar"><div><strong>{output.report.id}</strong><small>{new Date(output.report.generatedAt).toLocaleString()} · 点击生成时的参数快照</small></div><div className="report-actions"><button type="button" className="report-secondary" onClick={()=>{disposeUrls();setOutput(null);}}>修改报告信息</button><a className="report-primary" href={output.url} download={output.filename}>下载 PDF</a></div></div>
      {output.previewError?<div className="report-error" role="alert">{output.previewError}<a href={output.url} target="_blank" rel="noreferrer">在新标签页中打开 PDF ↗</a></div>:<>
        <div className="report-page-tabs" role="group" aria-label="报告页码">{REPORT_PAGES.map((name,index)=><button type="button" aria-pressed={page===index} key={name} onClick={()=>setPage(index)}>{index+1}. {name}</button>)}<button type="button" onClick={()=>setZoom(!zoom)}>{zoom?"整页预览":"放大预览"}</button></div>
        <div className="report-preview-canvas" data-testid="report-preview">
          {/* eslint-disable-next-line @next/next/no-img-element -- Locally generated blob preview, not a network image. */}
          <img src={output.previews[page]} alt={`PDF 第 ${page+1} 页：${REPORT_PAGES[page]}`} style={{width:zoom?"150%":"auto",maxWidth:zoom?"none":"100%",maxHeight:zoom?"none":"calc(65dvh - 28px)",margin:"auto"}}/>
        </div>
        <p className="report-preview-note">预览与下载为同一文件，全部 A4 竖版。下载后可点击末页的 FAQ、客服邮件和免登录咨询链接。数据为估算，不构成最终报价或收益承诺。</p>
      </>}
    </>}
  </AnalysisDialog>;
}
