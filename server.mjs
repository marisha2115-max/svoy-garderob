import {createServer} from 'node:http';import {readFile} from 'node:fs/promises';import {fileURLToPath} from 'node:url';import {resolve,sep,extname} from 'node:path';import {networkInterfaces} from 'node:os';
const root=fileURLToPath(new URL('./dist/',import.meta.url));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.wasm':'application/wasm','.onnx':'application/octet-stream'};
export function createAppServer(){
 const addresses=new Set(['localhost','127.0.0.1','[::1]']);for(const list of Object.values(networkInterfaces()))for(const entry of list??[])addresses.add(entry.address);
 const json=(res,status,body)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(body))};
 return createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','same-origin');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self';script-src 'self' 'wasm-unsafe-eval';worker-src 'self' blob:;style-src 'self' 'unsafe-inline';img-src 'self' blob: data:;connect-src 'self';base-uri 'none';frame-ancestors 'none';form-action 'self'");
  try{
   const host=req.headers.host??'';let hostname;try{hostname=new URL('http://'+host).hostname}catch{return json(res,400,{error:'INVALID_HOST'})}if(!addresses.has(hostname))return json(res,403,{error:'HOST_NOT_ALLOWED'});
   const route=(req.url??'/').split('?')[0],origin=req.headers.origin;
   if(req.headers['sec-fetch-site']==='cross-site'||origin&&origin!==`http://${host}`&&origin!==`https://${host}`)return json(res,403,{error:'ORIGIN_NOT_ALLOWED'});
   if(route.startsWith('/local-imports/'))return json(res,410,{error:'REMOVED'});
   if(route==='/api/status'&&req.method==='GET')return json(res,200,{aiReady:false,analysisReady:false,imageEditingReady:false,localProcessingReady:true});
   if(['/api/catalog','/api/analyze','/api/outfits'].includes(route))return json(res,410,{error:'LOCAL_ONLY'});
   if(route.startsWith('/api/'))return json(res,404,{error:'NOT_FOUND'});
   if(!['GET','HEAD'].includes(req.method??'')){res.writeHead(405);res.end();return}
   const raw=decodeURIComponent(route),path=resolve(root,'.'+(raw==='/'?'/index.html':raw));if(!path.startsWith(root.endsWith(sep)?root:root+sep))return json(res,403,{error:'FORBIDDEN'});
   const data=await readFile(path);if(raw.startsWith('/models/')||raw.startsWith('/wasm/'))res.setHeader('Cache-Control','private, max-age=86400');res.writeHead(200,{'Content-Type':types[extname(path)]??'application/octet-stream'});res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(404);res.end('Страница не найдена')}
 });
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT??8787);createAppServer().listen(port,'0.0.0.0',()=>{console.log(`Гардероб: http://localhost:${port}/`);for(const entries of Object.values(networkInterfaces()))for(const e of entries??[])if(e.family==='IPv4'&&!e.internal)console.log(`В сети: http://${e.address}:${port}/`)})}
