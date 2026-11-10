import { newId, validateItem, validateConditions,seasons, type Item, type Outfit } from './domain';
import type { ClosetSnapshot } from './storage';
import {validLayout} from './layout';

export const BACKUP_LIMIT = 100 * 1024 * 1024;
export const BINARY_LIMIT = 250 * 1024 * 1024;
const bad = () => new Error('Файл гардероба повреждён или имеет неподдерживаемый формат.');
const object = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, limit = 5000): v is string => typeof v === 'string' && v.length <= limit;
const id = (v: unknown): v is string => text(v, 150) && !!v.trim();
// Preserve even an original whose camera did not provide MIME metadata.
const photoType=(value:unknown):value is string=>typeof value==='string'&&(value===''||value==='application/octet-stream'||/^image\/[a-z0-9][a-z0-9.+-]{0,79}$/.test(value));
function validBase64(value: string): boolean {
  if (!value.length || value.length % 4 || /[^A-Za-z0-9+/=]/.test(value)) return false;
  const padding = value.indexOf('=');
  return padding < 0 || (padding === value.length - 1 || (padding === value.length - 2 && value.endsWith('==')));
}
export function validOutfit(o: unknown): o is Outfit {
  return object(o) && id(o.id) && text(o.title, 150) && !!o.title.trim() && text(o.explanation) && text(o.createdAt, 150)
    && ['rules', 'ai','manual'].includes(o.mode) && !validateConditions(o.conditions).length
    && Array.isArray(o.itemIds) && o.itemIds.length > 0 && o.itemIds.length <= 30 && o.itemIds.every(id) && new Set(o.itemIds).size === o.itemIds.length
    && (o.viewMode===undefined||o.viewMode==='photos'||o.viewMode==='silhouettes') && validLayout(o.layout,o.itemIds) && (o.season===undefined||(typeof o.season==='string'&&Object.hasOwn(seasons,o.season))) && (o.itemSnapshots === undefined || (Array.isArray(o.itemSnapshots) && o.itemSnapshots.length <= 30 && o.itemSnapshots.every((i: unknown) => !validateItem(i).length)));
}
export function validateSnapshot(value: unknown): asserts value is ClosetSnapshot {
  if (!object(value) || !Array.isArray(value.items) || !Array.isArray(value.outfits) || !Array.isArray(value.photos)
    || value.items.length > 5000 || value.outfits.length > 5000 || value.photos.length > value.items.length
    || value.items.some((i: unknown) => validateItem(i).length) || value.outfits.some((o: unknown) => !validOutfit(o))) throw bad();
  const ids = new Set(value.items.map((i: Item) => i.id));
  if (ids.size !== value.items.length || new Set(value.outfits.map((o: Outfit) => o.id)).size !== value.outfits.length || new Set(value.photos.map((p: any) => p?.id)).size !== value.photos.length) throw bad();
  const cutouts=value.cutoutPhotos??[], originals=value.originalSelectedIds??[],crops=value.croppedPhotos??[],cropChoices=value.cropSelectedIds??[];
  if(!Array.isArray(crops)||!Array.isArray(cropChoices)||new Set(crops.map((p:any)=>p?.id)).size!==crops.length||new Set(cropChoices).size!==cropChoices.length)throw bad();
  if(!Array.isArray(cutouts)||!Array.isArray(originals)||new Set(cutouts.map((p:any)=>p?.id)).size!==cutouts.length||new Set(originals).size!==originals.length)throw bad();
  const catalogs = value.catalogPhotos ?? [], selections = value.catalogSelectedIds ?? [];
  if (!Array.isArray(catalogs) || catalogs.length > value.items.length || !Array.isArray(selections) || selections.length > catalogs.length || new Set(catalogs.map((p: any) => p?.id)).size !== catalogs.length || new Set(selections).size !== selections.length) throw bad();
  const originalIds = new Set(value.photos.map((p: any) => p.id)), catalogIds = new Set(catalogs.map((p: any) => p.id));
  if (catalogs.some((p: any) => !originalIds.has(p?.id)) || selections.some((s: unknown) => !id(s) || !catalogIds.has(s))) throw bad();
  if(cutouts.some((p:any)=>!originalIds.has(p?.id))||originals.some((v:unknown)=>!id(v)||!ids.has(v)||selections.includes(v)))throw bad();
  if(crops.some((p:any)=>!originalIds.has(p?.id))||cropChoices.some((v:unknown)=>!id(v)||!crops.some((p:any)=>p.id===v)||originals.includes(v)||selections.includes(v)))throw bad();
  let total = 0;
  for (const p of [...value.photos, ...catalogs,...cutouts,...crops]) {
    if (!object(p) || !ids.has(p.id) || !(p.blob instanceof Blob) || !p.blob.size || p.blob.size > 20 * 1024 * 1024 || !photoType(p.blob.type)) throw bad();
    total += p.blob.size;
  }
  if (total > BINARY_LIMIT) throw new Error('Копия слишком большая: поддерживаются файлы до 250 МБ.');
}
export async function encodeBackup(snapshot: ClosetSnapshot): Promise<Blob> {
  validateSnapshot(snapshot);
  const parts: BlobPart[] = [JSON.stringify({ format: 'svoy-garderob', version: 4, createdAt: new Date().toISOString(), items: snapshot.items, outfits: snapshot.outfits, catalogSelectedIds: snapshot.catalogSelectedIds ?? [],originalSelectedIds:snapshot.originalSelectedIds??[],cropSelectedIds:snapshot.cropSelectedIds??[] }).slice(0, -1)];
  for (const [key, photos] of [['photos', snapshot.photos], ['catalogPhotos', snapshot.catalogPhotos ?? []],['cutoutPhotos',snapshot.cutoutPhotos??[]],['croppedPhotos',snapshot.croppedPhotos??[]]] as const) {
    parts.push(`,"${key}":[`);
    for (const [index, p] of photos.entries()) {
      const bytes = new Uint8Array(await p.blob.arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
      parts.push((index ? ',' : '') + JSON.stringify({ id: p.id, type: p.blob.type, data: btoa(binary) }));
    }
    parts.push(']');
  }
  parts.push('}');
  const blob = new Blob(parts, { type: 'application/json' });
  if (blob.size > BACKUP_LIMIT) throw new Error('Копия слишком большая: поддерживаются файлы до 100 МБ.');
  return blob;
}
export async function decodeBackup(file: Blob): Promise<ClosetSnapshot> {
  if (!file.size || file.size > BACKUP_LIMIT) throw new Error('Выберите файл гардероба размером до 100 МБ.');
  try {
    const data = JSON.parse(await file.text());
    if (!object(data) || data.format !== 'svoy-garderob' || ![1,2,3,4].includes(data.version)) throw bad();
    const decodePhotos = (list: unknown) => {
      if (!Array.isArray(list) || list.length > 5000) throw bad();
      return list.map((p: unknown) => {
      if (!object(p) || !id(p.id) || !photoType(p.type) || typeof p.data !== 'string' || p.data.length > 28 * 1024 * 1024 || !validBase64(p.data)) throw bad();
      const bytes = Uint8Array.from(atob(p.data), c => c.charCodeAt(0));
      return { id: p.id, blob: new Blob([bytes], { type: p.type }) };
      });
    };
    const photos = decodePhotos(data.photos), catalogPhotos = data.version >= 2 ? decodePhotos(data.catalogPhotos) : [];
    const snapshot = { items: data.items, outfits: data.outfits, photos, catalogPhotos, catalogSelectedIds: data.version >= 2 ? data.catalogSelectedIds : [],cutoutPhotos:data.version>=3?decodePhotos(data.cutoutPhotos):[],originalSelectedIds:data.version>=3?data.originalSelectedIds:[],croppedPhotos:data.version>=4?decodePhotos(data.croppedPhotos):[],cropSelectedIds:data.version>=4?data.cropSelectedIds:[] };
    validateSnapshot(snapshot);
    return snapshot;
  } catch { throw bad(); }
}
export function copySnapshot(snapshot: ClosetSnapshot): ClosetSnapshot {
  validateSnapshot(snapshot);
  const ids = new Map<string, string>();
  const remap = (old: string): string => { if (!ids.has(old)) ids.set(old, newId()); return ids.get(old)!; };
  const copyItem = (i: Item): Item => ({ ...i, id: remap(i.id), analysisStatus: i.analysisStatus === 'waiting' ? 'error' : i.analysisStatus });
  return {
    croppedPhotos:(snapshot.croppedPhotos??[]).map(p=>({...p,id:remap(p.id)})),cropSelectedIds:(snapshot.cropSelectedIds??[]).map(remap),
    cutoutPhotos:(snapshot.cutoutPhotos??[]).map(p=>({...p,id:remap(p.id)})),originalSelectedIds:(snapshot.originalSelectedIds??[]).map(remap),
    items: snapshot.items.map(copyItem), photos: snapshot.photos.map(p => ({ ...p, id: remap(p.id) })),
    catalogPhotos: (snapshot.catalogPhotos ?? []).map(p => ({ ...p, id: remap(p.id) })), catalogSelectedIds: (snapshot.catalogSelectedIds ?? []).map(remap),
    outfits: snapshot.outfits.map(o => ({ ...o, id: newId(), itemIds: o.itemIds.map(remap), layout:o.layout?Object.fromEntries(Object.entries(o.layout).map(([id,p])=>[remap(id),p])):undefined,conditions: { ...o.conditions, pinnedId: o.conditions.pinnedId ? remap(o.conditions.pinnedId) : '' }, itemSnapshots: o.itemSnapshots?.map(copyItem) })),
  };
}
