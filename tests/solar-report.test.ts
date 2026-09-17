import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createReportIdSuffix, createSolarReport, reportContact, reportInstallation, REPORT_ADVISOR, type ReportBasis } from "../lib/solar-analysis/report";
import { DEFAULT_INSTALLATION } from "../lib/solar-analysis/models";
import { DAYS } from "../lib/solar-analysis/simulation";

const basis = (): ReportBasis => ({
  installation: {...DEFAULT_INSTALLATION}, billCountry:"antigua", inputMode:"kwh", inputValue:300,monthlyInputKwh:300,
  inverterKw:3.8,batteryKwh:5,panelW:350,oversize:1.2,panelCount:14,capacityKwp:4.9,profileKey:"night",profileValues:Array(24).fill(1),
  model:{id:"antigua/south/tilt-30",source:"pvwatts",weatherSource:"NSRDB"},
  months:DAYS.map((days,i)=>({month:i+1,days,consumption:10*days,generation:20*days,grid:2*days,export:11*days,selfUse:8*days,
    antiguaCost:days*2,antiguaBaseline:days*12,dominicaCost:days*1.8,dominicaBaseline:days*10,
    hourly:Array.from({length:24},(_,hour)=>({hour,load:1,generation:2,pvDirect:1,battery:0,batteryCharge:.5,grid:0,export:.5,soc:1})),
  })),
});
const customer={name:"张伟 / José",address:"St John's"};

test("report references work without secure-context randomUUID or the crypto API", t => {
  const source = { getRandomValues: t.mock.fn((bytes: Uint8Array) => { bytes.set([0, 15, 255]); return bytes; }) };
  assert.equal(createReportIdSuffix(source as unknown as Crypto), "000fff");
  assert.equal(source.getRandomValues.mock.callCount(), 1);
  assert.match(createReportIdSuffix(null), /^[0-9a-f]{6}$/);
});

test("report is a detached snapshot and uses the selected country's already-computed monthly bills",()=>{
  const input=basis();const report=createSolarReport(input,customer,new Date("2026-09-17T12:00:00Z"),"abc123");
  assert.equal(report.id,"ST-20260917120000-ABC123");assert.equal(report.totals.consumption,3650);assert.equal(report.totals.savedCost,3650);assert.equal(report.totals.baselineCost,4380);
  assert.equal(report.customer.name,"张伟 / José");assert.equal(report.totals.selfUsePercent,45);assert.ok(Math.abs(report.totals.exportPercent-55)<1e-8);
  input.months[0].hourly[0].load=999;input.installation.tilt=0;input.profileValues[0]=999;
  assert.equal(report.months[0].hourly[0].load,1);assert.equal(report.installation.tilt,30);assert.equal(report.profileValues[0],1);
  const other=basis();other.billCountry="dominica";other.installation.region="dominica";other.model.id="dominica/south/tilt-30";const regional=createSolarReport(other,customer);
  assert.equal(regional.regionMismatch,false);assert.ok(Math.abs(regional.totals.baselineCost-3650)<1e-8);assert.equal(regional.totals.generation,report.totals.generation);
});
test("customer proposals use one country, respectful salutations, fixed regional projects and company sign-off",()=>{
  const report=createSolarReport(basis(),{...customer,title:"Dr."});
  assert.equal(report.customer.salutation,"Dear Dr. 张伟 / José,");
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
test("PDF, preview and CJK font code are loaded only inside report actions, with no server report endpoint",()=>{
  const client=readFileSync("app/solar-analysis/solar-analysis-client.tsx","utf8");
  assert.match(client,/await import\("\.\/report-dialog"\)/);assert.doesNotMatch(client,/^import .*from ["'].*report-dialog/m);
  const dialog=readFileSync("app/solar-analysis/report-dialog.tsx","utf8");
  assert.match(dialog,/await import\("\.\/report-pdf"\)/);assert.match(dialog,/await import\("\.\/report-preview"\)/);assert.match(dialog,/beforeunload/);
  assert.doesNotMatch(dialog,/fetch\(/);
  const pdf=readFileSync("app/solar-analysis/report-pdf.ts","utf8");
  assert.match(pdf,/subset: false/,"Keep full CJK glyphs: subset output can extract correctly yet render incorrectly");
  assert.match(pdf,/report-space-grotesk-v1\.ttf/);
  assert.match(pdf,/width = 595\.28, height = 841\.89/,"One fixed A4 portrait page factory");
});
