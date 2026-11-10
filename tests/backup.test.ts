import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openCloset } from '../src/storage';
import { encodeBackup, decodeBackup, copySnapshot } from '../src/backup';
import { defaultConditions, type Item, type Outfit } from '../src/domain';
const item: Item = { id: 'shirt', name: 'Моя рубашка', category: 'top', color: 'Белый', season: ['all'], warmth: 'light', rain: 'unknown', wind: 'unknown', heel: 'unknown', demo: false, createdAt: '2026-11-08', analysisStatus: 'waiting' };
const outfit: Outfit = { id: 'look', title: 'Любимый образ', explanation: 'Пример', itemIds: ['shirt', 'deleted-shoes'], itemSnapshots: [item, {...item, id: 'deleted-shoes', category: 'shoes'}], conditions: {...defaultConditions, pinnedId: 'shirt'}, mode: 'rules', createdAt: '2026-11-08' };
const photo = new Blob([new Uint8Array([255,216,255,217])], {type:'image/jpeg'});
test('backup moves photos, outfits and deleted references to a new database without overwriting existing ids', async () => {
 const targetName='target-'+crypto.randomUUID();
 const source=await openCloset('source-'+crypto.randomUUID()), target=await openCloset(targetName);
 try {
  await source.putItem(item,photo);await source.putOutfit(outfit);
  await target.putItem({...item,name:'Уже существующая рубашка'},photo);
  await target.putItem({...item,id:'deleted-shoes',category:'shoes'},photo);
  const encoded=await encodeBackup(await source.snapshot());
  const copied=copySnapshot(await decodeBackup(encoded));await target.mergeSnapshot(copied);
  assert.equal((await target.listItems()).length,3);
  assert.equal((await target.listItems()).find(i=>i.id==='shirt')?.name,'Уже существующая рубашка');
  const imported=(await target.listItems()).find(i=>i.id===copied.items[0].id)!;
  assert.notEqual(imported.id,item.id);assert.equal(imported.analysisStatus,'error','never automatically resend imported photos');
  assert.deepEqual(new Uint8Array(await (await target.getPhoto(imported.id))!.arrayBuffer()),new Uint8Array(await photo.arrayBuffer()));
  const restored=(await target.listOutfits())[0];assert.equal(restored.conditions.pinnedId,imported.id);assert.equal(restored.itemSnapshots![0].id,imported.id);
  assert.notEqual(restored.itemIds[1],'deleted-shoes','missing garment must not attach to an unrelated target item');
  assert.equal((await target.listItems()).some(i=>i.id===restored.itemIds[1]),false);
  target.close();const reopened=await openCloset(targetName);
  assert.equal((await reopened.listItems()).length,3);assert.equal((await reopened.listOutfits()).length,1);assert.equal((await reopened.getPhoto(imported.id))?.size,photo.size);reopened.close();
 }finally{source.close();target.close()}
});
test('bad version, duplicate records, malformed base64 and orphan photos are refused before import', async () => {
 const valid=JSON.parse(await (await encodeBackup({items:[item],photos:[{id:item.id,blob:photo}],outfits:[outfit]})).text());
 for(const changed of [{...valid,version:99},{...valid,items:[item,item]},{...valid,photos:[{...valid.photos[0],data:'not base64!'}]},{...valid,photos:[{...valid.photos[0],id:'absent'}]}]) await assert.rejects(decodeBackup(new Blob([JSON.stringify(changed)])));
});
test('merging conflicting ids fails atomically and keeps the previous garment and photograph', async () => {
 const store=await openCloset('atomic-'+crypto.randomUUID());
 try{await store.putItem(item,photo);await assert.rejects(store.mergeSnapshot({items:[{...item,id:'new'}, {...item,name:'Overwrite'}],photos:[{id:'new',blob:photo}],outfits:[]}));assert.deepEqual((await store.listItems()).map(i=>i.id),['shirt']);assert.equal(await store.getPhoto('new'),undefined);assert.equal((await store.listItems())[0].name,item.name)}finally{store.close()}
});
test('a multi-megabyte photo roundtrips without overflowing the base64 validator', async () => {
 const bytes=new Uint8Array(4_000_000).fill(7);
 const file=await encodeBackup({items:[item],outfits:[],photos:[{id:item.id,blob:new Blob([bytes],{type:'image/jpeg'})}]});
 const restored=await decodeBackup(file);
 assert.equal(restored.photos[0].blob.size,bytes.length);
 assert.deepEqual(new Uint8Array(await restored.photos[0].blob.arrayBuffer()),bytes);
});
test('a synchronous structured clone failure rolls back all earlier import writes', async () => {
 const store=await openCloset('sync-rollback-'+crypto.randomUUID());
 try {
  await store.putItem(item,photo);
  const unclonable={...item,id:'second',extra:()=>{}} as Item;
  await assert.rejects(store.mergeSnapshot({items:[{...item,id:'first'},unclonable],photos:[],outfits:[]}));
  assert.deepEqual((await store.listItems()).map(i=>i.id),['shirt']);
 }finally{store.close()}
});
