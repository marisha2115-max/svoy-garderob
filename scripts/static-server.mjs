import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {resolve,sep,extname} from 'node:path';
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.txt':'text/plain; charset=utf-8','.zip':'application/zip'};
export function createStaticServer({root,basePath='/'}){
 const directory=resolve(root),mount='/'+basePath.split('/').filter(Boolean).join('/')+(basePath==='/'?'':'/');
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return}
  try{const path=decodeURIComponent((req.url??'/').split('?')[0]);if(path.includes('\\')||path.split('/').includes('..')){res.writeHead(403);res.end();return}
   if(mount!=='/'&&path===mount.slice(0,-1)){res.writeHead(308,{Location:encodeURI(mount)});res.end();return}
   if(!path.startsWith(mount)){res.writeHead(404);res.end();return}
   const suffix=path.slice(mount.length)||'index.html',file=resolve(directory,suffix);if(!file.startsWith(directory+sep)){res.writeHead(403);res.end();return}
   const bytes=await readFile(file);res.setHeader('Cache-Control',suffix==='index.html'||suffix.endsWith('.json')?'no-cache':'public, max-age=31536000, immutable');res.writeHead(200,{'Content-Type':types[extname(file)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:bytes);
  }catch{res.writeHead(404);res.end('Not found')}
 });
}
