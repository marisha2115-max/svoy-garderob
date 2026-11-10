import { useEffect, useState } from 'react';
import type { ClosetStore } from '../storage';
import { Icon } from './Icon';
export function Photo({ store, id, alt, version = 0, variant = 'active' }: { store: ClosetStore; id: string; alt: string; version?: number; variant?: 'active' | 'original' | 'catalog' | 'cutout' | 'preferred' }) {
  const [url, setUrl] = useState('');const [fallback,setFallback]=useState(false);
  useEffect(() => {
    let active = true; let objectUrl = ''; setUrl('');
    void (async()=>{const http=fallback?undefined:await store.getPhotoUrl?.(id,variant);if(http){if(active)setUrl(http);return;}
    const photo = variant==='preferred'?store.getPreferredPhoto(id):variant==='cutout'?store.getCutoutPhoto(id):variant === 'original' ? store.getOriginalPhoto(id) : variant === 'catalog' ? store.getCatalogPhoto(id) : store.getPhoto(id);
    photo.then(blob => { if (active && blob) { objectUrl = URL.createObjectURL(blob); setUrl(objectUrl); } }).catch(() => {});})().catch(()=>{});
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [store, id, version, variant,fallback]);
  return url ? <img className="item-photo" src={url} alt={alt} loading="lazy" onError={()=>{if(!fallback)setFallback(true);else setUrl('')}}/> : <span className="photo-placeholder"><Icon name="hanger" size={36}/><span>Фото недоступно</span></span>;
}
