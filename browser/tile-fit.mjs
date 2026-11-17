// Checks the "journal" wardrobe grid (November 2026): every item is a tile of the same size,
// the whole photo is visible inside it (contain, never cropped), a name is shown under it,
// and nothing spills sideways. Replaces browser/card-fit.mjs, which checked the earlier
// design with cards of different heights sorted by photo shape.
import {chromium} from 'playwright-core';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';import {createStaticServer} from '../scripts/static-server.mjs';
const remote=process.env.CARD_FIT_URL,server=remote?undefined:createStaticServer({root:process.env.PAGES_DIST??'output/pages/dist',basePath:'/repository/'});if(server)await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=remote??`http://127.0.0.1:${server.address().port}/repository/`,browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true}),results=[];await mkdir('output/tile-fit',{recursive:true});
async function verify(page,count){
 await page.waitForFunction(n=>document.querySelectorAll('.item-card .item-tile img').length===n,count,{timeout:30000});
 await page.waitForFunction(n=>{const images=[...document.querySelectorAll('.item-card .item-tile img')];for(const i of images)i.loading='eager';return images.length===n&&images.every(i=>i.complete&&i.naturalWidth>0)},count,{timeout:30000});
 const tiles=await page.locator('.item-card').evaluateAll(async cards=>Promise.all(cards.map(async card=>{
  const img=card.querySelector('.item-tile img'),tile=card.querySelector('.item-tile').getBoundingClientRect();await img.decode();const box=img.getBoundingClientRect(),s=getComputedStyle(img);
  // Area the photo really occupies inside the img box with object-fit: contain.
  const scale=Math.min(box.width/img.naturalWidth,box.height/img.naturalHeight),shown={w:img.naturalWidth*scale,h:img.naturalHeight*scale};
  return {name:card.querySelector('.item-name')?.textContent??'',meta:card.querySelector('.item-meta')?.textContent??'',fit:s.objectFit,tileW:tile.width,tileH:tile.height,inside:box.left>=tile.left-.5&&box.top>=tile.top-.5&&box.right<=tile.right+.5&&box.bottom<=tile.bottom+.5,shownW:shown.w,shownH:shown.h,boxW:box.width,boxH:box.height};
 })));
 assert.equal(tiles.length,count);
 const w=tiles[0].tileW,h=tiles[0].tileH;assert.ok(Math.abs(h/w-1.25)<.02,'tiles are 4:5');
 for(const t of tiles){
  assert.ok(t.name.trim(),'every tile has a name under it');
  assert.equal(t.fit,'contain',`${t.name}: whole photo must be visible, not cropped`);
  assert.ok(Math.abs(t.tileW-w)<1&&Math.abs(t.tileH-h)<1,`${t.name}: all tiles must be the same size`);
  assert.ok(t.inside,`${t.name}: photo must stay inside its tile`);
  assert.ok(t.shownW<=t.boxW+.5&&t.shownH<=t.boxH+.5&&(Math.abs(t.shownW-t.boxW)<1||Math.abs(t.shownH-t.boxH)<1),`${t.name}: photo must touch the tile on one side and keep its proportions`);
 }
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal overflow');
 return tiles;
}
const openCloset=async page=>{await page.getByRole('button',{name:'Гардероб',exact:true}).click()};
try{for(const [name,width,height,mobile]of [['iphone',390,844,true],['android',412,915,true],['tablet',768,1024,true],['desktop',1440,1000,false]]){const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));try{
 await page.goto(base);
 // The first screen is «Сегодня» with an outfit of the day.
 await page.getByText('Образ дня',{exact:true}).waitFor({timeout:30000});await page.waitForFunction(()=>{const p=[...document.querySelectorAll('.today-hero img')];return p.length>0&&p.every(i=>i.complete&&i.naturalWidth>0)},null,{timeout:30000});
 await page.screenshot({path:`output/tile-fit/${remote?'published':'local'}-${name}-today.png`});
 await openCloset(page);const tiles=await verify(page,38);
 await page.reload();await openCloset(page);await verify(page,38);
 // Photos still show from the device copy when the server copies are unavailable.
 await page.route('**/shared-wardrobe/photos/*.jpg',r=>r.abort());await page.reload();await openCloset(page);await verify(page,38);await page.unroute('**/shared-wardrobe/photos/*.jpg');
 await page.getByRole('button',{name:'Обувь',exact:true}).click();await verify(page,11);await page.screenshot({path:`output/tile-fit/${remote?'published':'local'}-${name}-shoes.png`,fullPage:true});
 await page.getByRole('button',{name:'Открыть Красные туфли на каблуке',exact:true}).click();const editor=page.getByRole('dialog',{name:'Вещь',exact:true});
 // The photo is redrawn once after the card opens, so wait for the settled, loaded image rather than the first one.
 await page.waitForFunction(()=>{const i=document.querySelector('dialog[open] .editor-photo img');return !!i&&i.isConnected&&i.complete&&i.naturalWidth>0},null,{timeout:15000});await page.waitForTimeout(300);
 assert.equal(await page.evaluate(()=>{const i=document.querySelector('dialog[open] .editor-photo img');return i?getComputedStyle(i).objectFit:'missing'}),'contain','Editor clips photo');
 assert.ok(await editor.getByRole('button',{name:'Удалить вещь',exact:true}).isVisible(),'delete moved into the item card');await editor.getByRole('button',{name:'Закрыть',exact:true}).click();
 assert.equal(await page.locator('.item-remove').count(),0,'no bin icon on wardrobe tiles');
 assert.deepEqual(errors,[]);results.push({name,width,height,tiles,errors});console.log(`${name} ${width}x${height}: today, 38 equal tiles with whole photos, reload, device copy, 11 shoes and editor PASS`);
 }finally{await context.close()}}}finally{await browser.close();if(server){server.closeAllConnections();await new Promise(r=>server.close(r))}await writeFile(`output/tile-fit/${remote?'published':'local'}-report.json`,JSON.stringify(results,null,2))}
