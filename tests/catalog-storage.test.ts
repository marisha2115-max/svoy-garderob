import 'fake-indexeddb/auto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {openCloset} from '../src/storage';
import {encodeBackup,decodeBackup,copySnapshot} from '../src/backup';
import type {Item} from '../src/domain';
const item:Item={id:'skirt',name:'Кружевная юбка',category:'bottom',color:'Коричневый',season:['all'],warmth:'light',rain:'unknown',wind:'unknown',heel:'unknown',demo:false,createdAt:'2026-11-08',analysisStatus:'done'};
const original=new Blob(['original'],{type:'image/jpeg'}),generated=new Blob(['catalog'],{type:'image/jpeg'});
test('legacy catalogue is retained in copies but original is shown until new approval',async()=>{
 const name='catalog-'+crypto.randomUUID();let store=await openCloset(name);
 try {
  await store.putItem(item,original);const source=(await store.getCatalogSource(item.id))!;
  assert.equal(await store.putCatalogPhoto(item.id,generated,source.item.photoRevision??0,source.item.metadataRevision??0),true);
  assert.equal(await (await store.getPhoto(item.id))?.text(),'original');
  assert.equal(await store.selectPhoto(item.id,'catalog'),true);assert.equal(await (await store.getPhoto(item.id))?.text(),'original');
  assert.equal(await (await store.getOriginalPhoto(item.id))?.text(),'original');
  const file=await encodeBackup(await store.snapshot());const restored=copySnapshot(await decodeBackup(file));
  const target=await openCloset('catalog-copy-'+crypto.randomUUID());try{await target.mergeSnapshot(restored);const id=restored.items[0].id;assert.equal(await (await target.getPhoto(id))?.text(),'original');assert.equal(await (await target.getOriginalPhoto(id))?.text(),'original')}finally{target.close()}
  store.close();store=await openCloset(name);assert.equal(await (await store.getPhoto(item.id))?.text(),'original');
  await store.selectPhoto(item.id,'original');assert.equal(await (await store.getPhoto(item.id))?.text(),'original');
 }finally{store.close()}
});
test('late catalogue results cannot recreate deleted clothes or replace a newer original',async()=>{
 const store=await openCloset('catalog-race-'+crypto.randomUUID());try{
  await store.putItem(item,original);const source=(await store.getCatalogSource(item.id))!;
  await store.putItem(item,new Blob(['new-original'],{type:'image/jpeg'}));
  assert.equal(await store.putCatalogPhoto(item.id,generated,source.item.photoRevision??0,0),false);
  assert.equal(await store.getCatalogPhoto(item.id),undefined);
  const next=(await store.getCatalogSource(item.id))!;
  assert.equal(await store.putCatalogPhoto(item.id,generated,next.item.photoRevision??0,next.item.metadataRevision??0),true);assert.equal(await store.selectPhoto(item.id,'catalog'),true);
  await store.putItem(item,new Blob(['third'],{type:'image/jpeg'}));assert.equal(await (await store.getPhoto(item.id))?.text(),'third');assert.equal(await store.getCatalogPhoto(item.id),undefined);
  const last=(await store.getCatalogSource(item.id))!;await store.deleteItem(item.id);assert.equal(await store.putCatalogPhoto(item.id,generated,last.item.photoRevision??0,0),false);assert.equal(await store.selectPhoto(item.id,'catalog'),false);assert.equal((await store.snapshot()).catalogPhotos?.length,0);
 }finally{store.close()}
});
test('upgrading the existing v1 database preserves its wardrobe and original photo',async()=>{
 const name='legacy-'+crypto.randomUUID();await new Promise<void>((done,fail)=>{const req=indexedDB.open(name,1);req.onupgradeneeded=()=>{const db=req.result;db.createObjectStore('items',{keyPath:'id'});db.createObjectStore('photos');db.createObjectStore('outfits',{keyPath:'id'})};req.onerror=()=>fail(req.error);req.onsuccess=()=>{const db=req.result;const tx=db.transaction(['items','photos'],'readwrite');tx.objectStore('items').put(item);tx.objectStore('photos').put(original,item.id);tx.oncomplete=()=>{db.close();done()};tx.onabort=()=>fail(tx.error)}});
 const store=await openCloset(name);try{assert.equal((await store.listItems())[0].name,item.name);assert.equal(await (await store.getPhoto(item.id))?.text(),'original');assert.equal(await store.getCatalogPhoto(item.id),undefined)}finally{store.close()}
});
test('a late result after manual description edits is rejected and regenerating a selected candidate requires a new choice',async()=>{
 const store=await openCloset('catalog-metadata-'+crypto.randomUUID());try{
  await store.putItem(item,original);const first=(await store.getCatalogSource(item.id))!;
  await store.putItem({...first.item,metadataRevision:1,name:'Уточнённая юбка'});
  assert.equal(await store.putCatalogPhoto(item.id,generated,first.item.photoRevision??0,0),false);
  const source=(await store.getCatalogSource(item.id))!;
  await store.putCatalogPhoto(item.id,generated,source.item.photoRevision??0,1);await store.selectPhoto(item.id,'catalog');
  await store.putCatalogPhoto(item.id,new Blob(['new-catalog'],{type:'image/jpeg'}),source.item.photoRevision??0,1);
  assert.equal(await (await store.getPhoto(item.id))?.text(),'original','new candidate must never silently become active');
  assert.equal(await (await store.getCatalogPhoto(item.id))?.text(),'new-catalog');
 }finally{store.close()}
});
test('old version1 backup remains readable and broken catalogue selections are refused',async()=>{
 const file=await encodeBackup({items:[item],photos:[{id:item.id,blob:original}],outfits:[]});
 const data=JSON.parse(await file.text());data.version=1;delete data.catalogPhotos;delete data.catalogSelectedIds;
 const restored=await decodeBackup(new Blob([JSON.stringify(data)]));assert.equal(await restored.photos[0].blob.text(),'original');assert.deepEqual(restored.catalogPhotos,[]);
 const invalid={...data,version:2,catalogPhotos:[],catalogSelectedIds:[item.id]};
 await assert.rejects(decodeBackup(new Blob([JSON.stringify(invalid)])));
});
test('two stale editors cannot reuse a metadata revision and accept a result for the earlier description',async()=>{
 const store=await openCloset('catalog-tabs-'+crypto.randomUUID());try{
  await store.putItem(item,original);const stale=(await store.listItems())[0];
  await store.putItem({...stale,name:'Кружевная юбка',metadataRevision:1});const request=(await store.getCatalogSource(item.id))!;
  await store.putItem({...stale,name:'Однотонная юбка',metadataRevision:1});
  assert.equal(await store.putCatalogPhoto(item.id,generated,request.item.photoRevision??0,request.item.metadataRevision??0),false);
  assert.ok(((await store.listItems())[0].metadataRevision??0)>(request.item.metadataRevision??0));
 }finally{store.close()}
});
