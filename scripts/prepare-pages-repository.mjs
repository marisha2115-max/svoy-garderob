import {approvedAssetPaths} from './release-assets.mjs';
import {readFile,writeFile,mkdir,copyFile,readdir} from 'node:fs/promises';import {resolve,relative,dirname} from 'node:path';import {zipSync} from 'fflate';import {auditRelease,listFiles} from './audit-release.mjs';
const target=resolve('output/pages/repository'),site=resolve(process.env.PAGES_DIST??'output/pages/dist');
try{if((await readdir(target)).length)throw Error('Snapshot already exists; choose a new workspace for another snapshot instead of merging old files.')}catch(e){if(e.code!=='ENOENT')throw e}
const files=[];for(const dir of ['src','tests'])files.push(...await listFiles(dir));
for(const path of await approvedAssetPaths('release-assets'))files.push(resolve('release-assets',path));
for(const p of ['README.md','LICENSES','.gitignore','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','server.mjs','public/index.html','public/favicon.svg','docs/github-pages.md','docs/model-license-audit.md','scripts/build.mjs','scripts/release-assets.mjs','scripts/test.mjs','scripts/static-server.mjs','scripts/serve-static.mjs','scripts/audit-release.mjs','scripts/prepare-pages-repository.mjs','scripts/verify-browser.mjs','browser/pages.mjs','browser/card-fit.mjs'])files.push(resolve(p));
for(const file of files){const path=relative('.',file),out=resolve(target,path);await mkdir(dirname(out),{recursive:true});await copyFile(file,out)}
const sourceAudit=await auditRelease(target),siteAudit=await auditRelease(site,{site:true});await writeFile('output/pages/audit.json',JSON.stringify({source:sourceAudit,site:siteAudit},null,2));if(sourceAudit.issues.length||siteAudit.issues.length)throw Error('Release audit failed; see output/pages/audit.json (values redacted)');
async function zip(root,destination){const entries={};for(const file of await listFiles(root))entries[relative(root,file).replaceAll('\\','/')]=new Uint8Array(await readFile(file));await writeFile(destination,zipSync(entries,{level:6}))}
await zip(target,'output/pages/repository.zip');await zip(site,'output/pages/site.zip');console.log(JSON.stringify({repository:target,sourceAudit,siteAudit,pushed:false,published:false}));
