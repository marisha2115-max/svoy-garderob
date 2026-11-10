import {Zip,ZipPassThrough} from 'fflate';
import {BINARY_LIMIT,validateSnapshot,decodeBackup} from './backup';
import type {ClosetSnapshot} from './storage';
const encoder=new TextEncoder(),decoder=new TextDecoder('utf-8',{fatal:true});
const bad=()=>new Error('Копия повреждена или имеет неподдерживаемый формат. Выберите ZIP, созданный приложением, или прежнюю JSON-копию.');
const keys=['photos','cutoutPhotos','catalogPhotos','croppedPhotos'] as const;
type Descriptor={id:string;path:string;type:string;size:number};
function manifest(snapshot:ClosetSnapshot){
 const data:any={format:'svoy-garderob-zip',version:1,items:snapshot.items,outfits:snapshot.outfits,catalogSelectedIds:snapshot.catalogSelectedIds??[],originalSelectedIds:snapshot.originalSelectedIds??[],cropSelectedIds:snapshot.cropSelectedIds??[]};
 for(const key of keys)data[key]=(snapshot[key]??[]).map((p,n)=>({id:p.id,path:`${key}/${n}.bin`,type:p.blob.type,size:p.blob.size}));
 return data;
}
export function estimateArchiveSize(snapshot:ClosetSnapshot):number{
 validateSnapshot(snapshot);const data=encoder.encode(JSON.stringify(manifest(snapshot)));
 if(data.length>4*1024*1024)throw new Error('Описание гардероба превышает 4 МБ.');
 // Conservative upper bound including local headers, descriptors and central directory.
 return data.length+keys.reduce((sum,key)=>sum+(snapshot[key]??[]).reduce((n,p)=>n+p.blob.size+256,0),0)+512;
}
export async function encodeArchive(snapshot:ClosetSnapshot):Promise<Blob>{
 if(estimateArchiveSize(snapshot)>BINARY_LIMIT)throw new Error('Копия превышает 250 МБ. Перенесите часть фотографий отдельно.');
 const parts:BlobPart[]=[];let failure:Error|undefined;
 const zip=new Zip((error,chunk)=>{if(error)failure=error;else parts.push(chunk.slice() as Uint8Array<ArrayBuffer>)});
 const add=async(name:string,blob:Blob)=>{const entry=new ZipPassThrough(name);zip.add(entry);const reader=blob.stream().getReader();try{while(true){const {value,done}=await reader.read();if(done)break;entry.push(value);if(failure)throw failure}entry.push(new Uint8Array(),true)}finally{reader.releaseLock()}};
 try{await add('manifest.json',new Blob([JSON.stringify(manifest(snapshot))]));for(const key of keys)for(const [n,p] of (snapshot[key]??[]).entries())await add(`${key}/${n}.bin`,p.blob);zip.end();if(failure)throw failure;return new Blob(parts,{type:'application/zip'})}catch(e){zip.terminate();throw e}
}
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0});
async function crc(blob:Blob){let value=0xffffffff;const reader=blob.stream().getReader();try{while(true){const {value:chunk,done}=await reader.read();if(done)break;for(const b of chunk)value=crcTable[(value^b)&255]^(value>>>8)}return (value^0xffffffff)>>>0}finally{reader.releaseLock()}}
export async function decodeArchive(file:Blob):Promise<ClosetSnapshot>{
 if(!file.size||file.size>BINARY_LIMIT)throw new Error('Выберите копию размером до 250 МБ.');
 if(await file.slice(0,2).text()!=='PK')return decodeBackup(file);
 try{
  // Only stored ZIP entries are accepted: bounded binary reads, no decompression bombs.
  const tail=new DataView(await file.slice(Math.max(0,file.size-65557)).arrayBuffer());let end=-1;
  for(let p=tail.byteLength-22;p>=0;p--)if(tail.getUint32(p,true)===0x06054b50&&p+22+tail.getUint16(p+20,true)===tail.byteLength){end=p;break}
  if(end<0||tail.getUint16(end+4,true)||tail.getUint16(end+6,true))throw bad();
  const count=tail.getUint16(end+10,true),size=tail.getUint32(end+12,true),offset=tail.getUint32(end+16,true),endOffset=file.size-tail.byteLength+end;
  if(count<1||count>20001||count!==tail.getUint16(end+8,true)||size>4*1024*1024||offset+size!==endOffset)throw bad();
  const central=new DataView(await file.slice(offset,offset+size).arrayBuffer()),files=new Map<string,Blob>();let pos=0,lastEnd=0;
  for(let n=0;n<count;n++){
   if(pos+46>size||central.getUint32(pos,true)!==0x02014b50)throw bad();
   const flags=central.getUint16(pos+8,true),method=central.getUint16(pos+10,true),checksum=central.getUint32(pos+16,true),packed=central.getUint32(pos+20,true),length=central.getUint32(pos+24,true),nameLength=central.getUint16(pos+28,true),extra=central.getUint16(pos+30,true),comment=central.getUint16(pos+32,true),local=central.getUint32(pos+42,true);
   if(pos+46+nameLength+extra+comment>size||flags&~0x808||method!==0||packed!==length||central.getUint16(pos+34,true))throw bad();
   const name=decoder.decode(new Uint8Array(central.buffer,pos+46,nameLength));
   if(!/^(manifest\.json|(photos|cutoutPhotos|catalogPhotos|croppedPhotos)\/\d{1,5}\.bin)$/.test(name)||files.has(name)||length>(name==='manifest.json'?4:20)*1024*1024||local<lastEnd||local+30>offset)throw bad();
   const header=new DataView(await file.slice(local,local+30).arrayBuffer());
   if(header.getUint32(0,true)!==0x04034b50||header.getUint16(6,true)!==flags||header.getUint16(8,true)!==method||header.getUint16(26,true)!==nameLength)throw bad();
   const start=local+30+nameLength+header.getUint16(28,true);
   if(start+length>offset||decoder.decode(await file.slice(local+30,local+30+nameLength).arrayBuffer())!==name)throw bad();
   const blob=file.slice(start,start+length);if(await crc(blob)!==checksum)throw bad();files.set(name,blob);lastEnd=start+length;pos+=46+nameLength+extra+comment;
  }
  if(pos!==size||!files.has('manifest.json'))throw bad();
  const data=JSON.parse(await files.get('manifest.json')!.text());if(data.format!=='svoy-garderob-zip'||data.version!==1)throw bad();
  const snapshot:any={items:data.items,outfits:data.outfits,catalogSelectedIds:data.catalogSelectedIds,originalSelectedIds:data.originalSelectedIds,cropSelectedIds:data.cropSelectedIds??[]};const used=new Set(['manifest.json']);
  for(const key of keys){if(key==='croppedPhotos'&&data[key]===undefined)data[key]=[];if(!Array.isArray(data[key])||data[key].length>5000)throw bad();snapshot[key]=data[key].map((p:Descriptor,n:number)=>{if(!p||p.path!==`${key}/${n}.bin`||typeof p.type!=='string'||!files.has(p.path)||used.has(p.path)||files.get(p.path)!.size!==p.size)throw bad();used.add(p.path);return {id:p.id,blob:files.get(p.path)!.slice(0,p.size,p.type)}})}
  if(used.size!==files.size)throw bad();validateSnapshot(snapshot);return snapshot;
 }catch{throw bad()}
}
