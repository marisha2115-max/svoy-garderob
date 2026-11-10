import {displayOutfitTitle} from '../presentation';
import type {Item,Outfit} from '../domain';import type {ClosetStore} from '../storage';import {FlatLay} from './FlatLay';
export function OutfitCard({outfit,items,store,version=0,onOpen,onDelete}:{outfit:Outfit;items:Item[];store:ClosetStore;version?:number;onOpen:()=>void;onDelete:()=>void}){
 const title=displayOutfitTitle(outfit);const picked=items.filter(i=>outfit.itemIds.includes(i.id)),missing=outfit.itemIds.length-picked.length;
 return <article className="outfit-card" data-outfit-card><button className="outfit-open" aria-label={`Открыть образ ${title}`} onClick={onOpen}><FlatLay items={picked} layout={outfit.layout} viewMode={outfit.viewMode} store={store} version={version}/><h3>{title}</h3></button>{missing>0&&<p className="small muted">Не хватает вещей: {missing}</p>}<div className="modal-actions"><button className="button secondary" onClick={onOpen}>Открыть</button><button className="button danger" onClick={onDelete}>Удалить</button></div></article>
}
