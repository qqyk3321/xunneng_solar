import type { ReportProgress } from "./report-pdf";

export async function renderReportPreview(bytes: Uint8Array, progress: (p: ReportProgress) => void, signal: AbortSignal) {
  signal.throwIfAborted();
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  signal.throwIfAborted();
  // PDF.js transfers its input to a worker. Keep the original bytes for download.
  const task = pdfjs.getDocument({ data: bytes.slice(), useSystemFonts: true });
  const urls: string[] = [];
  const abort = () => { void task.destroy(); };
  signal.addEventListener("abort", abort, { once: true });
  try {
    const doc = await task.promise;
    for(let i=1;i<=doc.numPages;i++) {
      signal.throwIfAborted();
      progress({ percent: 72 + Math.round(i/doc.numPages*27), message: `正在生成 PDF 预览 ${i}/${doc.numPages}…` });
      const page=await doc.getPage(i), base=page.getViewport({scale:1});
      const viewport=page.getViewport({scale:Math.min(2, 1600/base.width)});
      const canvas=document.createElement("canvas");canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
      try {
        await page.render({canvas,viewport}).promise;
        signal.throwIfAborted();
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("预览图片生成失败")),"image/png"));
        signal.throwIfAborted(); urls.push(URL.createObjectURL(blob));
      } finally {canvas.width=canvas.height=0;page.cleanup();}
    }
    return urls;
  } catch(error) {urls.forEach(url=>URL.revokeObjectURL(url));throw error;}
  finally {signal.removeEventListener("abort",abort);await task.destroy();}
}
