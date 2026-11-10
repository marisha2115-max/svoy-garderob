import {resolveAsset} from './assets';
import {validateItem,type Item} from './domain';
import type {ClosetStore} from './storage';
export interface SharedWardrobe {version:1;items:Item[];photos:Record<string,string>}
export function parseSharedWardrobe(value:unknown):SharedWardrobe{
 const v=value as SharedWardrobe;
 if(!v||v.version!==1||!Array.isArray(v.items)||v.items.length>38||!v.photos||typeof v.photos!=='object'||new Set(v.items.map(i=>i.id)).size!==v.items.length||v.items.some(i=>validateItem(i).length||i.demo||!/^phone-[a-f0-9]{24}$/.test(i.id)||v.photos[i.id]!==`shared-wardrobe/photos/${i.id}.jpg`))throw Error('Некорректный общий гардероб.');
 return v;
}
export function withSharedPhotos(store:ClosetStore,shared:SharedWardrobe):ClosetStore{
 const ids=new Set(shared.items.map(i=>i.id));
 function sourceUrl(item:Item|undefined){if(item&&ids.has(item.id)&&(item.originalPhotoRevision??item.photoRevision??0)<=1)return shared.photos[item.id]}
 async function originalUrl(id:string){return sourceUrl((await store.listItems()).find(i=>i.id===id))}
 async function fromServer(url:string,fallback:()=>Promise<Blob|undefined>){try{const r=await fetch(url);if(r.ok){const photo=await r.blob();if(photo.size)return photo}}catch{}return fallback()}
 async function original(id:string){const url=await originalUrl(id);return url?fromServer(url,()=>store.getOriginalPhoto(id)):store.getOriginalPhoto(id)}
 async function url(id:string,variant:string){if(variant==='cutout'||variant==='catalog')return;const item=(await store.listItems()).find(i=>i.id===id),source=sourceUrl(item);if(!source)return;if(variant==='original')return source;
  const choice=await store.getLocalPhotoChoice(id);if(variant==='preferred'){if(item?.photoPreference==='crop'||!item?.photoPreference&&choice==='crop')return}else if(choice==='crop'||choice==='cutout')return;return source;
 }
 return {...store,getPhotoUrl:url,getOriginalPhoto:original,
  async getPhoto(id){return await url(id,'active')?original(id):store.getPhoto(id)},
  async getPreferredPhoto(id){return await url(id,'preferred')?original(id):store.getPreferredPhoto(id)},
  async getCatalogSource(id){const source=await store.getCatalogSource(id),item=source?.item??(await store.listItems()).find(i=>i.id===id),url=sourceUrl(item);if(item&&url){const photo=await fromServer(url,async()=>source?.photo);if(photo)return {item,photo}}return source},
  async getProcessingSource(id){const source=await store.getProcessingSource(id);if(source?.source==='crop')return source;const item=source?.item??(await store.listItems()).find(i=>i.id===id),url=sourceUrl(item);if(item&&url){const photo=await fromServer(url,async()=>source?.photo);if(photo)return {item,photo,source:'original' as const}}return source},
  async snapshot(){const snapshot=await store.snapshot();for(const item of snapshot.items){const url=sourceUrl(item);if(!url)continue;const index=snapshot.photos.findIndex(p=>p.id===item.id),blob=await fromServer(url,async()=>snapshot.photos[index]?.blob);if(blob){if(index<0)snapshot.photos.push({id:item.id,blob});else snapshot.photos[index]={id:item.id,blob}}}return snapshot}
 };
}
export async function loadSharedWardrobe(store:ClosetStore,initialize=true):Promise<ClosetStore>{
 let response:Response;try{response=await fetch(resolveAsset('shared-wardrobe/manifest.json'))}catch{return store}
 if(response.status===404)return store;
 if(!response.ok)throw Error('Общий гардероб недоступен. Обновите страницу.');
 const parsed=parseSharedWardrobe(await response.json());
 const shared={...parsed,photos:Object.fromEntries(Object.entries(parsed.photos).map(([id,path])=>[id,resolveAsset(path)]))};
 if(!initialize)return withSharedPhotos(store,shared);
 if(await store.hasWardrobeHistory()||(await store.listItems()).some(i=>!i.demo)){
  await store.initializeSharedWardrobe({items:[],photos:[],outfits:[]});
  return withSharedPhotos(store,shared);
 }
 // Keep a byte-based offline/backup copy as well as permanent HTTP sources.
 const photos=await Promise.all(shared.items.map(async item=>{const r=await fetch(shared.photos[item.id]);if(!r.ok)throw Error('Не удалось загрузить общий набор фотографий. Обновите страницу.');const blob=await r.blob();if(!blob.size)throw Error('Пустая фотография общего набора.');return {id:item.id,blob}}));
 await store.initializeSharedWardrobe({items:shared.items,photos,outfits:[]});
 return withSharedPhotos(store,shared);
}
