import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCloset} from '../src/storage';
import type {Item} from '../src/domain';
const item:Item={id:'personal',name:'Рубашка',category:'top',color:'Белый',season:['all'],warmth:'light',rain:'unknown',wind:'unknown',heel:'no',demo:false,createdAt:'2026-11-10'};
test('camera filename and modification date survive byte storage',async()=>{
 const name=crypto.randomUUID(),s=await openCloset(name);await s.putItem(item,new File(['photo'],'camera.jpg',{type:'image/jpeg',lastModified:12345}));s.close();
 const reopened=await openCloset(name),photo=await reopened.getOriginalPhoto(item.id) as File;assert.equal(photo.name,'camera.jpg');assert.equal(photo.lastModified,12345);reopened.close();
});
// Simulate loss of IndexedDB's external Blob backing files across a restart.
async function loseBlobFiles(name:string){
 const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open(name);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('photos','readwrite'),store=tx.objectStore('photos'),r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;if(c.value instanceof Blob)c.update(new Blob([],{type:c.value.type}));c.continue()};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error)});db.close();
}
for(const mode of ['upload','import','replace'] as const)test(`${mode}: original bytes survive a restart without Blob backing files`,async()=>{
 const name=crypto.randomUUID(),store=await openCloset(name),blob=new Blob(['original photograph'],{type:'image/jpeg'});
 if(mode==='upload')await store.putItem(item,blob);
 else {const snapshot={items:[item],photos:[{id:item.id,blob}],outfits:[]};if(mode==='import')await store.mergeSnapshot(snapshot);else await store.replaceWardrobe(snapshot,'replace')}
 store.close();await loseBlobFiles(name);const reopened=await openCloset(name);
 assert.equal(await(await reopened.getPhoto(item.id))?.text(),'original photograph');
 assert.equal(await(await reopened.getOriginalPhoto(item.id))?.text(),'original photograph');
 assert.equal(await(await reopened.getProcessingSource(item.id))?.photo.text(),'original photograph');
 assert.equal(await(await reopened.snapshot()).photos[0].blob.text(),'original photograph');reopened.close();
});
