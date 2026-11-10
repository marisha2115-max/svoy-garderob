import {approvedAssetPaths} from './release-assets.mjs';
import {build} from 'esbuild';import {cp,mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';import {resolve,relative,sep} from 'node:path';import {spawnSync} from 'node:child_process';
const out=resolve(process.argv.find(a=>a.startsWith('--out-dir='))?.slice(10)??'dist');
if(!out.startsWith(resolve('.')+sep))throw Error('Build directory must stay inside the project');
// Never merge a release with stale models, source maps, archives or old bundles.
try{if((await readdir(out)).length)throw Error('Build directory is not empty; choose a new --out-dir=... directory.')}catch(e){if(e.code!=='ENOENT')throw e}
const approvedPaths=await approvedAssetPaths('release-assets');
const types=spawnSync(process.execPath,['node_modules/typescript/bin/tsc','--noEmit'],{stdio:'inherit'});if(types.status!==0)process.exit(types.status??1);
await mkdir(out,{recursive:true});
const options={bundle:true,format:'esm',minify:true,sourcemap:false,entryNames:'[name]-[hash]',outdir:resolve(out,'assets'),metafile:true,target:['safari16'],logLevel:'info',define:{'process.env.NODE_ENV':'"production"'}};
const worker=await build({...options,entryPoints:['src/background.worker.ts']});const workerPath=Object.keys(worker.metafile.outputs).find(p=>p.endsWith('.js'));
const workerRelative=relative(out,resolve(workerPath)).split(sep).join('/');
const app=await build({...options,entryPoints:['src/main.tsx'],define:{...options.define,__WORKER_FILE__:JSON.stringify(workerRelative)}});
const files=Object.keys(app.metafile.outputs).map(p=>relative(out,resolve(p)).split(sep).join('/'));
const js=files.find(p=>p.endsWith('.js')),css=files.find(p=>p.endsWith('.css'));
const html=(await readFile('public/index.html','utf8')).replace('__MAIN_JS__',js).replace('__MAIN_CSS__',css);
await writeFile(resolve(out,'index.html'),html);await cp('public/favicon.svg',resolve(out,'favicon.svg'));for(const path of approvedPaths.filter(p=>p.startsWith('shared-wardrobe/'))){await mkdir(resolve(out,path,'..'),{recursive:true});await cp('release-assets/'+path,resolve(out,path));}await cp('LICENSES',resolve(out,'LICENSES.txt'));await writeFile(resolve(out,'.nojekyll'),'');
const inventory=[];async function scan(dir){for(const name of await readdir(dir)){const path=resolve(dir,name),info=await stat(path);if(info.isDirectory())await scan(path);else{if(info.size>=100_000_000)throw Error('File must be under100MB: '+relative(out,path));inventory.push({file:relative(out,path).split(sep).join('/'),bytes:info.size})}}}await scan(out);inventory.sort((a,b)=>b.bytes-a.bytes);const total=inventory.reduce((n,f)=>n+f.bytes,0);if(total>=1_000_000_000)throw Error('Build must be under1GB');
await mkdir('output/pages',{recursive:true});await writeFile('output/pages/files.json',JSON.stringify({directory:relative('.',out),files:inventory,totalBytes:total,worker:workerRelative},null,2));for(const f of inventory)console.log(`${String(f.bytes).padStart(9)} B  ${f.file}`);console.log(`TOTAL ${total} B; no models, wasm, sourcemaps or local imports`);
