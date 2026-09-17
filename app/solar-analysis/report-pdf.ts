import { PDFDocument, PDFString, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { SOURCES } from "@/lib/solar-analysis/models";
import { batteryOperatingWindow } from "@/lib/solar-analysis/simulation";
import { reportContact, REPORT_PROFILES, REPORT_REGIONS, REPORT_SOURCES, type SolarReport } from "@/lib/solar-analysis/report";
import { annualReportOption, FLOW_LEGEND, hourlyReportOption, MONTH_NAMES, profileReportOption, reportChartPng } from "./report-charts";

export type ReportProgress = { percent: number; message: string };
const ink = rgb(15/255,23/255,42/255), muted = rgb(.36,.43,.48), green = rgb(0,122/255,135/255), pale = rgb(.93,.97,.98), line = rgb(.83,.88,.9);
const number = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (n: number) => `EC$ ${number(n)}`;
const utilization = (n: number | null) => n === null ? "N/A" : `${number(n)}%`;
const yieldUi = () => new Promise<void>(resolve => window.setTimeout(resolve, 0));

async function logoPng(signal: AbortSignal) {
  // Match SiteHeader: shared mark, Space Grotesk, navy name, teal &, small Energy.
  const [response, fontResponse] = await Promise.all([
    fetch("/icon.svg", { signal }), fetch("/fonts/report-space-grotesk-v1.ttf", { signal }),
  ]);
  if (!response.ok) throw new Error("公司 Logo 加载失败，请重试。");
  if (!fontResponse.ok) throw new Error("品牌字体加载失败，请重试。");
  const face = await new FontFace("Report Space Grotesk", await fontResponse.arrayBuffer(), { weight: "300 700" }).load();
  document.fonts.add(face);
  const url = URL.createObjectURL(await response.blob());
  try {
    const image = new Image(); image.src = url; await image.decode(); signal.throwIfAborted();
    const canvas = document.createElement("canvas"); canvas.width = 780; canvas.height = 132;
    const context = canvas.getContext("2d")!; context.scale(3,3); context.drawImage(image,0,6,32,32);
    let x = 40;
    for (const [word,color,size,weight,gap] of [["Sol","#0f172a",26,600,0],["&","#007a87",26,600,3],["Tide","#0f172a",26,600,3],["Energy","#0f172a",12,500,10]] as const) {
      context.font = `${weight} ${size}px "Report Space Grotesk"`; context.fillStyle=color;
      context.letterSpacing = size === 26 ? "-0.8px" : "0.1px";
      x+=gap; context.fillText(word,x,31); x+=context.measureText(word).width;
    }
    return canvas.toDataURL("image/png");
  } finally { URL.revokeObjectURL(url); document.fonts.delete(face); }
}

export async function generateReportPdf(r: SolarReport, progress: (p: ReportProgress) => void, signal: AbortSignal): Promise<Uint8Array> {
  const stage = async (percent: number, message: string) => { signal.throwIfAborted(); progress({ percent, message }); await yieldUi(); signal.throwIfAborted(); };
  await stage(3, "正在准备报告版式与公司 Logo…");
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${r.customer.project} | Sol&Tide Energy`); pdf.setAuthor("Sol&Tide Energy");
  pdf.setSubject(`Solar and storage estimate ${r.id}`); pdf.setCreator(r.version); pdf.setLanguage("en");
  pdf.setCreationDate(new Date(r.generatedAt)); pdf.setModificationDate(new Date(r.generatedAt));
  const regular = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let customerFont = regular;
  const customerText = Object.values(r.customer).join(" ");
  const supported = new Set(regular.getCharacterSet());
  if (Array.from(customerText).some(c => !supported.has(c.codePointAt(0)!))) {
    await stage(7, "正在加载客户名称所需的中文字体（首次可能较慢）…");
    const [fontkit, fontResponse] = await Promise.all([import("@pdf-lib/fontkit"), fetch("/fonts/report-noto-sans-sc-v1.ttf", { signal })]);
    if (!fontResponse.ok) throw new Error("报告字体加载失败，请重试。");
    pdf.registerFontkit(fontkit.default);
    // Keep the complete CJK font: fontkit's subsetter drops composite glyphs in
    // this font, even when text extraction still appears correct.
    customerFont = await pdf.embedFont(await fontResponse.arrayBuffer(), { subset: false });
    const chars = new Set(customerFont.getCharacterSet());
    if (Array.from(customerText).some(c => !chars.has(c.codePointAt(0)!))) throw new Error("客户信息包含字体不支持的字符（如 emoji），请改用文字后重试。");
  }
  const logo = await pdf.embedPng(await logoPng(signal));
  const date = new Intl.DateTimeFormat("en-GB", { timeZone: "America/Antigua", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(r.generatedAt)) + " UTC-04:00";
  const text = (p: PDFPage, value: string, x: number, top: number, size = 10, font = regular, color = ink) => p.drawText(value, { x, y: p.getHeight() - top - size, size, font, color });
  const box = (p: PDFPage, x: number, top: number, width: number, height: number, color = pale) => p.drawRectangle({ x, y: p.getHeight()-top-height, width, height, color });
  const rule = (p: PDFPage, top: number, x = 40, end = p.getWidth()-40) => p.drawLine({ start: { x, y:p.getHeight()-top }, end: { x:end, y:p.getHeight()-top }, thickness: .6, color: line });
  const paragraph = (p: PDFPage, value: string, x: number, top: number, width: number, size = 9, font: PDFFont = regular, color = muted) => {
    let current = ""; const lines: string[] = [];
    for (const word of value.split(/(\s+)/)) {
      if (font.widthOfTextAtSize(current + word, size) <= width) current += word;
      else {
        if (current.trim()) lines.push(current.trimEnd()); current = word.trimStart();
        if (font.widthOfTextAtSize(current, size) > width) {
          let part = "";
          for (const char of current) { if (font.widthOfTextAtSize(part + char, size) > width) { lines.push(part); part = ""; } part += char; }
          current = part;
        }
      }
    }
    if (current.trim()) lines.push(current.trimEnd());
    lines.forEach((s,i) => text(p,s,x,top+i*size*1.45,size,font,color));
    return lines.length*size*1.45;
  };
  const page = () => {
    const width = 595.28, height = 841.89;
    const p = pdf.addPage([width,height]);
    p.drawImage(logo,{x:40,y:height-61,width:221,height:37.4});
    text(p,"RESIDENTIAL SOLAR / PRE-SALES PROPOSAL",40,65,6.5,regular,muted);
    text(p,r.id,381,35,7,bold); text(p,date,381,51,7,regular,muted); rule(p,82);
    return p;
  };
  const title = (p: PDFPage, step: string, name: string, sub: string) => { text(p,step,40,93,9,bold,green); text(p,name,40,110,23,bold); paragraph(p,sub,40,143,p.getWidth()-80,9); };
  const image = async (p: PDFPage, png: string, x: number, top: number, width: number, height: number) => { const img = await pdf.embedPng(png); p.drawImage(img,{x,y:p.getHeight()-top-height,width,height}); };
  const fitText = (p: PDFPage, value: string, x: number, top: number, width: number, size: number, color=ink) => text(p,value,x,top,Math.min(size,width/bold.widthOfTextAtSize(value,1)),bold,color);
  const link = (p: PDFPage, label: string, url: string, x: number, top: number, size=10) => {
    text(p,label,x,top,size,regular,green);
    const y=p.getHeight()-top-size, width=regular.widthOfTextAtSize(label,size);
    const annotation=pdf.context.register(pdf.context.obj({Type:"Annot",Subtype:"Link",Rect:[x,y-3,x+width,y+size+3],Border:[0,0,0],A:{Type:"Action",S:"URI",URI:PDFString.of(url)}}));
    p.node.addAnnot(annotation);
  };
  const t = r.totals;
  const { reserveKwh, usableKwh } = batteryOperatingWindow(r.batteryKwh, r.reserveSocPercent);
  const p1 = page();
  title(p1,"01 / PROPOSED SYSTEM & SAVINGS","Your home. Your solar plan.",r.customer.project);
  let customerY=183;
  customerY+=paragraph(p1,r.customer.salutation,40,customerY,515,11,customerFont,ink)+10;
  customerY+=paragraph(p1,"Thank you for considering Sol & Tide Energy. We are pleased to present the following solar and storage proposal, based on your household demand and selected installation conditions.",40,customerY,515,10)+10;
  if(r.customer.address) paragraph(p1,`Site: ${r.customer.address}`,40,customerY,515,8,customerFont);
  text(p1,"YOUR PROPOSED EQUIPMENT",40,305,9,bold,green);
  const equipment=[
    ["INVERTER",`${number(r.inverterKw)} kW`,"AC rating"],
    ["BATTERY",r.batteryKwh?`${number(r.batteryKwh)} kWh`:"Not included","Nominal storage capacity"],
    ["SOLAR PV",`${number(r.capacityKwp)} kWp`,`${r.panelCount} panels x ${number(r.panelW)} W`],
  ];
  equipment.forEach(([label,value,note],i)=>{const x=40+i*176;box(p1,x,326,163,79);text(p1,label,x+12,338,8,bold,green);fitText(p1,value,x+12,357,139,20);text(p1,note,x+12,387,7,regular,muted);});
  box(p1,40,423,515,108,ink);
  text(p1,"ESTIMATED ANNUAL ELECTRICITY BILL SAVING",56,439,9,bold,rgb(.72,.89,.9));
  fitText(p1,money(t.savedCost),56,462,278,29,rgb(1,1,1));
  fitText(p1,`${number(t.savingPercent)}%`,370,462,169,29,rgb(1,1,1));
  text(p1,"Less spent on grid electricity each year",56,508,8,regular,rgb(.8,.86,.89));
  text(p1,"Estimated bill reduction",370,508,8,regular,rgb(.8,.86,.89));
  text(p1,"Your annual bill, before and after",40,550,13,bold);
  ["", "Grid energy (kWh)", "Electricity bill (EC$)"].forEach((s,i)=>text(p1,s,[40,242,405][i],576,8,bold,muted));
  [["Before solar",t.consumption,t.baselineCost],["With solar & storage",t.grid,t.cost],["Estimated saving",t.savedKwh,t.savedCost]].forEach((row,i)=>{
    const y=599+i*28; if(i===2)box(p1,40,y-4,515,27);
    text(p1,String(row[0]),49,y,10,i===2?bold:regular); text(p1,number(Number(row[1])),242,y,10,bold); text(p1,number(Number(row[2])),405,y,10,bold);rule(p1,y+22);
  });
  paragraph(p1,`Estimated PV generation: ${number(t.generation)} kWh/year. Solar self-use: ${number(t.selfUsePercent)}%. Unpaid grid export: ${number(t.export)} kWh/year (${number(t.exportPercent)}% of generation).`,40,699,515,10);
  text(p1,`Annual battery utilization: ${utilization(t.batteryUtilizationPercent)}${r.batteryKwh ? ` / SOC reserve: ${r.reserveSocPercent}% / Usable: ${number(usableKwh)} kWh` : " / No battery"}`,40,734,9,bold,green);
  paragraph(p1,"Pre-sales estimate only. Final equipment, installation design and pricing are subject to a site review. Figures are not a performance guarantee or a binding quotation.",40,754,515,8);

  await stage(15,"正在整理系统配置与用电模型…");
  const p2=page(); title(p2,"02 / SYSTEM DESIGN","Your configuration","Ratings below describe the modelled system; they do not specify a product make or model.");
  const specs=[
    ["Solar panels",`${r.panelCount} x ${number(r.panelW)} W`],["Installed DC capacity",`${number(r.capacityKwp)} kWp`],
    ["Inverter AC rating",`${number(r.inverterKw)} kW`],["Battery nominal capacity",`${number(r.batteryKwh)} kWh`],
    ["SOC reserve / usable capacity",r.batteryKwh ? `${r.reserveSocPercent}% / ${number(usableKwh)} kWh` : "Not applicable (no battery)"],
    ["Requested DC/AC ratio",number(r.oversize)],["Actual DC/AC ratio",number(r.capacityKwp/r.inverterKw)],
    ["Battery charge / discharge limit",`${number(r.batteryKwh*.5)} kW (0.5 C)`],["Demand profile",REPORT_PROFILES[r.profileKey]],
    ["Installation reference",r.installation.source==="hoymiles"?"Unknown (legacy project)":REPORT_REGIONS[r.installation.region]],
    ["Tilt / orientation",r.installation.source==="hoymiles"?"Unknown":r.installation.tilt===0?"0 degrees / horizontal":`${r.installation.tilt} degrees / ${r.installation.orientation}${r.installation.source.startsWith("pvgis") && r.installation.orientation==="north"?" (1 degree east)":""}`],
    ["Mounting",r.installation.source==="hoymiles"?"Unknown":r.installation.mounting==="roof"?"Fixed roof":"Ventilated open rack"],
    ["Billing country / currency",`${REPORT_REGIONS[r.billCountry]} / EC$ (XCD)`],
  ];
  specs.forEach(([a,b],i)=>{ const y=177+i*20; if(i%2===0)box(p2,40,y-3,515,20);text(p2,a,50,y,9,regular,muted);text(p2,b,280,y,9,bold); });
  const original=r.inputMode===r.billCountry?`${money(r.inputValue)} / month (${REPORT_REGIONS[r.billCountry]} bill)`:`${number(r.monthlyInputKwh)} kWh / month`;
  paragraph(p2,`Demand basis: ${original}. This is converted to ${number(r.monthlyInputKwh/30)} kWh per day, repeated every day. Annual consumption is ${number(t.consumption)} kWh across 365 days.`,40,455,515,10);
  text(p2,"Daily demand distribution",40,517,13,bold);
  await image(p2,await reportChartPng(profileReportOption(r),900,280,signal),40,545,515,160);
  paragraph(p2,"Shares are normalized to 100% of daily demand. Each point represents one hour (00:00-23:00); the last interval ends at 24:00. The same profile is used throughout the year.",40,716,515,9);
  text(p2,"Final product make, model and installation scope will be confirmed after a site review.",40,763,8,regular,muted);

  for(let half=0;half<2;half++){
    const p3=page(); title(p3,`03 / MONTHLY ENERGY PROFILES / ${half===0?"JANUARY - JUNE":"JULY - DECEMBER"}`,"How each month powers your home","Monthly average day / local UTC-04:00 / 24 hourly intervals / identical vertical scale.");
    FLOW_LEGEND.forEach(([name,color],i)=>{const x=40+(i%4)*131,y=170+Math.floor(i/4)*17; const hex=color.slice(1); const c=rgb(parseInt(hex.slice(0,2),16)/255,parseInt(hex.slice(2,4),16)/255,parseInt(hex.slice(4),16)/255);box(p3,x,y+2,9,i<5?7:2,c);text(p3,name,x+13,y,7);});
    for(let cell=0;cell<6;cell++){
      const i=half*6+cell;
      await stage(20+i*3,`正在绘制 ${i+1}/12 月逐时图表…`);
      const x=40+cell%2*266,y=217+Math.floor(cell/2)*179;
      text(p3,MONTH_NAMES[i],x,y,11,bold,green);
      text(p3,`Month: PV ${number(r.months[i].generation)} / Grid ${number(r.months[i].grid)} kWh`,x,y+17,7,regular,muted);
      text(p3,`Battery utilization: ${utilization(r.months[i].batteryUtilizationPercent)}`,x,y+28,7,regular,muted);
      await image(p3,await reportChartPng(hourlyReportOption(r,i),600,330,signal),x,y+42,249,126);
    }
    paragraph(p3,"Bars show home supply plus surplus PV sent to storage or the grid. Lines show generation and demand, not extra energy. Each hour is shown once; the 23:00 interval ends at 24:00.",40,765,515,8);
  }

  await stage(59,"正在汇总年度能源与电费对比…");
  const p4=page(); title(p4,"04 / ANNUAL ENERGY & FINANCIAL RESULTS","Your year at a glance",`${REPORT_REGIONS[r.billCountry]} / East Caribbean dollars (EC$, XCD) / export is unpaid.`);
  await image(p4,await reportChartPng(annualReportOption(r),1000,360,signal),40,173,515,185);
  const widths=[30,57,57,57,57,66,66,66,59],labels=["Month","Demand","PV","Grid","Export","Before","After","Saved","Batt. use"];
  const row=(values:string[], y:number, isBold=false)=>{ let x=40; values.forEach((v,i)=>{const font=isBold?bold:regular;const size=Math.min(8,(widths[i]-8)/font.widthOfTextAtSize(v,1));text(p4,v,x+4,y,size,font); x+=widths[i];}); };
  box(p4,40,380,515,32);row(labels,385,true);row(["","kWh","kWh","kWh","kWh","EC$","EC$","EC$","%"],399);
  r.months.forEach((m,i)=>{const y=421+i*20; const base=r.billCountry==="antigua"?m.antiguaBaseline:m.dominicaBaseline, cost=r.billCountry==="antigua"?m.antiguaCost:m.dominicaCost;if(i%2===0)box(p4,40,y-3,515,20);row([MONTH_NAMES[i].slice(0,3),number(m.consumption),number(m.generation),number(m.grid),number(m.export),number(base),number(cost),number(base-cost),m.batteryUtilizationPercent === null ? "N/A" : number(m.batteryUtilizationPercent)],y);});
  rule(p4,665);row(["YEAR",number(t.consumption),number(t.generation),number(t.grid),number(t.export),number(t.baselineCost),number(t.cost),number(t.savedCost),t.batteryUtilizationPercent === null ? "N/A" : number(t.batteryUtilizationPercent)],677,true);
  box(p4,40,708,515,46);text(p4,`Annual saving: ${money(t.savedCost)}  /  ${number(t.savingPercent)}%`,52,719,12,bold,green);
  text(p4,`Solar self-use: ${number(t.selfUsePercent)}%  /  Export: ${number(t.exportPercent)}% of PV generation`,52,739,8,regular,muted);
  text(p4,"Monthly values are rounded; annual totals are calculated before rounding.",40,775,8,regular,muted);

  await stage(65,"正在附加数据来源与估算说明…");
  const p5=page(); title(p5,"05 / BASIS OF ESTIMATE","What this report assumes","Transparent assumptions for an informed discussion, rather than a guaranteed outcome.");
  const sourceNotes = {
    pvwatts: "PVWatts uses NSRDB typical meteorological-year weather, not a forecast for a named calendar year. Archived DC output is converted using a generic 96% reference inverter curve and capped at the selected AC rating.",
    "pvgis-era5": "A 2022 ERA5 historical weather scenario. PVGIS AC system output already includes its model losses; it is scaled to installed capacity and capped at the inverter rating without adding a second DC-to-AC efficiency loss.",
    "pvgis-nsrdb": "A 2014 NSRDB historical weather scenario through PVGIS. It shares the NSRDB data family with PVWatts and is not an independent validation of that source. AC output is scaled and capped at the selected inverter rating.",
    "nasa-power": "2022 NASA POWER irradiance and weather converted to solar output by pvlib, not a direct NASA electricity forecast. Coarse weather grids, a generic panel, SAPM temperature model and 14% system losses are used; a generic inverter conversion is then applied.",
    hoymiles: "The archived Hoymiles project provides monthly average-day AC curves, repeated for each day. Original location, tilt, orientation and mounting are unknown. Original inverter clipping cannot be reversed; the added inverter limit is approximate.",
  };
  const notes=[
    ["Data source",`${REPORT_SOURCES[r.model.source]}. ${sourceNotes[r.model.source]}`],
    ["Monthly-average-day approximation", "Each model is preprocessed into 12 monthly curves of 24 hourly values, rounded to 0.01 Wh at reference capacity. Each curve repeats daily within its month. Day-to-day weather and extended cloudy spells are not represented. Averaging occurs before inverter clipping and battery dispatch; savings and utilization differ from full hourly weather simulations."],
    ["Installation reference",r.installation.source === "hoymiles" ? "The original project's location and installation geometry are not recorded. The client country selects the reference tariff only; this legacy curve is not a country-specific weather estimate." : `${r.installationText}. Weather represents a reference site near ${r.billCountry==="antigua"?"St John's":"Roseau"}, not a surveyed roof. PVGIS building-integrated mounting and the other sources' roof heat-loss assumptions are not identical. Differences between datasets are not accuracy rankings.`],
    ["Demand and billing", "Monthly demand (or consumption inferred from the entered bill) is divided by 30 to obtain daily demand. A 365-day year uses actual month lengths. Annual cost is the sum of the 12 monthly reference-tariff calculations, not 12 times the entered monthly bill."],
    ["Battery operation", `Solar serves demand first; surplus charges storage, then exports. No grid charging. ${r.batteryKwh ? `Discharge stops at ${r.reserveSocPercent}% SOC (${number(reserveKwh)} kWh reserved); usable storage is ${number(usableKwh)} kWh before discharge losses. The grid supplies remaining deficits.` : "No battery is included."} Limits are 0.5 kW per nominal kWh, with 95% efficiency each way. A periodic state is settled across the year; midnight is not forced empty. Actual inverter/BMS limits must be verified.`],
    ["Battery utilization", "Daily net stored charge (after charge loss) / usable capacity, capped at 100% per day. Monthly figures average daily values; the annual figure is weighted by days, not a simple 12-month average. This is charging-capacity coverage, not efficiency, peak SOC or financial return. No battery: N/A."],
    ["Savings and self-use", "Export is assumed unpaid. Solar self-use = (generation - export) / generation; this includes storage losses and differs from the share of home demand supplied without the grid. No investment cost is supplied, so no payback period or return on investment is claimed."],
    ["Limits of this estimate", "Reference electricity rates are embedded estimates, not a current utility quotation. Site-specific shading, product-specific performance, degradation, battery ageing, outage events, future tariffs and unmodelled fees are not simulated. Actual generation and bills vary. Final design requires a site survey and engineering review."],
  ];
  let y=178;
  for(const [heading,body] of notes){text(p5,heading,40,y,10,bold,green); y+=16; y+=paragraph(p5,body,40,y,515,8.5);y+=10;}
  y+=paragraph(p5,`Model ID: ${r.model.id} | Report method: ${r.version}${r.dataVersion ? ` | Data: ${r.dataVersion}` : ""}`,40,y,515,8);
  link(p5,"View source documentation",SOURCES[r.model.source].url,40,y+10,8);
  if(y>760)throw new Error("报告说明超出版面，请联系维护人员调整模板。");

  const p6=page(), contact=reportContact(r.billCountry);
  title(p6,"06 / NEXT STEPS & CUSTOMER SUPPORT","Here to help you move forward",`${r.customer.project} / your local customer support channels.`);
  text(p6,"A clear path from proposal to installation",40,182,14,bold);
  const steps=[
    ["01  Review your proposal","Check that the household demand, equipment capacities and installation assumptions reflect your needs."],
    ["02  Discuss your property","Share roof details, recent electricity bills and any backup priorities with our team so the proposed system can be reviewed."],
    ["03  Confirm the final scope","A site review and technical assessment are needed before confirming product models, installation scope, pricing and scheduling."],
  ];
  let nextY=214;
  for(const [heading,body] of steps){text(p6,heading,40,nextY,10,bold,green);paragraph(p6,body,40,nextY+19,515,10);nextY+=74;}
  box(p6,40,447,515,191);
  text(p6,`${REPORT_REGIONS[r.billCountry]} customer care`,54,462,13,bold);
  text(p6,"Find answers to common questions",54,491,9,regular,muted);
  link(p6,"Browse our FAQ",contact.faq,54,508,11);
  text(p6,"Email your local support team",54,537,9,regular,muted);
  link(p6,contact.email,`mailto:${contact.email}`,54,554,11);
  text(p6,"Ask a question without creating an account",54,583,9,regular,muted);
  link(p6,"Open our no-login enquiry form",contact.inquiry,54,600,11);
  text(p6,"An email address is requested so we can reply to your enquiry.",54,619,8,regular,muted);
  paragraph(p6,"Thank you for the opportunity to support your home's energy plans. We look forward to helping you make an informed decision.",40,661,515,10);
  text(p6,"Yours sincerely,",40,708,10);
  text(p6,"Sol & Tide Energy",40,729,14,bold,ink);
  text(p6,"Solar & Storage Advisory Team",40,751,10,regular,green);
  text(p6,`${REPORT_REGIONS[r.billCountry]} residential solar proposals`,40,768,8,regular,muted);
  for(const [i,p] of pdf.getPages().entries()){
    rule(p,p.getHeight()-39);text(p,"Sol&Tide Energy | www.solortide.com | Indicative estimate",40,p.getHeight()-28,7,regular,muted);
    text(p,`${r.id}   /   ${i+1} of ${pdf.getPageCount()}`,p.getWidth()-245,p.getHeight()-28,7,regular,muted);
  }
  await stage(70,"正在封装 PDF 文件…");
  const bytes=await pdf.save(); signal.throwIfAborted();return bytes;
}
