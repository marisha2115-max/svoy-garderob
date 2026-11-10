import {readFile,readdir,stat} from 'node:fs/promises';import {resolve,relative} from 'node:path';
export async function listFiles(root){const files=[];async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){if(entry.isSymbolicLink())throw Error('Symlink forbidden in release');const path=resolve(dir,entry.name);if(entry.isDirectory())await walk(path);else files.push(path)}}await walk(resolve(root));return files}
export async function auditRelease(root,{site=false}={}){
 const files=await listFiles(root),issues=[];let totalBytes=0;for(const file of files){const path=relative(root,file).replaceAll('\\','/'),bytes=await readFile(file),size=(await stat(file)).size;totalBytes+=size;
  if(size>=100_000_000)issues.push({file:path,rule:'over100MB'});
  if(/(^|\/)(\.env[^/]*|node_modules|\.git|artifacts|local-imports)(\/|$)|\.(onnx|wasm|map|log)$/i.test(path))issues.push({file:path,rule:'forbidden-file'});
  if(/\.(jpg|png|jpeg|webp)$/i.test(path)){if(!/^((release-assets\/)?shared-wardrobe\/photos\/phone-[a-f0-9]{24}\.jpg)$/.test(path))issues.push({file:path,rule:'unapproved-photo-path'});continue}
  const text=bytes.toString('utf8');
  // Only report locations and rule names, never possible secret values.
  for(const [rule,pattern]of [['private-path',/[A-Z]:[\\/](?:Users|Гардероб)|192\.168\.\d{1,3}\.\d{1,3}/i],['private-key',/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],['github-token',/(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})/],['api-key',/\bsk-[A-Za-z0-9_-]{24,}/],['aws-key',/\bAKIA[A-Z0-9]{16}\b/]])if(pattern.test(text))issues.push({file:path,rule});
  if(site&&path==='index.html'&&(/(?:src|href)="\//.test(text)||!text.includes('http-equiv="Content-Security-Policy"')))issues.push({file:path,rule:'HTML-path-or-CSP'});
 }
 if(totalBytes>=1_000_000_000)issues.push({rule:'over1GB'});return {files:files.length,totalBytes,issues};
}
