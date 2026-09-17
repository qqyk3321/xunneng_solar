import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { isReportTextSupported, normalizeReportText, reportCustomerTextError } from "../lib/solar-analysis/report-text";
import { createReportIdSuffix, createSolarReport, reportContact, reportInstallation, REPORT_ADVISOR, type ReportBasis } from "../lib/solar-analysis/report";
import { DEFAULT_INSTALLATION } from "../lib/solar-analysis/models";
import { DAYS } from "../lib/solar-analysis/simulation";

const basis = (): ReportBasis => ({
  installation: {...DEFAULT_INSTALLATION}, billCountry:"antigua", inputMode:"kwh", inputValue:300,monthlyInputKwh:300,
  inverterKw:3.8,batteryKwh:5.12,reserveSocPercent:10,panelW:350,oversize:1.2,panelCount:14,capacityKwp:4.9,profileKey:"night",profileValues:Array(24).fill(1),
  model:{id:"antigua/south/tilt-30",source:"pvwatts",weatherSource:"NSRDB"},
  months:DAYS.map((days,i)=>({month:i+1,days,consumption:10*days,generation:20*days,grid:2*days,export:11*days,selfUse:8*days,
    batteryChargeStored:days*4,batteryUtilizationPercent:i === 1 ? 50 : 80,
    antiguaCost:days*2,antiguaBaseline:days*12,dominicaCost:days*1.8,dominicaBaseline:days*10,
    hourly:Array.from({length:24},(_,hour)=>({hour,load:1,generation:2,pvDirect:1,battery:0,batteryCharge:.5,grid:0,export:.5,soc:1})),
  })),
});
const customer={name:"Jane / José",address:"St John's"};

test("reports preserve SOC settings and day-weight monthly battery utilization, including no battery", () => {
  const input = basis(); input.reserveSocPercent = 20;
  const report = createSolarReport(input, customer);
  input.reserveSocPercent = 30;
  assert.equal(report.reserveSocPercent, 20);
  assert.equal(report.totals.batteryChargeStored, 365 * 4);
  assert.ok(Math.abs(report.totals.batteryUtilizationPercent! - (80 * 337 + 50 * 28) / 365) < 1e-8);
  input.reserveSocPercent = 100;
  assert.throws(() => createSolarReport(input, customer));
  input.reserveSocPercent = 10; input.months[0].batteryUtilizationPercent = NaN;
  assert.throws(() => createSolarReport(input, customer));
  input.batteryKwh = 0; input.months.forEach(m => { m.batteryChargeStored = 0; m.batteryUtilizationPercent = null; });
  assert.equal(createSolarReport(input, customer).totals.batteryUtilizationPercent, null);
});

test("report references work without secure-context randomUUID or the crypto API", t => {
  const source = { getRandomValues: t.mock.fn((bytes: Uint8Array) => { bytes.set([0, 15, 255]); return bytes; }) };
  assert.equal(createReportIdSuffix(source as unknown as Crypto), "000fff");
  assert.equal(source.getRandomValues.mock.callCount(), 1);
  assert.match(createReportIdSuffix(null), /^[0-9a-f]{6}$/);
});

test("report is a detached snapshot and uses the selected country's already-computed monthly bills",()=>{
  const input=basis();const report=createSolarReport(input,customer,new Date("2026-09-17T12:00:00Z"),"abc123");
  assert.equal(report.id,"ST-20260917120000-ABC123");assert.equal(report.totals.consumption,3650);assert.equal(report.totals.savedCost,3650);assert.equal(report.totals.baselineCost,4380);
  assert.equal(report.customer.name,"Jane / José");assert.equal(report.totals.selfUsePercent,45);assert.ok(Math.abs(report.totals.exportPercent-55)<1e-8);
  input.months[0].hourly[0].load=999;input.installation.tilt=0;input.profileValues[0]=999;
  assert.equal(report.months[0].hourly[0].load,1);assert.equal(report.installation.tilt,30);assert.equal(report.profileValues[0],1);
  const other=basis();other.billCountry="dominica";other.installation.region="dominica";other.model.id="dominica/south/tilt-30";const regional=createSolarReport(other,customer);
  assert.equal(regional.regionMismatch,false);assert.ok(Math.abs(regional.totals.baselineCost-3650)<1e-8);assert.equal(regional.totals.generation,report.totals.generation);
});
test("customer proposals use one country, respectful salutations, fixed regional projects and company sign-off",()=>{
  const report=createSolarReport(basis(),{...customer,title:"Dr."});
  assert.equal(report.customer.salutation,"Dear Dr. Jane / José,");
  assert.equal(report.customer.project,"Antigua Residential Solar PV Project");
  assert.equal(report.customer.preparedBy,REPORT_ADVISOR);
  assert.equal(createSolarReport(basis(),{name:"",address:""}).customer.salutation,"Dear Valued Customer,");
  const mismatched=basis();mismatched.billCountry="dominica";assert.throws(()=>createSolarReport(mismatched,customer),/客户国家/);
  assert.deepEqual(reportContact("antigua"),{email:"ag-support@solortide.com",faq:"https://www.solortide.com/antigua/faq",inquiry:"https://www.solortide.com/antigua/faq#ask-question"});
  assert.deepEqual(reportContact("dominica"),{email:"dm-support@solortide.com",faq:"https://www.solortide.com/dominica/faq",inquiry:"https://www.solortide.com/dominica/faq#ask-question"});
});
test("reports refuse pending, stale or incomplete model results and guard zero-baseline percentages",()=>{
  const pending=basis();pending.months=[];assert.throws(()=>createSolarReport(pending,customer));
  const stale=basis();stale.installation.tilt=15;assert.throws(()=>createSolarReport(stale,customer));
  const invalid=basis();invalid.months[0].hourly[0].grid=NaN;assert.throws(()=>createSolarReport(invalid,customer));
  const noInverter=basis();noInverter.inverterKw=0;assert.throws(()=>createSolarReport(noInverter,customer));
  const zero=basis();zero.months.forEach(m=>{m.consumption=m.grid=m.antiguaBaseline=m.antiguaCost=m.generation=m.export=0;});
  const r=createSolarReport(zero,customer);assert.equal(r.totals.savingPercent,0);assert.equal(r.totals.selfUsePercent,0);assert.equal(r.totals.exportPercent,0);
});
test("report descriptions preserve unknown legacy geometry and near-north PVGIS caveats",()=>{
  assert.match(reportInstallation({...DEFAULT_INSTALLATION,source:"hoymiles"}),/unknown/);
  assert.match(reportInstallation({...DEFAULT_INSTALLATION,tilt:0}),/orientation not applicable/);
  assert.match(reportInstallation({...DEFAULT_INSTALLATION,source:"pvgis-era5",orientation:"north"}),/1 degree east/);
});
test("PDF and preview remain on-demand, without CJK font code or assets",()=>{
  const client=readFileSync("app/solar-analysis/solar-analysis-client.tsx","utf8");
  assert.match(client,/await import\("\.\/report-dialog"\)/);assert.doesNotMatch(client,/^import .*from ["'].*report-dialog/m);
  const dialog=readFileSync("app/solar-analysis/report-dialog.tsx","utf8");
  assert.match(dialog,/await import\("\.\/report-pdf"\)/);assert.match(dialog,/await import\("\.\/report-preview"\)/);assert.match(dialog,/beforeunload/);
  assert.doesNotMatch(dialog,/fetch\(/);
  const pdf=readFileSync("app/solar-analysis/report-pdf.ts","utf8");
  assert.doesNotMatch(pdf,/fontkit|report-noto|registerFontkit/);
  assert.equal(existsSync("public/fonts/report-noto-sans-sc-v1.ttf"),false);
  assert.equal(JSON.parse(readFileSync("package.json","utf8")).dependencies["@pdf-lib/fontkit"],undefined);
  for(const file of ["scripts/solar/build-offline-assets.mjs","public/solar-analysis/sw.js","next.config.ts"])assert.doesNotMatch(readFileSync(file,"utf8"),/report-noto/);
  assert.match(pdf,/report-space-grotesk-v1\.ttf/);
  assert.match(pdf,/width = 595\.28, height = 841\.89/,"One fixed A4 portrait page factory");
});

test("English report form validation matches Helvetica and keeps accented Latin names",async()=>{
  const pdf=await PDFDocument.create();const font=await pdf.embedFont(StandardFonts.Helvetica);
  const supported=new Set(font.getCharacterSet());
  for(let code=0x20;code<0x2200;code++){
    const value=String.fromCodePoint(code);
    const expected=Array.from(normalizeReportText(value)).every(c=>supported.has(c.codePointAt(0)!));
    assert.equal(isReportTextSupported(value),expected,`Character U+${code.toString(16)}`);
  }
  assert.equal(reportCustomerTextError({name:"José / Renée O’Connor",address:"12 Queen’s Road – St John’s"}),"");
  const report=createSolarReport(basis(),{name:"Jose\u0301",address:"  St John's\nAntigua  "});
  assert.equal(report.customer.name,"José");assert.equal(report.customer.address,"St John's Antigua");
  for(const text of ["张伟","😀","Ж","ع","Ā"]){
    assert.throws(()=>createSolarReport(basis(),{name:text,address:""}),/报告仅支持英文/);
    assert.throws(()=>createSolarReport(basis(),{name:"Jane",address:text}),/报告仅支持英文/);
  }
});
