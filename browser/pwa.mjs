// Home-screen install and offline start (17.11.2026): the phone description file and icons are served,
// the offline copy (sw.js) takes control, and the app opens with photos while the network is switched off.
// Also checks the install help for iPhone, Android and a computer. Run against a built site:
//   PAGES_DIST=output/neat/dist node browser/pwa.mjs     or     PWA_URL=https://…/ node browser/pwa.mjs
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {mkdir} from 'node:fs/promises';import {createStaticServer} from '../scripts/static-server.mjs';
const remote=process.env.PWA_URL,server=remote?undefined:createStaticServer({root:process.env.PAGES_DIST??'output/pages/dist',basePath:'/repository/'});if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
// Service workers need https or localhost; 127.0.0.1 counts as localhost.
const base=remote??`http://127.0.0.1:${server.address().port}/repository/`,browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});await mkdir('output/pwa',{recursive:true});
const phones={iphone:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',android:'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'};
try{
 // 1. Description file and icons.
 {const context=await browser.newContext(),page=await context.newPage();await page.goto(base);
  const href=await page.locator('link[rel=manifest]').getAttribute('href'),manifestUrl=new URL(href,base).href,manifest=await(await page.request.get(manifestUrl)).json();
  assert.equal(manifest.name,'Свой гардероб');assert.equal(manifest.display,'standalone');assert.equal(new URL(manifest.start_url,manifestUrl).href,base);assert.equal(new URL(manifest.scope,manifestUrl).href,base);
  const icons=[...manifest.icons.map(i=>({src:new URL(i.src,manifestUrl).href,size:Number(i.sizes.split('x')[0])})),{src:new URL(await page.locator('link[rel=apple-touch-icon]').getAttribute('href'),base).href,size:180}];
  for(const icon of icons){const size=await page.evaluate(async src=>{const i=new Image();i.src=src;await i.decode();return [i.naturalWidth,i.naturalHeight]},icon.src);assert.deepEqual(size,[icon.size,icon.size],icon.src)}
  assert.ok(manifest.icons.some(i=>i.purpose==='maskable'),'Android round icon');console.log(`manifest + ${icons.length} icons PASS`);await context.close()}
 // 2. Offline start on a phone.
 for(const [name,userAgent]of Object.entries(phones)){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,userAgent}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  // page.waitForFunction treats a returned Promise as "done" at once, so async checks are polled here instead.
  const until=async(check,label,ms=90000)=>{const end=Date.now()+ms;while(Date.now()<end){if(await page.evaluate(check).catch(()=>false))return;await page.waitForTimeout(500)}throw Error('Timed out waiting for '+label)};
  await page.goto(base);await page.getByText('Образ дня',{exact:true}).waitFor({timeout:30000});
  await until(async()=>{const r=await navigator.serviceWorker?.getRegistration();return r?.active?.state==='activated'&&!!navigator.serviceWorker.controller},'the offline copy to take control');
  // Every file of the offline copy is stored before it takes control (install step).
  await until(async()=>{const keys=await caches.keys();const c=keys.find(k=>k.startsWith('svoy-garderob-'));if(!c)return false;const cache=await caches.open(c);return (await cache.keys()).length>=45},'the offline copy files');

  // Install hint on «Сегодня» and the instructions for this phone.
  await page.getByRole('button',{name:/Поставьте на экран телефона/}).click();const help=page.getByRole('dialog',{name:'Установить на телефон',exact:true});
  await help.getByText(name==='iphone'?'«На экран „Домой“»':'«Установить приложение»',{exact:true}).first().waitFor();await help.getByText('Как пользоваться',{exact:true}).waitFor();
  await page.screenshot({path:`output/pwa/${name}-install-help.png`});await help.getByRole('button',{name:'Закрыть',exact:true}).click();
  await page.getByRole('button',{name:'Скрыть подсказку об установке',exact:true}).click();await page.reload();await page.getByText('Образ дня',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:/Поставьте на экран телефона/}).count(),0,'hidden hint stays hidden');
  // No network at all: the app must still open, with the wardrobe photos.
  assert.ok(await page.evaluate(()=>!!navigator.serviceWorker.controller),'the offline copy controls the page before going offline');
  await context.setOffline(true);await page.reload();await page.getByText('Образ дня',{exact:true}).waitFor({timeout:30000});
  await page.getByRole('button',{name:'Гардероб',exact:true}).click();await page.waitForFunction(()=>{const p=[...document.querySelectorAll('.item-card .item-tile img')];for(const i of p)i.loading='eager';return p.length===38&&p.every(i=>i.complete&&i.naturalWidth>0)},null,{timeout:30000});
  await page.screenshot({path:`output/pwa/${name}-offline-wardrobe.png`});await context.setOffline(false);
  assert.deepEqual(errors,[]);console.log(`${name}: install help, hint hide, offline start with 38 photos PASS`);await context.close();
 }
 // 3. A computer: no hint on «Сегодня», the menu explains to open the link on a phone.
 {const context=await browser.newContext({viewport:{width:1280,height:900}}),page=await context.newPage();await page.goto(base);await page.getByText('Образ дня',{exact:true}).waitFor({timeout:30000});
  assert.equal(await page.getByRole('button',{name:/Поставьте на экран телефона/}).count(),0);await page.getByRole('button',{name:'Меню',exact:true}).click();await page.getByRole('button',{name:'Установить на телефон',exact:true}).click();
  await page.getByText('Откройте эту ссылку на телефоне',{exact:false}).waitFor();console.log('computer: no hint, menu instructions PASS');await context.close()}
}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}}
