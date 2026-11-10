import {useEffect,useRef,useState} from 'react';import type {Item} from './domain';import type {ClosetStore} from './storage';import {orderPhotos} from './photo-order';
const keyFor=(item:Item)=>JSON.stringify([item.id,item.photoRevision,item.cutoutRevision,item.cutoutApproved,item.backgroundFailed,item.photoPreference]);
function imageRatio(url:string):Promise<number|undefined>{
 return new Promise(resolve=>{const image=new Image();const finish=(ratio?:number)=>{clearTimeout(timer);image.onload=null;image.onerror=null;resolve(ratio)};const timer=setTimeout(()=>finish(),10000);image.onload=()=>finish(image.naturalWidth>0&&image.naturalHeight>0?image.naturalHeight/image.naturalWidth:undefined);image.onerror=()=>finish();image.src=url});
}
async function measure(store:ClosetStore,id:string):Promise<number|undefined>{
 try{const http=await store.getPhotoUrl?.(id,'active');if(http){const ratio=await imageRatio(http);if(ratio)return ratio}}catch{/* Same local fallback as the displayed Photo. */}
 let objectUrl='';try{const blob=await store.getPhoto(id);if(!blob)return;objectUrl=URL.createObjectURL(blob);return await imageRatio(objectUrl)}catch{return undefined}finally{if(objectUrl)URL.revokeObjectURL(objectUrl)}
}
export function usePhotoOrder(items:Item[],store:ClosetStore|undefined,version:number){
 const cache=useRef(new Map<string,number|null>()),pending=useRef(new Map<string,Promise<number|undefined>>()),cacheStore=useRef(store),[,redraw]=useState(0);
 if(cacheStore.current!==store){cache.current.clear();pending.current.clear();cacheStore.current=store}
 const keys=items.map(keyFor),signature=JSON.stringify(keys),preparing=!!store&&keys.some(key=>!cache.current.has(key));
 useEffect(()=>{if(!store)return;let live=true,index=0;const current=items.map(item=>({id:item.id,key:keyFor(item)})),values=cache.current,requests=pending.current;
  const work=async()=>{while(live&&index<current.length){const {id,key}=current[index++];if(values.has(key))continue;let request=requests.get(key);if(!request){request=measure(store,id);requests.set(key,request)}const ratio=await request;values.set(key,ratio??null);requests.delete(key)}};
  void Promise.all(Array.from({length:Math.min(4,current.length)},work)).then(()=>{if(live)redraw(n=>n+1)});return()=>{live=false};
 },[store,signature,version]);
 const ratios=new Map(items.flatMap((item,index)=>{const value=cache.current.get(keys[index]);return typeof value==='number'?[[item.id,value] as const]:[]}));
 return {ordered:orderPhotos(items,ratios),preparing};
}
