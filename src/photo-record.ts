// Keep bytes inside IndexedDB records, avoiding persistent external Blob files.
// Public storage APIs still accept and return Blobs, including legacy records.
export async function encodePhotos<T>(value:T):Promise<T>{
 if(value instanceof Blob)return {photoBytes:await value.arrayBuffer(),photoRecord:1,type:value.type,size:value.size,...typeof File!=='undefined'&&value instanceof File?{filename:value.name,lastModified:value.lastModified}:{}} as T;
 if(Array.isArray(value))return await Promise.all(value.map(encodePhotos)) as T;
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype){const entries=await Promise.all(Object.entries(value).map(async([k,v])=>[k,await encodePhotos(v)]));return Object.fromEntries(entries) as T}
 return value;
}
export function decodePhotos<T>(value:T):T{
 if(value&&typeof value==='object'&&'photoRecord' in value&&value.photoRecord===1&&'photoBytes' in value&&value.photoBytes instanceof ArrayBuffer){const record=value as any;return (typeof File!=='undefined'&&typeof record.filename==='string'?new File([record.photoBytes],record.filename,{type:record.type,lastModified:record.lastModified}):new Blob([record.photoBytes],{type:record.type})) as T}
 if(Array.isArray(value))return value.map(decodePhotos) as T;
 if(value&&typeof value==='object'&&Object.getPrototypeOf(value)===Object.prototype)return Object.fromEntries(Object.entries(value).map(([k,v])=>[k,decodePhotos(v)])) as T;
 return value;
}
export function decodeStore<T extends object>(store:T):T{
 return new Proxy(store,{get(target,key){const method=Reflect.get(target,key);if(typeof method!=='function'||key==='close')return method;return async(...args:unknown[])=>decodePhotos(await method.apply(target,args))}});
}
