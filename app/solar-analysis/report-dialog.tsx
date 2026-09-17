"use client";

import { useEffect, useRef, useState } from "react";
import AnalysisDialog from "./analysis-dialog";
import { createReportIdSuffix, createSolarReport, reportProject, REPORT_ADVISOR, REPORT_PAGES, REPORT_TITLES, REPORT_REGIONS, type ReportBasis, type ReportCustomer, type SolarReport } from "@/lib/solar-analysis/report";
import type { SolarRegion } from "@/lib/solar-analysis/models";
import type { ReportProgress } from "./report-pdf";
import "./report.css";

type Output = { url: string; previews: string[]; report: SolarReport; filename: string; previewError?: string };
export default function ReportDialog({ basis, onClose, onApplyCountry }: { basis: ReportBasis; onClose: () => void; onApplyCountry: (country: SolarRegion) => void }) {
  const [customer, setCustomer] = useState<ReportCustomer>({ name: "", address: "", title: "" });
  const [country, setCountry] = useState(basis.billCountry);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ReportProgress>({ percent: 0, message: "正在加载报告工具…" });
  const [error, setError] = useState("");
  const [output, setOutput] = useState<Output | null>(null);
  const [page, setPage] = useState(0);
  const [zoom, setZoom] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const ownedUrls = useRef<string[]>([]);
  const mismatch = basis.installation.source !== "hoymiles" && basis.installation.region !== country;
  const disposeUrls = () => { ownedUrls.current.forEach(url=>URL.revokeObjectURL(url)); ownedUrls.current=[]; };
  useEffect(() => () => {controller.current?.abort();disposeUrls();}, []);
  useEffect(() => {
    if(!busy)return;
    const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    window.addEventListener("beforeunload",warn);return()=>window.removeEventListener("beforeunload",warn);
  },[busy]);

  async function generate() {
    if(controller.current || mismatch)return;
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
      <fieldset className="report-country"><legend>客户所属国家（单选）</legend>{(["antigua","dominica"] as const).map(value=><label key={value}><input type="radio" name="report-country" value={value} checked={country===value} onChange={()=>setCountry(value)}/>{value==="antigua"?"安提瓜 · Antigua":"多米尼克 · Dominica"}</label>)}</fieldset>
      <div className="report-fields">
        <label className="v2-field"><span>客户称谓</span><select aria-label="客户称谓" value={customer.title} onChange={e=>setCustomer({...customer,title:e.target.value as ReportCustomer["title"]})}>{REPORT_TITLES.map(value=><option key={value} value={value}>{value||"中性称呼（不指定头衔）"}</option>)}</select></label>
        <label className="v2-field"><span>客户名称<small>（选填）</small></span><input maxLength={80} value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} placeholder="例如 Jane Morris（不重复填写称谓）"/></label>
        <label className="v2-field report-wide"><span>安装地址 / 项目地点<small>（选填）</small></span><input maxLength={180} value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})}/></label>
      </div>
      <div className="report-correspondence"><span>称呼预览：{customer.name.trim()?`Dear ${customer.title?customer.title+" ":""}${customer.name.trim()},`:"Dear Valued Customer,"}</span><span>项目：{reportProject(country)}</span><span>方案顾问 / 落款：{REPORT_ADVISOR}</span></div>
      <div className="report-snapshot"><strong>本次方案</strong><span>逆变器 {basis.inverterKw} kW · 电池 {basis.batteryKwh} kWh · 光伏 {basis.panelCount} × {basis.panelW} W（{basis.capacityKwp.toFixed(2)} kWp）</span><span>客户国家 / 电费参考：{REPORT_REGIONS[country]} · EC$（东加勒比元）</span><small>全部 A4 竖版；月份图分两页，每页 2 列 × 3 行。不包含右侧浮窗、教程与操作按钮。</small></div>
      {mismatch&&<div className="report-warning" role="alert"><span>该客户国家与当前气象参考地区不同。请先更新方案，避免混用两地数据。</span><button type="button" className="report-secondary" onClick={()=>onApplyCountry(country)}>应用客户国家并返回更新方案</button></div>}
      {error&&<p role="alert" className="report-error">{error}</p>}
      <div className="report-actions"><button type="button" className="report-secondary" onClick={onClose}>取消</button><button type="submit" className="report-primary" disabled={mismatch}>生成并预览 PDF</button></div>
    </form>}
    {busy&&<section className="report-generating" role="status" aria-live="polite">
      <div className="report-spinner" aria-hidden="true"/><h3>正在生成客户方案报告</h3><p>{progress.message}</p><progress max={100} value={progress.percent} aria-label="报告生成进度"/><strong>{progress.percent}%</strong>
      <p className="report-generation-warning">请勿关闭或刷新页面。生成在本机完成，不会上传客户资料。</p><button type="button" className="report-secondary" onClick={()=>controller.current?.abort()}>取消生成</button>
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
