const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { accessCookieValue, SOLAR_ACCESS_COOKIE } = require('../app/solar-analysis/access.ts');
const { PDFDocument, PDFName, PDFDict } = require('pdf-lib');
const { mkdtemp, readFile } = require('node:fs/promises');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const assert = require('node:assert/strict');
const origin = process.env.SOLAR_LOG_TEST_ORIGIN || 'http://127.0.0.1:3003';

(async()=>{
  const browser=await chromium.launch();const artifacts=await mkdtemp(join(tmpdir(),'solar-report-'));
  console.log(artifacts);
  try {
    const context=await browser.newContext({viewport:{width:1440,height:1000},acceptDownloads:true});
    await context.addInitScript(() => {
      // Reproduce LAN HTTP / older-browser capability even on localhost.
      Object.defineProperty(globalThis.crypto, 'randomUUID', {value:undefined,configurable:true});
    });
    await context.route('https://**/*',route=>route.abort());
    await context.route('**/solar-analysis/visit',route=>route.fulfill({status:204}));
    await context.route('**/_vercel/**',route=>route.fulfill({status:204}));
    const page=await context.newPage();const requests=[],errors=[];
    page.on('request',r=>requests.push(r.url()));page.on('pageerror',e=>errors.push(e.message));
    await page.goto(origin+'/solar-analysis');await page.locator('#solar-password').waitFor();
    assert.equal(await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).count(),0);
    await context.addCookies([{name:SOLAR_ACCESS_COOKIE,value:accessCookieValue(),domain:new URL(origin).hostname,path:'/solar-analysis',httpOnly:true,sameSite:'Strict'}]);
    await page.reload();await page.locator('#solar-step-hourly').waitFor();
    assert.equal(await page.evaluate(()=>typeof crypto.randomUUID),'undefined');
    if(process.env.SOLAR_REPORT_REQUIRE_INSECURE==='1') assert.equal(await page.evaluate(()=>isSecureContext),false);
    const generation=await page.getByTestId('live-generation').innerText(),saving=await page.getByTestId('live-saved-cost').innerText();
    assert.equal(requests.some(u=>/pdf.worker|report-noto|report-space-grotesk/.test(u)),false);
    await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).click();
    await page.getByLabel('客户名称（选填）',{exact:true}).fill('Jane Morris');
    await page.getByLabel('客户称谓',{exact:true}).selectOption('Ms.');
    assert.equal(await page.getByRole('radio',{checked:true}).count(),1);
    await page.getByLabel('安装地址 / 项目地点（选填）',{exact:true}).fill("St John's, Antigua");
    assert.equal(requests.some(u=>/pdf.worker|report-noto|report-space-grotesk/.test(u)),false,'opening form does not load PDF/preview/font assets');
    let release;const gate=new Promise(resolve=>{release=resolve;});
    const holdLogo=async route=>{await gate;await route.continue().catch(()=>{});};
    await page.route('**/icon.svg',holdLogo);
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).click();
    await page.getByRole('heading',{name:'正在生成客户方案报告',exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'关闭弹窗',exact:true}).isDisabled(),true);
    await page.keyboard.press('Escape');assert.equal(await page.getByRole('dialog').count(),1);
    await page.getByRole('button',{name:'取消生成',exact:true}).click();
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).waitFor();release();await page.unroute('**/icon.svg',holdLogo);
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).click();
    await page.getByTestId('report-preview').waitFor({timeout:120000}).catch(async e=>{console.error(await page.getByRole('dialog').innerText());throw e;});
    assert.equal(requests.some(u=>u.includes('report-noto')),false,'English reports need no CJK font');
    const save=async (name,country='antigua')=>{
      const download=page.waitForEvent('download');await page.getByRole('link',{name:'下载 PDF',exact:true}).click();
      const file=join(artifacts,name);await(await download).saveAs(file);const bytes=await readFile(file);
      const pdf=await PDFDocument.load(bytes);assert.equal(pdf.getPageCount(),7);
      for(const p of pdf.getPages()){assert.ok(Math.abs(p.getWidth()-595.28)<.1);assert.ok(Math.abs(p.getHeight()-841.89)<.1);}
      const links=pdf.getPage(6).node.Annots().asArray().map(ref=>pdf.context.lookup(ref,PDFDict).lookup(PDFName.of('A'),PDFDict).get(PDFName.of('URI')).decodeText());
      assert.deepEqual(links,[`https://www.solortide.com/${country}/faq`,`mailto:${country==='antigua'?'ag':'dm'}-support@solortide.com`,`https://www.solortide.com/${country}/faq#ask-question`]);
      const encoded=await page.getByRole('link',{name:'下载 PDF',exact:true}).evaluate(async a=>{
        const blob=await(await fetch(a.href)).blob();
        return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
      });assert.equal(createHash('sha256').update(Buffer.from(encoded,'base64')).digest('hex'),createHash('sha256').update(bytes).digest('hex'));
      const extracted=spawnSync('pdftotext',['-layout',file,'-'],{encoding:'utf8'});
      assert.equal(extracted.status,0);assert.equal(extracted.stderr,'','PDF fonts must be valid in an independent reader');return extracted.stdout;
    };
    const english=await save('customer-english.pdf');
    for(const value of ['Sol&Tide Energy','Dear Ms. Jane Morris,','Antigua Residential Solar PV Project','Solar & Storage Advisory Team','4.90','3.80','5.00',generation,saving,'January','December','Report method:','ag-support@solortide.com'])assert.ok(english.includes(value),`PDF includes ${value}`);
    assert.ok(!english.includes('Dominica'));assert.ok(!english.includes('dm-support'));
    assert.ok(!english.includes('LIVE'));assert.ok(!english.includes('生成客户报告'));
    for(const [i,label] of ['方案与年度节省','系统配置','1–6 月逐时图','7–12 月逐时图','年度能源与账单','估算依据','后续服务与落款'].entries()){
      await page.getByRole('button',{name:`${i+1}. ${label}`,exact:true}).click();await page.screenshot({path:join(artifacts,`preview-${i+1}.png`)});
    }
    await page.getByRole('button',{name:'修改报告信息',exact:true}).click();
    await page.getByLabel('客户名称（选填）',{exact:true}).fill('张伟 / José');
    await page.getByLabel('客户称谓',{exact:true}).selectOption('');
    await page.getByLabel('安装地址 / 项目地点（选填）',{exact:true}).fill('安提瓜圣约翰住宅项目');
    await page.route('**/fonts/report-noto-sans-sc-v1.ttf',route=>route.fulfill({status:503,body:'test font failure'}));
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).click();
    await page.getByText('报告字体加载失败，请重试。',{exact:true}).waitFor({timeout:60000});
    await page.unroute('**/fonts/report-noto-sans-sc-v1.ttf');
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).click();
    await page.getByTestId('report-preview').waitFor({timeout:120000}).catch(async e=>{console.error(await page.getByRole('dialog').innerText());throw e;});
    const chinese=await save('customer-chinese-name.pdf');assert.ok(chinese.includes('张伟'));assert.ok(chinese.includes('安提瓜圣约翰住宅项目'));
    await page.screenshot({path:join(artifacts,'chinese-name.png')});
    await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
    await page.getByLabel('悬浮汇总国家',{exact:true}).selectOption('dominica');
    await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).click();
    assert.equal(await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).isDisabled(),true);
    assert.equal(await page.getByRole('checkbox').count(),0,'mixed-region report cannot be acknowledged away');
    await page.getByRole('radio',{name:'安提瓜 · Antigua',exact:true}).check();
    assert.equal(await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).isEnabled(),true);
    await page.getByRole('radio',{name:'多米尼克 · Dominica',exact:true}).check();
    await page.getByRole('button',{name:'应用客户国家并返回更新方案',exact:true}).click();
    await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).click();
    assert.equal(await page.getByRole('radio',{name:'多米尼克 · Dominica',exact:true}).isChecked(),true);
    await page.getByRole('button',{name:'生成并预览 PDF',exact:true}).click();
    await page.getByTestId('report-preview').waitFor({timeout:120000});
    const dominica=await save('customer-dominica.pdf','dominica');
    assert.ok(dominica.includes('Dominica Residential Solar PV Project'));assert.ok(dominica.includes('dm-support@solortide.com'));assert.ok(!dominica.includes('Antigua'));assert.ok(!dominica.includes('ag-support'));
    await page.getByRole('button',{name:'7. 后续服务与落款',exact:true}).click();await page.screenshot({path:join(artifacts,'dominica-support.png')});
    await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
    await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:/年省.*展开/}).click();
    await page.getByRole('button',{name:'生成客户报告 PDF',exact:true}).click();
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:join(artifacts,'mobile-form.png')});await page.getByRole('button',{name:'关闭弹窗',exact:true}).click();
    assert.deepEqual(errors,[]);
    console.log(JSON.stringify({ok:true,artifacts,pages:7,allA4:true,months:12,snapshotMatches:true,previewMatchesDownload:true,englishAndChinese:true,cancelRetry:true,fontFailureRecoverable:true,singleCountry:true,regionalLinks:true,lazyAssets:true},null,2));
    await context.close();
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
