import {encodePhotos,decodeStore} from './photo-record';
import {validCropRect,type CropRect} from './crop';import type {LocalResult} from './local-processing';
import {normalizedCategory,effectiveCategory} from './item-category';
import { sanitizePhotoMetadata, validateConditions, validateItem,newId, type Item, type Outfit } from './domain';
import { validateSnapshot,validOutfit } from './backup';
import {validLayout} from './layout';

export interface ClosetSnapshot { items: Item[]; outfits: Outfit[]; photos: { id: string; blob: Blob }[]; catalogPhotos?: { id: string; blob: Blob }[]; catalogSelectedIds?: string[];cutoutPhotos?:{id:string;blob:Blob}[];originalSelectedIds?:string[];croppedPhotos?:{id:string;blob:Blob}[];cropSelectedIds?:string[] }
export const editableItemFields=['name','category','color','season','warmth','heel','styles','subcategory'] as const;
export type ItemPatch=Partial<Pick<Item,typeof editableItemFields[number]>>;
export interface PendingPhoto {id:string;token:string;result:LocalResult;photoRevision:number;metadataRevision:number;cutoutRevision:number}
export interface PendingChoice {id:string;token:string}

export interface ClosetStore {
  initializeSharedWardrobe(snapshot:ClosetSnapshot):Promise<void>;
  hasWardrobeHistory():Promise<boolean>;
  getPhotoUrl?(id:string,variant:'active'|'original'|'preferred'|'catalog'|'cutout'):Promise<string|undefined>;
  replaceWardrobe(snapshot:ClosetSnapshot,operationId:string,onlyIfEmpty?:boolean):Promise<boolean>;
  getReplacementBackup(operationId:string):Promise<ClosetSnapshot|undefined>;
  snapshot(): Promise<ClosetSnapshot>;
  mergeSnapshot(snapshot: ClosetSnapshot): Promise<void>;
  listItems(): Promise<Item[]>;
  getPhoto(itemId: string): Promise<Blob | undefined>;
  getPreferredPhoto(itemId:string):Promise<Blob|undefined>;
  stageLocalPhoto(itemId:string,result:LocalResult,photoRevision:number,metadataRevision:number):Promise<boolean>;
  listPendingPhotos():Promise<PendingPhoto[]>;
  acceptPendingPhotos(choices:PendingChoice[]):Promise<number>;
  dismissPendingPhotos(choices:PendingChoice[]):Promise<void>;
  getCutoutPhoto(itemId:string):Promise<Blob|undefined>;
  getCroppedPhoto(itemId:string):Promise<Blob|undefined>;
  getLocalPhotoChoice(itemId:string):Promise<'original'|'cutout'|'crop'>;
  selectLocalPhoto(itemId:string,choice:'original'|'cutout'|'crop',expectedCutoutRevision?:number):Promise<boolean>;
  applyLocalPhoto(itemId:string,result:LocalResult,photoRevision:number,metadataRevision:number):Promise<boolean>;
  saveCrop(id:string,photo:Blob,expectedRevision:number,rect?:CropRect):Promise<boolean>;
  getOriginalPhoto(itemId: string): Promise<Blob | undefined>;
  getCatalogPhoto(itemId: string): Promise<Blob | undefined>;
  getProcessingSource(itemId:string):Promise<{item:Item;photo:Blob;source:'original'|'crop'}|undefined>;
  getCatalogSource(itemId: string): Promise<{ item: Item; photo: Blob } | undefined>;
  putCatalogPhoto(itemId: string, photo: Blob, photoRevision: number, metadataRevision: number): Promise<boolean>;
  selectPhoto(itemId: string, choice: 'original' | 'catalog'): Promise<boolean>;
  putItem(item: Item, photo?: Blob): Promise<void>;
  patchItem(id:string,patch:ItemPatch):Promise<Item>;
  applyPhotoMetadata(id: string, value: unknown, expectedRevision?: number): Promise<Item | undefined>;
  deleteItem(itemId: string): Promise<void>;
  listOutfits(): Promise<Outfit[]>;
  putOutfit(outfit: Outfit): Promise<void>;
  deleteOutfit(id: string): Promise<void>;
  close(): void;
}

export function openCloset(name = 'wardrobe-hackathon-v1'): Promise<ClosetStore> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) return reject(new Error('Браузер не поддерживает хранение. Откройте приложение в Safari.'));
    const opening = indexedDB.open(name, 6);
    opening.onupgradeneeded = () => {
      const db = opening.result;
      if (!db.objectStoreNames.contains('items')) db.createObjectStore('items', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos');
      if (!db.objectStoreNames.contains('outfits')) db.createObjectStore('outfits', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('catalogPhotos')) db.createObjectStore('catalogPhotos');
      if (!db.objectStoreNames.contains('photoSelections')) db.createObjectStore('photoSelections');
      if (!db.objectStoreNames.contains('cutoutPhotos')) db.createObjectStore('cutoutPhotos');
      if (!db.objectStoreNames.contains('croppedPhotos')) db.createObjectStore('croppedPhotos');
      if (!db.objectStoreNames.contains('pendingPhotos')) db.createObjectStore('pendingPhotos',{keyPath:'id'});
      if (!db.objectStoreNames.contains('replacementHistory')) db.createObjectStore('replacementHistory',{keyPath:'id'});
    };
    opening.onerror = () => reject(new Error('Не удалось открыть гардероб. Проверьте доступ к хранилищу браузера.'));
    opening.onblocked = () => reject(new Error('Закройте другие вкладки гардероба и повторите.'));
    opening.onsuccess = () => {
      const db = opening.result;
      db.onversionchange = () => db.close();
      // Exceptions in request callbacks otherwise escape as window errors and
      // may leave earlier writes committed. Always abort the whole transaction.
      const safely=(tx:IDBTransaction,action:()=>void)=>()=>{try{action()}catch{try{tx.abort()}catch{/* already aborted */}}};
      function transaction<T>(names: string[], mode: IDBTransactionMode, action: (tx: IDBTransaction) => IDBRequest<T> | void): Promise<T> {
        return new Promise((done, fail) => {
          let tx: IDBTransaction | undefined;
          let request: IDBRequest<T> | void;
          try {
            tx = db.transaction(names, mode);
            tx.oncomplete = () => done(request ? request.result : undefined as T);
            tx.onabort = () => fail(new Error(tx?.error?.name==='QuotaExceededError'?'Не удалось сохранить: память браузера заполнена.':`Не удалось сохранить изменения: ${tx?.error?.message||'операция отменена'}`));
            tx.onerror = () => { /* onabort сообщает об ошибке после отката */ };
            request = action(tx);
          } catch (error) {
            // A synchronous add()/structured-clone failure does not abort an
            // IndexedDB transaction automatically. Roll back earlier writes.
            try { tx?.abort(); } catch { /* already completed/aborted */ }
            fail(error);
          }
        });
      }
      function writeLocalResult(tx:IDBTransaction,current:Item,result:LocalResult,metadataRevision:number,choice:unknown,approved=false){
        const next:Item={...current,backgroundFailed:!result.photo,backgroundReport:result.report,cutoutApproved:approved&&!!result.photo,cutoutRevision:(current.cutoutRevision??0)+(result.photo?1:0),backgroundStatus:result.photo?'done':'original'};
        if((current.metadataRevision??0)===metadataRevision&&result.category){next.category=current.category==='unknown'?result.category:current.category;next.color=result.color??current.color;if(/^Вещь\s+\d+$/.test(current.name))next.name=result.name??current.name;next.analysisStatus=next.category==='unknown'?'error':'done';next.metadataRevision=(current.metadataRevision??0)+1}
        next.category=effectiveCategory(next);if(next.category==='unknown')next.analysisStatus='error';
        if(result.photo){tx.objectStore('cutoutPhotos').put(result.photo,current.id);if(approved)tx.objectStore('photoSelections').put('cutout',current.id)}else if(choice!=='crop')tx.objectStore('photoSelections').put('original',current.id);
        tx.objectStore('items').put(next);
      }
      resolve(decodeStore<ClosetStore>({
        hasWardrobeHistory:async()=>!!await transaction<number>(['replacementHistory'],'readonly',tx=>tx.objectStore('replacementHistory').count()),
        async initializeSharedWardrobe(snapshot){
          validateSnapshot(snapshot);snapshot=await encodePhotos(snapshot);
          await transaction(['items','photos','replacementHistory','outfits'],'readwrite',tx=>{
            const history=tx.objectStore('replacementHistory').count(),items=tx.objectStore('items').getAll(),outfits=tx.objectStore('outfits').count();
            outfits.onsuccess=safely(tx,()=>{
              if(history.result)return;
              // Also mark existing wardrobes: emptying them later must not seed again.
              tx.objectStore('replacementHistory').put({id:'shared-wardrobe-v1',initializedAt:new Date().toISOString()});
              if(items.result.some((i:Item)=>!i.demo)||outfits.result)return;
              for(const item of snapshot.items)tx.objectStore('items').add(item);
              for(const photo of snapshot.photos)tx.objectStore('photos').add(photo.blob,photo.id);
            });
          });
        },
        async getReplacementBackup(id){const record=await transaction<any>(['replacementHistory'],'readonly',tx=>tx.objectStore('replacementHistory').get(id));return record?.snapshot},
        async replaceWardrobe(next,operationId,onlyIfEmpty=false){
          validateSnapshot(next);next=await encodePhotos(next);if(!operationId||operationId.length>150||next.outfits.length)throw new Error('Некорректный набор замены.');let changed=false;
          const photoStores=['photos','catalogPhotos','photoSelections','cutoutPhotos','croppedPhotos','pendingPhotos'];
          await transaction(['items','outfits',...photoStores,'replacementHistory'],'readwrite',tx=>{const marker=tx.objectStore('replacementHistory').get(operationId);marker.onsuccess=safely(tx,()=>{if(marker.result)return;
            const reads={items:tx.objectStore('items').getAll(),outfits:tx.objectStore('outfits').getAll(),photos:tx.objectStore('photos').getAll(),photoKeys:tx.objectStore('photos').getAllKeys(),catalogs:tx.objectStore('catalogPhotos').getAll(),catalogKeys:tx.objectStore('catalogPhotos').getAllKeys(),cutouts:tx.objectStore('cutoutPhotos').getAll(),cutoutKeys:tx.objectStore('cutoutPhotos').getAllKeys(),crops:tx.objectStore('croppedPhotos').getAll(),cropKeys:tx.objectStore('croppedPhotos').getAllKeys(),choices:tx.objectStore('photoSelections').getAll(),choiceKeys:tx.objectStore('photoSelections').getAllKeys(),pending:tx.objectStore('pendingPhotos').getAll()};let remaining=Object.keys(reads).length;
            for(const request of Object.values(reads))request.onsuccess=safely(tx,()=>{if(--remaining)return;
              if(onlyIfEmpty&&reads.items.result.some((i:Item)=>!i.demo))return;
              const map=(blobs:Blob[],keys:IDBValidKey[])=>blobs.map((blob,i)=>({id:String(keys[i]),blob})),selected=(choice:string)=>reads.choiceKeys.result.filter((_,i)=>reads.choices.result[i]===choice).map(String);
              const previous:ClosetSnapshot={items:reads.items.result,outfits:reads.outfits.result,photos:map(reads.photos.result,reads.photoKeys.result),catalogPhotos:map(reads.catalogs.result,reads.catalogKeys.result),cutoutPhotos:map(reads.cutouts.result,reads.cutoutKeys.result),croppedPhotos:map(reads.crops.result,reads.cropKeys.result),originalSelectedIds:selected('original'),cropSelectedIds:selected('crop'),catalogSelectedIds:reads.choiceKeys.result.filter((_,i)=>reads.choices.result[i]===true||reads.choices.result[i]==='catalog').map(String)};
              tx.objectStore('replacementHistory').put({id:operationId,createdAt:new Date().toISOString(),snapshot:previous,pending:reads.pending.result});
              tx.objectStore('items').clear();for(const store of photoStores)tx.objectStore(store).clear();
              const demoIds=new Set(previous.items.filter(i=>i.demo).map(i=>i.id));for(const i of previous.items.filter(i=>i.demo))tx.objectStore('items').put(i);
              for(const [key,photos]of [['photos',previous.photos],['catalogPhotos',previous.catalogPhotos],['cutoutPhotos',previous.cutoutPhotos],['croppedPhotos',previous.croppedPhotos]] as const)for(const p of photos??[])if(demoIds.has(p.id))tx.objectStore(key).put(p.blob,p.id);
              for(const [i,id]of reads.choiceKeys.result.entries())if(demoIds.has(String(id)))tx.objectStore('photoSelections').put(reads.choices.result[i],id);
              for(const i of next.items)tx.objectStore('items').put(i);for(const [key,photos]of [['photos',next.photos],['catalogPhotos',next.catalogPhotos],['cutoutPhotos',next.cutoutPhotos],['croppedPhotos',next.croppedPhotos]] as const)for(const p of photos??[])tx.objectStore(key).put(p.blob,p.id);
              for(const id of next.originalSelectedIds??[])tx.objectStore('photoSelections').put('original',id);for(const id of next.cropSelectedIds??[])tx.objectStore('photoSelections').put('crop',id);for(const id of next.catalogSelectedIds??[])tx.objectStore('photoSelections').put('catalog',id);changed=true;
            });
          })});return changed;
        },
        snapshot: () => new Promise<ClosetSnapshot>((done, fail) => {
          const tx = db.transaction(['items', 'photos', 'outfits', 'catalogPhotos', 'photoSelections','cutoutPhotos','croppedPhotos'], 'readonly');
          const items = tx.objectStore('items').getAll(), outfits = tx.objectStore('outfits').getAll();
          const photos = tx.objectStore('photos').getAll(), keys = tx.objectStore('photos').getAllKeys();
          const catalogs = tx.objectStore('catalogPhotos').getAll(), catalogKeys = tx.objectStore('catalogPhotos').getAllKeys(), selections = tx.objectStore('photoSelections').getAllKeys();
          const crops=tx.objectStore('croppedPhotos').getAll(),cropKeys=tx.objectStore('croppedPhotos').getAllKeys();
          const cutouts=tx.objectStore('cutoutPhotos').getAll(),cutoutKeys=tx.objectStore('cutoutPhotos').getAllKeys(),choices=tx.objectStore('photoSelections').getAll();
          tx.oncomplete = () => done({ croppedPhotos:crops.result.map((blob,i)=>({id:String(cropKeys.result[i]),blob})),cropSelectedIds:selections.result.filter((_,i)=>choices.result[i]==='crop').map(String), items: items.result.map(normalizedCategory), outfits: outfits.result, photos: photos.result.map((blob, i) => ({ id: String(keys.result[i]), blob })), catalogPhotos: catalogs.result.map((blob, i) => ({ id: String(catalogKeys.result[i]), blob })), catalogSelectedIds: selections.result.filter((_,i)=>choices.result[i]===true||choices.result[i]==='catalog').map(String),cutoutPhotos:cutouts.result.map((blob,i)=>({id:String(cutoutKeys.result[i]),blob})),originalSelectedIds:selections.result.filter((_,i)=>choices.result[i]==='original').map(String) });
          tx.onabort = () => fail(new Error('Не удалось прочитать гардероб для копии.'));
        }),
        async mergeSnapshot(snapshot) {
          validateSnapshot(snapshot);snapshot=await encodePhotos(snapshot);
          await transaction(['items', 'photos', 'outfits', 'catalogPhotos', 'photoSelections','cutoutPhotos','croppedPhotos'], 'readwrite', tx => {
            // add() refuses collisions and aborts the entire transaction.
            for (const item of snapshot.items) tx.objectStore('items').add(item);
            for (const p of snapshot.photos) tx.objectStore('photos').add(p.blob, p.id);
            for (const outfit of snapshot.outfits) tx.objectStore('outfits').add(outfit);
            for (const p of snapshot.catalogPhotos ?? []) tx.objectStore('catalogPhotos').add(p.blob, p.id);
            for (const id of snapshot.catalogSelectedIds ?? []) tx.objectStore('photoSelections').add(true, id);
            for(const p of snapshot.cutoutPhotos??[])tx.objectStore('cutoutPhotos').add(p.blob,p.id);
            for(const id of snapshot.originalSelectedIds??[])tx.objectStore('photoSelections').add('original',id);
            for(const p of snapshot.croppedPhotos??[])tx.objectStore('croppedPhotos').add(p.blob,p.id);
            for(const id of snapshot.cropSelectedIds??[])tx.objectStore('photoSelections').add('crop',id);
          });
        },
        listItems: async () => (await transaction<Item[]>(['items'], 'readonly', tx => tx.objectStore('items').getAll())).map(normalizedCategory),
        getPhoto: id => new Promise<Blob | undefined>((done, fail) => {
          const tx = db.transaction(['items','photos', 'catalogPhotos', 'photoSelections','cutoutPhotos','croppedPhotos'], 'readonly');
          const garment=tx.objectStore('items').get(id);
          const original = tx.objectStore('photos').get(id), catalog = tx.objectStore('catalogPhotos').get(id), selection = tx.objectStore('photoSelections').get(id);
          const crop=tx.objectStore('croppedPhotos').get(id),cutout=tx.objectStore('cutoutPhotos').get(id);
          tx.oncomplete = () => done(selection.result==='crop'&&crop.result?crop.result:garment.result?.backgroundFailed?original.result:selection.result!=='original'&&garment.result?.cutoutApproved&&cutout.result?cutout.result:original.result);
          tx.onabort = () => fail(new Error('Не удалось прочитать фото.'));
        }),
        getOriginalPhoto: id => transaction<Blob | undefined>(['photos'], 'readonly', tx => tx.objectStore('photos').get(id)),
        getPreferredPhoto:id=>new Promise((done,fail)=>{const tx=db.transaction(['items','photos','croppedPhotos','photoSelections'],'readonly'),item=tx.objectStore('items').get(id),original=tx.objectStore('photos').get(id),crop=tx.objectStore('croppedPhotos').get(id),choice=tx.objectStore('photoSelections').get(id);tx.oncomplete=()=>done((item.result?.photoPreference==='crop'||!item.result?.photoPreference&&choice.result==='crop')&&crop.result?crop.result:original.result);tx.onabort=()=>fail(new Error('Не удалось прочитать выбранное фото.'))}),
        getCroppedPhoto:id=>transaction<Blob|undefined>(['croppedPhotos'],'readonly',tx=>tx.objectStore('croppedPhotos').get(id)),
        getCutoutPhoto:id=>transaction<Blob|undefined>(['cutoutPhotos'],'readonly',tx=>tx.objectStore('cutoutPhotos').get(id)),
        getLocalPhotoChoice:async id=>{const choice=await transaction(['photoSelections'],'readonly',tx=>tx.objectStore('photoSelections').get(id));const item=await transaction<Item|undefined>(['items'],'readonly',tx=>tx.objectStore('items').get(id));return choice==='crop'?'crop':item?.backgroundFailed?'original':choice!=='original'&&item?.cutoutApproved?'cutout':'original'},
        selectLocalPhoto:(id,choice,expectedCutoutRevision)=>new Promise((done,fail)=>{
          const tx=db.transaction(['items','cutoutPhotos','croppedPhotos','photoSelections'],'readwrite');let changed=false;
          const item=tx.objectStore('items').get(id),photo=tx.objectStore(choice==='crop'?'croppedPhotos':'cutoutPhotos').get(id);
          photo.onsuccess=safely(tx,()=>{if(choice==='cutout'&&item.result?.backgroundFailed)return;if(choice==='cutout'&&expectedCutoutRevision!==undefined&&(item.result?.cutoutRevision??0)!==expectedCutoutRevision)return;if(!item.result||!['original','cutout','crop'].includes(choice)||(choice!=='original'&&!photo.result))return;tx.objectStore('photoSelections').put(choice,id);tx.objectStore('items').put({...item.result,cutoutApproved:choice==='cutout',...choice!=='cutout'?{photoPreference:choice}:{}});changed=true});
          tx.oncomplete=()=>done(changed);tx.onabort=()=>fail(new Error('Не удалось выбрать фото.'));
        }),
        saveCrop:async(id,photo,expectedRevision,rect)=>{photo=await encodePhotos(photo);return new Promise((done,fail)=>{
          if(rect!==undefined&&!validCropRect(rect)){fail(new Error('Некорректная рамка.'));return}if(!photo.size||photo.size>20*1024*1024||!['image/png','image/jpeg','image/webp'].includes(photo.type)){fail(new Error('Некорректная обрезка.'));return}
          const tx=db.transaction(['items','photos','croppedPhotos','photoSelections'],'readwrite');let changed=false;const r=tx.objectStore('items').get(id),original=tx.objectStore('photos').get(id);
          original.onsuccess=safely(tx,()=>{const current=r.result as Item|undefined;if(!current||!original.result||(current.photoRevision??0)!==expectedRevision)return;const revision=expectedRevision+1;if(!Number.isSafeInteger(revision)){tx.abort();return}tx.objectStore('croppedPhotos').put(photo,id);tx.objectStore('photoSelections').put('crop',id);tx.objectStore('items').put({...current,photoRevision:revision,originalPhotoRevision:current.originalPhotoRevision??current.photoRevision??0,cropRect:rect,photoPreference:'crop',backgroundFailed:false,cutoutApproved:false,backgroundStatus:'waiting',analysisStatus:current.analysisStatus==='waiting'?'error':current.analysisStatus});changed=true});tx.oncomplete=()=>done(changed);tx.onabort=()=>fail(new Error('Не удалось сохранить обрезку. Оригинал сохранён.'));
        })},
        applyLocalPhoto:async(id,result,photoRevision,metadataRevision)=>{result=await encodePhotos(result);return new Promise((done,fail)=>{
          const tx=db.transaction(['items','photos','cutoutPhotos','photoSelections'],'readwrite');let changed=false;
          const selection=tx.objectStore('photoSelections').get(id),item=tx.objectStore('items').get(id),photo=tx.objectStore('photos').get(id);
          photo.onsuccess=safely(tx,()=>{const current=item.result as Item|undefined;if(!current||!photo.result||(current.photoRevision??0)!==photoRevision)return;
            writeLocalResult(tx,current,result,metadataRevision,selection.result);changed=true;
          });tx.oncomplete=()=>done(changed);tx.onabort=()=>fail(new Error('Не удалось сохранить обработанное фото.'));
        })},
        async stageLocalPhoto(id,result,photoRevision,metadataRevision){result=await encodePhotos(result);let changed=false;await transaction(['items','photos','pendingPhotos'],'readwrite',tx=>{const item=tx.objectStore('items').get(id),photo=tx.objectStore('photos').get(id);photo.onsuccess=safely(tx,()=>{const current=item.result as Item|undefined;if(!current||!photo.result||(current.photoRevision??0)!==photoRevision)return;tx.objectStore('pendingPhotos').put({id,token:newId(),result,photoRevision,metadataRevision,cutoutRevision:current.cutoutRevision??0} satisfies PendingPhoto);changed=true})});return changed},
        listPendingPhotos:()=>transaction<PendingPhoto[]>(['pendingPhotos'],'readonly',tx=>tx.objectStore('pendingPhotos').getAll()),
        async acceptPendingPhotos(choices){let accepted=0;await transaction(['pendingPhotos','items','photos','cutoutPhotos','photoSelections'],'readwrite',tx=>{for(const {id,token}of choices){const request=tx.objectStore('pendingPhotos').get(id);request.onsuccess=safely(tx,()=>{const pending=request.result as PendingPhoto|undefined;if(!pending||pending.token!==token)return;const item=tx.objectStore('items').get(id),original=tx.objectStore('photos').get(id),selection=tx.objectStore('photoSelections').get(id);selection.onsuccess=safely(tx,()=>{const current=item.result as Item|undefined;if(!current||!original.result||(current.photoRevision??0)!==pending.photoRevision||(current.cutoutRevision??0)!==pending.cutoutRevision)return;writeLocalResult(tx,current,pending.result,pending.metadataRevision,selection.result,true);tx.objectStore('pendingPhotos').delete(id);accepted++})})}});return accepted},
        async dismissPendingPhotos(choices){await transaction(['pendingPhotos'],'readwrite',tx=>{for(const {id,token}of choices){const request=tx.objectStore('pendingPhotos').get(id);request.onsuccess=safely(tx,()=>{if(request.result?.token===token)tx.objectStore('pendingPhotos').delete(id)})}})},
        getCatalogPhoto: id => transaction<Blob | undefined>(['catalogPhotos'], 'readonly', tx => tx.objectStore('catalogPhotos').get(id)),
        getProcessingSource:id=>new Promise((done,fail)=>{const tx=db.transaction(['items','photos','croppedPhotos'],'readonly'),item=tx.objectStore('items').get(id),photo=tx.objectStore('photos').get(id),crop=tx.objectStore('croppedPhotos').get(id);tx.oncomplete=()=>done(item.result&&photo.result?{item:normalizedCategory(item.result),photo:crop.result??photo.result,source:crop.result?'crop':'original'}:undefined);tx.onabort=()=>fail(new Error('Не удалось прочитать фото.'))}),
        getCatalogSource: id => new Promise((done, fail) => {
          const tx = db.transaction(['items', 'photos'], 'readonly');
          const item = tx.objectStore('items').get(id), photo = tx.objectStore('photos').get(id);
          tx.oncomplete = () => done(item.result && photo.result ? { item: normalizedCategory(item.result), photo: photo.result } : undefined);
          tx.onabort = () => fail(new Error('Не удалось прочитать исходное фото.'));
        }),
        async putCatalogPhoto(id, photo, photoRevision, metadataRevision) {
          if (!photo.size || photo.size > 12_000_000 || !['image/jpeg','image/png'].includes(photo.type)) throw new Error('Некорректное каталожное фото.');
          photo=await encodePhotos(photo);
          return new Promise<boolean>((done, fail) => {
            const tx = db.transaction(['items', 'photos', 'catalogPhotos', 'photoSelections'], 'readwrite'); let saved = false;
            const item = tx.objectStore('items').get(id), original = tx.objectStore('photos').get(id);
            original.onsuccess = safely(tx,() => {
              const current = item.result as Item | undefined;
              if (!current || !original.result || (current.photoRevision ?? 0) !== photoRevision || (current.metadataRevision ?? 0) !== metadataRevision) return;
              tx.objectStore('catalogPhotos').put(photo, id);
              tx.objectStore('photoSelections').delete(id); saved = true;
            });
            tx.oncomplete = () => done(saved); tx.onabort = () => fail(new Error('Не удалось сохранить каталожное фото.'));
          });
        },
        selectPhoto: (id, choice) => new Promise<boolean>((done, fail) => {
          const tx = db.transaction(['items', 'catalogPhotos', 'photoSelections'], 'readwrite'); let changed = false;
          const item = tx.objectStore('items').get(id), photo = tx.objectStore('catalogPhotos').get(id);
          photo.onsuccess = safely(tx,() => {
            if (!item.result || !['original','catalog'].includes(choice) || (choice === 'catalog' && !photo.result)) return;
            if (choice === 'catalog') tx.objectStore('photoSelections').put(true, id); else tx.objectStore('photoSelections').delete(id);
            changed = true;
          });
          tx.oncomplete = () => done(changed); tx.onabort = () => fail(new Error('Не удалось выбрать фото.'));
        }),
        async putItem(item, photo) {
          const errors = validateItem(item);
          if (errors.length) throw new Error(errors.join('. '));
          if (photo && (!photo.size || photo.size > 20 * 1024 * 1024)) throw new Error('Фотография пустая или слишком большая.');
          photo=await encodePhotos(photo);
          await transaction(['items', 'photos', 'catalogPhotos', 'photoSelections','cutoutPhotos','croppedPhotos','pendingPhotos'], 'readwrite', tx => {
            const current = tx.objectStore('items').get(item.id);
            current.onsuccess = safely(tx,() => {
              const photoRevision = (current.result?.photoRevision ?? 0) + (photo ? 1 : 0);
              const metadataRevision = current.result ? (current.result.metadataRevision ?? 0) + 1 : (item.metadataRevision ?? 0);
              if (!Number.isSafeInteger(photoRevision) || !Number.isSafeInteger(metadataRevision)) { tx.abort(); return; }
              tx.objectStore('items').put({ ...item, photoRevision, metadataRevision,...photo?{cutoutApproved:false,originalPhotoRevision:photoRevision}:{} });
              if (photo) {
                tx.objectStore('photos').put(photo, item.id);
                tx.objectStore('catalogPhotos').delete(item.id); tx.objectStore('photoSelections').delete(item.id);
                tx.objectStore('cutoutPhotos').delete(item.id);tx.objectStore('croppedPhotos').delete(item.id);
                tx.objectStore('pendingPhotos').delete(item.id);
              }
            });
          });
        },
        async patchItem(id,patch){
          if(!patch||Object.keys(patch).some(k=>!(editableItemFields as readonly string[]).includes(k)))throw new Error('Некорректные поля вещи.');
          let updated!:Item;let error:Error|undefined;
          await transaction(['items'],'readwrite',tx=>{const request=tx.objectStore('items').get(id);request.onsuccess=safely(tx,()=>{const current=request.result as Item|undefined;if(!current){error=new Error('Вещь уже удалена.');return}const next={...current,...patch,metadataRevision:(current.metadataRevision??0)+1};if(Object.hasOwn(patch,'category'))next.categoryManual=true;next.category=effectiveCategory(next);next.analysisStatus=next.category==='unknown'?'error':'done';if(validateItem(next).length){error=new Error('Проверьте описание вещи.');return}updated=next;tx.objectStore('items').put(next)})});
          if(error)throw error;return updated;
        },
        async applyPhotoMetadata(id, value, expectedRevision = 0) {
          const metadata = sanitizePhotoMetadata(value);
          return new Promise<Item | undefined>((done, fail) => {
            const tx = db.transaction('items', 'readwrite');
            let updated: Item | undefined;
            tx.oncomplete = () => done(updated);
            tx.onabort = () => fail(new Error('Не удалось сохранить описание вещи.'));
            const request = tx.objectStore('items').get(id);
            request.onsuccess = safely(tx,() => {
              const current = request.result as Item | undefined;
              if (!current || current.analysisStatus === 'done' || (current.metadataRevision ?? 0) !== expectedRevision) return;
              updated = { ...current, ...metadata, analysisStatus: metadata.category === 'unknown' ? 'error' : 'done' };
              tx.objectStore('items').put(updated);
            });
          });
        },
        deleteItem: id => transaction(['items', 'photos', 'catalogPhotos', 'photoSelections','cutoutPhotos','croppedPhotos','pendingPhotos'], 'readwrite', tx => {
          tx.objectStore('items').delete(id); tx.objectStore('photos').delete(id);
          tx.objectStore('catalogPhotos').delete(id); tx.objectStore('photoSelections').delete(id);
          tx.objectStore('cutoutPhotos').delete(id);tx.objectStore('croppedPhotos').delete(id);
          tx.objectStore('pendingPhotos').delete(id);
        }),
        listOutfits: () => transaction<Outfit[]>(['outfits'], 'readonly', tx => tx.objectStore('outfits').getAll()),
        async putOutfit(outfit) {
          if(!validLayout(outfit.layout,outfit.itemIds))throw new Error('Не удалось сохранить: размер вещи слишком мал или вещь выходит за холст. Измените размер либо сбросьте раскладку.');
          const errors=validateConditions(outfit.conditions);if(errors.length)throw new Error(errors.join('. '));
          if (!validOutfit(outfit)) throw new Error('Не удалось сохранить некорректный образ.');
          await transaction(['outfits'], 'readwrite', tx => { tx.objectStore('outfits').put(outfit); });
        },
        deleteOutfit: id => transaction(['outfits'], 'readwrite', tx => { tx.objectStore('outfits').delete(id); }),
        close: () => db.close(),
      }));
    };
  });
}
