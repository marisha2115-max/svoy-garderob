// Draws the home-screen icons (iPhone and Android) from one vector design and saves PNGs to public/icons.
// The hanger is the same shape as public/favicon.svg. Run: node scripts/make-icons.mjs
import {chromium} from 'playwright-core';import {mkdir,writeFile} from 'node:fs/promises';
const ink='#1f1b16',paper='#f6f1e9';
// share = how much of the square the hanger's width takes. Android "maskable" icons are cropped to a circle,
// so the drawing stays inside the central safe zone there.
export function iconSvg(size,share=.6){
 const box={x:13,y:15,w:38,h:33},scale=size*share/box.w,ox=(size-box.w*scale)/2-box.x*scale,oy=(size-box.h*scale)/2-box.y*scale+size*.02;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" fill="${ink}"/><g transform="translate(${ox} ${oy}) scale(${scale})"><path d="M26 21a6 6 0 1 1 9 5l-3 2v5L13 44q-3 4 3 4h32q6 0 3-4L32 33" fill="none" stroke="${paper}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></g></svg>`;
}
const targets=[['apple-touch-icon.png',180,.6],['icon-192.png',192,.6],['icon-512.png',512,.6],['icon-maskable-512.png',512,.46]];
if(import.meta.url===`file:///${process.argv[1].replaceAll('\\','/')}`||process.argv[1]?.endsWith('make-icons.mjs')){
 await mkdir('public/icons',{recursive:true});const browser=await chromium.launch({executablePath:process.env.BROWSER_PATH??'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try{const page=await browser.newPage();for(const [name,size,share]of targets){await page.setViewportSize({width:size,height:size});await page.setContent(`<style>html,body{margin:0;background:${ink}}</style>${iconSvg(size,share)}`);await writeFile(`public/icons/${name}`,await page.screenshot({clip:{x:0,y:0,width:size,height:size}}));console.log('icon',name,size)}
  await writeFile('public/favicon.svg',iconSvg(64,.62).replace('<rect ',`<rect rx="16" `)+'\n');}finally{await browser.close()}
}
