import 'fake-indexeddb/auto';import {test} from 'node:test';import assert from 'node:assert/strict';
import {openCloset} from '../src/storage';import {demoItems} from '../src/demo';import {withSharedPhotos} from '../src/shared-wardrobe';
const item={...demoItems[0],id:'phone-123',demo:false,photoRevision:1};
const shared={version:1 as const,items:[item],photos:{[item.id]:'/shared-wardrobe/photos/photo.jpg'}};
test('shared photos-mode outfit keeps a preferred crop after a cutout becomes the active choice',async()=>{
 const raw=await openCloset(crypto.randomUUID());await raw.putItem({...item,photoRevision:0},new Blob(['original'],{type:'image/jpeg'}));const s=withSharedPhotos(raw,shared);
 await s.saveCrop(item.id,new Blob(['CROPPED'],{type:'image/jpeg'}),1);await s.applyLocalPhoto(item.id,{photo:new Blob(['cutout'],{type:'image/png'})},2,0);await s.selectLocalPhoto(item.id,'cutout');
 assert.equal(await raw.getLocalPhotoChoice(item.id),'cutout');assert.equal(await(await raw.getPreferredPhoto(item.id))?.text(),'CROPPED');assert.equal(await s.getPhotoUrl!(item.id,'preferred'),undefined);assert.equal(await(await s.getPreferredPhoto(item.id))?.text(),'CROPPED');s.close();
});
for(const kind of ['processing','catalog'] as const)test(`${kind}: an HTTP source in flight cannot claim the revision of a replaced original`,async()=>{
 const raw=await openCloset(crypto.randomUUID());await raw.putItem({...item,photoRevision:0},new Blob(['old'],{type:'image/jpeg'}));const s=withSharedPhotos(raw,shared),fetch=globalThis.fetch;
 let release!:(r:Response)=>void,started!:()=>void;const pending=new Promise<Response>(r=>release=r),ready=new Promise<void>(r=>started=r);
 globalThis.fetch=async()=>{started();return pending};
 try{const reading=kind==='processing'?s.getProcessingSource(item.id):s.getCatalogSource(item.id);await ready;await s.putItem((await s.listItems())[0],new Blob(['replacement'],{type:'image/jpeg'}));release(new Response('shared old photo'));const source=await reading;assert.equal(source?.item.photoRevision,1);assert.equal(await s.applyLocalPhoto(item.id,{photo:new Blob(['stale cutout'],{type:'image/png'})},source!.item.photoRevision!,source!.item.metadataRevision??0),false);assert.equal(await(await s.getPhoto(item.id))?.text(),'replacement')}finally{globalThis.fetch=fetch;s.close()}
});
test('HTTP originals recover existing records with missing photos for editing and export; deleted records stay absent',async()=>{
 const raw=await openCloset(crypto.randomUUID());await raw.putItem(item);const s=withSharedPhotos(raw,shared),fetch=globalThis.fetch;
 globalThis.fetch=async()=>new Response('server original',{headers:{'Content-Type':'image/jpeg'}});
 try{assert.equal(await s.getPhotoUrl!(item.id,'active'),shared.photos[item.id]);assert.equal(await(await s.getPhoto(item.id))?.text(),'server original');assert.equal(await(await s.getProcessingSource(item.id))?.photo.text(),'server original');assert.equal(await(await s.snapshot()).photos[0].blob.text(),'server original');await s.deleteItem(item.id);assert.equal(await s.getPhotoUrl!(item.id,'active'),undefined);assert.equal(await s.getOriginalPhoto(item.id),undefined)}finally{globalThis.fetch=fetch;s.close()}
});
test('local crops and replaced personal originals take priority over shared HTTP images',async()=>{
 const raw=await openCloset(crypto.randomUUID());await raw.putItem({...item,photoRevision:0},new Blob(['original'],{type:'image/jpeg'}));const s=withSharedPhotos(raw,shared);
 assert.equal(await raw.saveCrop(item.id,new Blob(['crop'],{type:'image/jpeg'}),1),true);assert.equal(await s.getPhotoUrl!(item.id,'active'),undefined);assert.equal(await(await s.getPreferredPhoto(item.id))?.text(),'crop');
 await s.putItem((await s.listItems())[0],new Blob(['replacement'],{type:'image/jpeg'}));assert.equal(await s.getPhotoUrl!(item.id,'original'),undefined);assert.equal(await(await s.getPhoto(item.id))?.text(),'replacement');s.close();
});
test('cropping a legacy shared item preserves HTTP access to its unchanged original and export',async()=>{
 const raw=await openCloset(crypto.randomUUID());await raw.putItem({...item,photoRevision:0},new Blob(['legacy'],{type:'image/jpeg'}));
 const s=withSharedPhotos(raw,shared),fetch=globalThis.fetch;globalThis.fetch=async()=>new Response('shared original',{headers:{'Content-Type':'image/jpeg'}});
 try{assert.equal(await s.saveCrop(item.id,new Blob(['crop'],{type:'image/jpeg'}),1),true);assert.equal(await s.getPhotoUrl!(item.id,'original'),shared.photos[item.id]);assert.equal(await(await s.getOriginalPhoto(item.id))?.text(),'shared original');assert.equal(await(await s.getPreferredPhoto(item.id))?.text(),'crop');assert.equal(await(await s.snapshot()).photos[0].blob.text(),'shared original')}finally{globalThis.fetch=fetch;s.close()}
});
