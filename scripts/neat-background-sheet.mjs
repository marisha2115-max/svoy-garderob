// Runs the plain-backdrop algorithm over a folder of photos in headless Edge and
// writes before/after sheets to browser/artifacts/neat-background. Changes no app data.
import {build} from 'esbuild';import {chromium} from 'playwright-core';import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const folder=resolve(process.argv[2]??'release-assets/shared-wardrobe/photos'),out=resolve('browser/artifacts/neat-background');await mkdir(out,{recursive:true});
const bundle=await build({stdin:{contents:`import {neatBackgroundMask} from './src/neat-background';import {solidBackgroundMask} from './src/solid-background';globalThis.neat=neatBackgroundMask;globalThis.solid=solidBackgroundMask;`,resolveDir:resolve('.'),loader:'ts'},bundle:true,format:'iife',write:false});
const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1000,height:1000}});await page.setContent('<body style="margin:0;font:13px sans-serif;background:#ddd"></body>');await page.addScriptTag({content:bundle.outputFiles[0].text});
 const files=(await readdir(folder)).filter(f=>/\.(jpe?g|png|webp)$/i.test(f)).sort(),rows=[];
 for(let sheet=0;sheet*8<files.length;sheet++){
  const part=files.slice(sheet*8,sheet*8+8),data=[];for(const f of part)data.push({name:f,url:'data:image/jpeg;base64,'+(await readFile(resolve(folder,f))).toString('base64')});
  const result=await page.evaluate(async data=>{
   document.body.innerHTML='';const grid=document.createElement('div');grid.style.cssText='display:grid;grid-template-columns:1fr 1fr;gap:10px;padding:6px';document.body.append(grid);const rows=[];
   for(const {name,url} of data){
    const img=new Image();img.src=url;await img.decode();const scale=Math.min(1,1024/Math.max(img.width,img.height)),w=Math.round(img.width*scale),h=Math.round(img.height*scale);
    const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.drawImage(img,0,0,w,h);const px=x.getImageData(0,0,w,h);
    const t=performance.now(),r=neat(px.data,w,h),ms=Math.round(performance.now()-t),old=!!solid(px.data,w,h);
    const cell=document.createElement('div');cell.style.cssText='background:#fff;padding:4px';
    const verdict=!r?'ОРИГИНАЛ':r.confident?'ЧИСТЫЙ ФОН':'сомнительно';
    cell.innerHTML=`<div>${name.slice(6,14)} — <b>${verdict}</b>${r?` край ${r.borderShare.toFixed(2)} уст ${r.stability.toFixed(2)} частей ${r.pieces}`:''} · старый: ${old?'да':'нет'} · ${ms}мс</div>`;
    const row=document.createElement('div');row.style.cssText='display:flex;gap:6px;height:210px';cell.append(row);
    c.style.cssText='height:210px;max-width:48%;object-fit:contain';row.append(c);
    if(r){const o=document.createElement('canvas');o.width=w;o.height=h;const d=x.getImageData(0,0,w,h);for(let i=0;i<w*h;i++)d.data[i*4+3]=r.alpha[i];o.getContext('2d').putImageData(d,0,0);o.style.cssText='height:210px;max-width:48%;object-fit:contain;background:#efefec';row.append(o)}
    grid.append(cell);rows.push({name,verdict,old,ms,border:r?.borderShare,stability:r?.stability,pieces:r?.pieces});
   }return rows},data);
  rows.push(...result);await page.screenshot({path:resolve(out,`sheet-${sheet+1}.png`),fullPage:true});
 }
 await writeFile(resolve(out,'report.json'),JSON.stringify(rows,null,1));
 const n=v=>rows.filter(r=>r.verdict===v).length;console.log(`photos ${rows.length}; clean ${n('ЧИСТЫЙ ФОН')}; doubtful ${n('сомнительно')}; original ${n('ОРИГИНАЛ')}; old algorithm passed ${rows.filter(r=>r.old).length}; max ms ${Math.max(...rows.map(r=>r.ms))}`);
}finally{await browser.close()}
