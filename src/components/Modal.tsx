import { useEffect, useRef, useId, type ReactNode } from 'react';
import { Icon } from './Icon';
export function Modal({ title, onClose, children, busy = false }: { title: string; onClose: () => void; children: ReactNode; busy?: boolean }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId=useId();
  useEffect(() => { const opener=document.activeElement;ref.current?.showModal(); const before = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { document.body.style.overflow = before;if(opener instanceof HTMLElement&&opener.isConnected)opener.focus({preventScroll:true}); }; }, []);
  return <dialog ref={ref} className="modal" onCancel={e => { e.preventDefault(); if (!busy) onClose(); }} aria-labelledby={titleId}>
    <div className="modal-head"><h2 id={titleId}>{title}</h2><button className="icon-button" aria-label="Закрыть" type="button" disabled={busy} onClick={onClose}><Icon name="close"/></button></div>
    {children}
  </dialog>;
}
