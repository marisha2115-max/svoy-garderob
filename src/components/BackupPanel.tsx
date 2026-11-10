import { useState } from 'react';
import { copySnapshot } from '../backup';
import {decodeArchive,encodeArchive} from '../archive';
import type { ClosetSnapshot, ClosetStore } from '../storage';
import { Modal } from './Modal';

export function BackupPanel({ store, onClose, onImported, inline=false }: { store: ClosetStore; onClose?: () => void; onImported: () => Promise<void>;inline?:boolean }) {
  const [working, setWorking] = useState(false);
  const [preview, setPreview] = useState<ClosetSnapshot>();
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  async function download() {
    setWorking(true); setError(''); setNotice('');
    try {
      const snapshot=await store.snapshot();
      const file = await encodeArchive(snapshot);
      const url = URL.createObjectURL(file), link = document.createElement('a');
      link.href = url; link.download = `garderob-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setNotice('Файл подготовлен. Сохраните его в загрузках или в «Файлах» на iPhone.');
      const now=new Date().toISOString();try{localStorage.setItem('wardrobe-backup-prepared',now)}catch{/* the downloadable copy is still available */}
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }
  async function read(file?: File) {
    if (!file) return;
    setWorking(true); setPreview(undefined); setError(''); setNotice('');
    try { setPreview(await decodeArchive(file)); }
    catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }
  async function restore() {
    if (!preview) return;
    setWorking(true); setError('');
    try {
      await store.mergeSnapshot(copySnapshot(preview));
      setPreview(undefined);
      await onImported();
      setNotice('Копия добавлена. Ваши прежние вещи и образы сохранены.');
    } catch (e) { setError((e as Error).message); }
    finally { setWorking(false); }
  }
  const content=<>
    <p>Сохраните вещи и образы в ZIP до 250 МБ. При очистке браузера гардероб можно восстановить из этого файла.</p>
    <button className="button primary full" disabled={working} onClick={() => void download()}>{working ? 'Подождите…' : 'Скачать копию'}</button>
    <label className={`button secondary full ${working ? 'disabled' : ''}`}>Восстановить из файла<input className="sr-only" type="file" accept="application/zip,.zip,application/json,.json" aria-label="Файл гардероба" disabled={working} onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';void read(file)}}/></label>
    {preview && <div className="message"><p>Вещей: {preview.items.length}. Фотографий: {preview.photos.length + (preview.catalogPhotos?.length ?? 0)}. Образов: {preview.outfits.length}.</p><p>Добавим их как отдельную копию. Существующие вещи останутся на месте. Повторный импорт создаст ещё одну копию.</p><div className="modal-actions"><button className="button secondary" disabled={working} onClick={() => setPreview(undefined)}>Отмена</button><button className="button primary" disabled={working} onClick={() => void restore()}>Добавить копию</button></div></div>}
    {error && <p className="message error" role="alert">{error}</p>}
    {notice && <p className="message" role="status">{notice}</p>}
  </>;
  return inline?<section aria-label="Копия и перенос" className="backup-panel">{content}</section>:<Modal title="Копия и перенос" onClose={onClose!} busy={working}>{content}</Modal>;
}
