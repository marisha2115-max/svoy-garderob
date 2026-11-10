import {resolveAsset} from './assets';
declare const __WORKER_FILE__:string;
import type { Item } from './domain';
import type {PhotoReport} from './photo-report';
export interface LocalResult { photo?:Blob; category?:Item['category'];color?:string;name?:string;fallback?:boolean;humanPhoto?:boolean;report?:PhotoReport }
let worker:Worker|undefined;let serial=0;let tail=Promise.resolve();
export function processLocalPhoto(photo:Blob,category:Item['category'],progress:(text:string)=>void,source:'original'|'crop'='original'):Promise<LocalResult>{
  let done!:(v:LocalResult)=>void;const result=new Promise<LocalResult>(r=>done=r);
  tail=tail.catch(()=>{}).then(()=>new Promise<void>(finish=>{
    try{
      worker??=new Worker(resolveAsset(typeof __WORKER_FILE__==='undefined'?'assets/background.worker.js':__WORKER_FILE__),{type:'module'});const current=worker;const id=++serial;
      const complete=(v:LocalResult)=>{clearTimeout(timer);current.removeEventListener('message',onMessage);current.removeEventListener('error',onError);done(v);finish()};
      const onMessage=(event:MessageEvent)=>{if(event.data.id!==id)return;if(event.data.progress)progress(event.data.progress);if(event.data.done){if(event.data.reason)console.warn('Local processing fallback:',event.data.reason);complete(event.data)}};
      const onError=(event?:ErrorEvent)=>{if(event)console.warn('Local worker:',event.message);current.terminate();worker=undefined;complete({fallback:true})};
      const timer=setTimeout(()=>onError(),180000);current.addEventListener('message',onMessage);current.addEventListener('error',onError);current.postMessage({id,photo,category,source});
    }catch{done({fallback:true});finish()}
  }));return result;
}
