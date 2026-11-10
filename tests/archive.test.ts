import {test} from 'node:test';
import assert from 'node:assert/strict';
import {zipSync} from 'fflate';
import {encodeArchive,decodeArchive,estimateArchiveSize} from '../src/archive';
import {encodeBackup} from '../src/backup';
import type {Item} from '../src/domain';
import {defaultConditions} from '../src/domain';import {assessMask} from '../src/mask-quality';
const item:Item={id:'mine',name:'Мой свитер',category:'top',color:'Терракотовый',season:['all'],warmth:'warm',rain:'unknown',wind:'unknown',heel:'unknown',demo:false,createdAt:'2026-11-09'};
const original=new Blob([new Uint8Array([255,216,1,2,3,255,217])],{type:'image/jpeg'});
const cutout=new Blob(['transparent-pixels'],{type:'image/png'});
const snapshot={items:[item],outfits:[],photos:[{id:item.id,blob:original}],cutoutPhotos:[{id:item.id,blob:cutout}],originalSelectedIds:[item.id]};
test('binary ZIP preserves original, cutout and selection byte for byte without base64',async()=>{
 const archive=await encodeArchive(snapshot);assert.equal((await archive.slice(0,2).text()),'PK');assert.ok(archive.size<=estimateArchiveSize(snapshot));
 const restored=await decodeArchive(archive);assert.deepEqual(restored.items,snapshot.items);assert.deepEqual(restored.originalSelectedIds,[item.id]);
 assert.deepEqual(await restored.photos[0].blob.arrayBuffer(),await original.arrayBuffer());assert.deepEqual(await restored.cutoutPhotos![0].blob.arrayBuffer(),await cutout.arrayBuffer());
});
test('old JSON copies can still be imported',async()=>{assert.deepEqual((await decodeArchive(await encodeBackup(snapshot))).items,[item])});
test('copy preserves crop, quality decisions and silhouette preference',async()=>{const mask=new Uint8Array(10000);for(let y=10;y<80;y++)for(let x=10;x<80;x++)mask[y*100+x]=1;const quality={version:1 as const,source:'crop' as const,attempts:[{method:'universal' as const,metrics:assessMask(mask,100,100),elapsedMs:10}],selected:'universal' as const,elapsedMs:11};const enriched={...item,backgroundReport:quality,backgroundFailed:false,cutoutApproved:true,cropRect:{x:.1,y:.1,width:.8,height:.8}};const outfit={id:'look',title:'Работа, +8°',itemIds:[item.id],conditions:defaultConditions,explanation:'',mode:'manual' as const,viewMode:'silhouettes' as const,createdAt:'2026-11-10'};const s={...snapshot,items:[enriched],outfits:[outfit]};const restored=await decodeArchive(await encodeArchive(s));assert.deepEqual(restored.items,[enriched]);assert.deepEqual(restored.outfits,[outfit]);await assert.rejects(encodeArchive({...s,outfits:[{...outfit,viewMode:'bad' as any}]}))});
test('camera originals without MIME and GIF originals remain exportable',async()=>{for(const type of ['','image/gif','image/heic']){const blob=new Blob(['original-bytes'],{type});const restored=await decodeArchive(await encodeArchive({...snapshot,photos:[{id:item.id,blob}]}));assert.equal(await restored.photos[0].blob.text(),'original-bytes');assert.equal(restored.photos[0].blob.type,type)}});
test('malformed new tags are rejected before creating a copy',async()=>{for(const changed of [{...item,subcategory:{}},{...item,backgroundStatus:'again'},{...item,analysisStatus:[]}])await assert.rejects(encodeArchive({...snapshot,items:[changed as any]}))});
test('refuses corrupt bytes, truncation, traversal, compression and files over limit',async()=>{
 const bytes=new Uint8Array(await (await encodeArchive(snapshot)).arrayBuffer());bytes[bytes.indexOf(255)]^=1;
 await assert.rejects(decodeArchive(new Blob([bytes])));
 await assert.rejects(decodeArchive(new Blob([bytes.subarray(0,40)])));
 for(const [name,level] of [['../manifest.json',0],['manifest.json',6]] as const)await assert.rejects(decodeArchive(new Blob([zipSync({[name]:new TextEncoder().encode('{}')},{level}) as Uint8Array<ArrayBuffer>])));
 await assert.rejects(decodeArchive(new Blob([new Uint8Array(251*1024*1024)])));
});
