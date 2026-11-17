import {useEffect,useMemo,useState} from 'react';
import {categories,seasons,type Item,type Outfit,type ClothingStyle} from '../domain';import type {ClosetStore} from '../storage';
import {capsule,comboOutfit,conditionsForSale,missingPieces,packingList,packingText,saleAd,unwornItems,type Season,type Trip} from '../insights';
import {thingCount} from '../presentation';import {Modal} from './Modal';import {Photo} from './Photo';
export const setCount=(n:number)=>{const last=n%10,teens=n%100;return `${n} ${teens>=11&&teens<=14?'комплектов':last===1?'комплект':last>=2&&last<=4?'комплекта':'комплектов'}`};
async function copy(text:string):Promise<boolean>{try{await navigator.clipboard.writeText(text);return true}catch{return false}}
type Shared={store:ClosetStore;version:number};
function Thumb({item,store,version}:{item:Item}&Shared){return <span className="thumb" title={item.name}><Photo store={store} id={item.id} alt={item.name} version={version}/></span>}
function CopyButton({text,label='Скопировать'}:{text:string;label?:string}){const [state,setState]=useState('');useEffect(()=>{if(!state)return;const t=setTimeout(()=>setState(''),2500);return()=>clearTimeout(t)},[state]);
 return <button className="button primary full" onClick={()=>void copy(text).then(ok=>setState(ok?'Скопировано':'Не получилось — выделите текст и скопируйте вручную'))}>{state||label}</button>}

// ---- Объявление за минуту ----
export function SaleAd({item,store,version,onClose}:{item:Item;onClose:()=>void}&Shared){
 const [size,setSize]=useState(''),[condition,setCondition]=useState<string>(conditionsForSale[2]),[brand,setBrand]=useState(''),[price,setPrice]=useState(''),[note,setNote]=useState('');
 const ad=useMemo(()=>saleAd(item,{size,condition,brand,price,note}),[item,size,condition,brand,price,note]);
 const [text,setText]=useState(ad.text),[edited,setEdited]=useState(false);useEffect(()=>{if(!edited)setText(ad.text)},[ad.text,edited]);
 return <Modal title="Объявление за минуту" onClose={onClose}>
  <div className="idea-row"><Thumb item={item} store={store} version={version}/><p className="small muted">Заполните, что знаете, — текст соберётся сам. Его можно поправить и скопировать в Авито.</p></div>
  <div className="field-row"><label className="field">Размер<input aria-label="Размер" maxLength={20} placeholder="Например, 44 или M" value={size} onChange={e=>setSize(e.target.value)}/></label><label className="field">Состояние<select aria-label="Состояние" value={condition} onChange={e=>setCondition(e.target.value)}>{conditionsForSale.map(c=><option key={c}>{c}</option>)}</select></label></div>
  <div className="field-row"><label className="field">Бренд<input aria-label="Бренд" maxLength={40} placeholder="Если есть" value={brand} onChange={e=>setBrand(e.target.value)}/></label><label className="field">Цена, ₽<input aria-label="Цена" inputMode="numeric" maxLength={9} value={price} onChange={e=>setPrice(e.target.value)}/></label></div>
  <label className="field">Что ещё важно<input aria-label="Что ещё важно" maxLength={200} placeholder="Например, надевала два раза" value={note} onChange={e=>setNote(e.target.value)}/></label>
  <label className="field">Заголовок<input aria-label="Заголовок объявления" readOnly value={ad.title}/></label>
  <label className="field">Текст объявления<textarea aria-label="Текст объявления" rows={9} value={text} onChange={e=>{setText(e.target.value);setEdited(true)}}/></label>
  {!size.trim()&&<p className="small muted">Без размера покупатели чаще всего спрашивают именно о нём.</p>}
  {edited&&<button className="link-button" onClick={()=>setEdited(false)}>Собрать текст заново</button>}
  <CopyButton text={`${ad.title}\n\n${text}`} label="Скопировать объявление"/>
 </Modal>
}

// ---- Сборщик чемодана ----
const plans:[ClothingStyle,string][]=[['casual','Прогулки'],['business','Работа'],['smart','Вечер'],['sport','Спорт']];
interface SavedTrip extends Trip{title:string;done:string[]}
const emptyTrip:SavedTrip={title:'',days:5,temperature:18,rain:false,plans:['casual'],done:[]};
function loadTrip():SavedTrip{try{const v=JSON.parse(localStorage.getItem('wardrobe-trip')??'null');if(v&&typeof v==='object'&&Number.isFinite(v.days)&&Number.isFinite(v.temperature)&&Array.isArray(v.plans)&&Array.isArray(v.done))return{...emptyTrip,...v,title:String(v.title??'').slice(0,60),rain:!!v.rain,plans:v.plans.filter((p:unknown)=>plans.some(([k])=>k===p)),done:v.done.filter((d:unknown)=>typeof d==='string').slice(0,200)}}catch{}return emptyTrip}
function Suitcase({items,store,version,onClose}:{items:Item[];onClose:()=>void}&Shared){
 const [trip,setTrip]=useState(loadTrip);useEffect(()=>{try{localStorage.setItem('wardrobe-trip',JSON.stringify(trip))}catch{}},[trip]);
 const set=(patch:Partial<SavedTrip>)=>setTrip(t=>({...t,...patch}));
 const list=useMemo(()=>packingList(items,trip),[items,trip.days,trip.temperature,trip.rain,trip.plans.join()]);
 const toggle=(key:string)=>set({done:trip.done.includes(key)?trip.done.filter(k=>k!==key):[...trip.done,key]});
 const total=list.items.length+list.extras.length,packed=[...list.items.map(i=>i.id),...list.extras].filter(k=>trip.done.includes(k)).length;
 return <Modal title="Сборщик чемодана" onClose={onClose}>
  <label className="field">Куда<input aria-label="Куда едете" maxLength={60} placeholder="Например, Казань" value={trip.title} onChange={e=>set({title:e.target.value})}/></label>
  <div className="field-row"><label className="field">Сколько дней<input aria-label="Сколько дней" type="number" inputMode="numeric" min={1} max={30} value={Number.isNaN(trip.days)?'':trip.days} onChange={e=>set({days:e.target.value===''?NaN:Math.min(30,Math.max(1,Math.round(Number(e.target.value))))})}/></label><label className="field">Температура днём, °C<input aria-label="Температура днём" type="number" inputMode="decimal" min={-40} max={45} value={Number.isNaN(trip.temperature)?'':trip.temperature} onChange={e=>set({temperature:e.target.value===''?NaN:Math.min(45,Math.max(-40,Number(e.target.value)))})}/></label></div>
  <label className="check-row"><input type="checkbox" checked={trip.rain} onChange={e=>set({rain:e.target.checked})}/>Обещают дождь</label>
  <div className="occasion-chips" role="group" aria-label="Планы в поездке">{plans.map(([key,label])=><button key={key} className={trip.plans.includes(key)?'chip active':'chip'} aria-pressed={trip.plans.includes(key)} onClick={()=>set({plans:trip.plans.includes(key)?trip.plans.filter(p=>p!==key):[...trip.plans,key]})}>{label}</button>)}</div>
  <p className="small muted">Погоду впишите сами: приложение работает без интернета и прогноз не загружает.</p>
  <h3 className="idea-heading">Из гардероба · {thingCount(list.items.length)}{list.sets>0&&` · ${setCount(list.sets)}`}</h3>
  {list.items.length?<ul className="check-list">{list.items.map(i=><li key={i.id}><label className={trip.done.includes(i.id)?'done':''}><input type="checkbox" checked={trip.done.includes(i.id)} onChange={()=>toggle(i.id)}/><Thumb item={i} store={store} version={version}/><span>{i.name}<small>{categories[i.category]}</small></span></label></li>)}</ul>:<p className="small muted">Под такую поездку в гардеробе ничего не нашлось. Проверьте сезон у вещей.</p>}
  {list.notes.map(n=><p className="small muted" key={n}>{n}</p>)}
  <h3 className="idea-heading">Не забыть</h3>
  <ul className="check-list">{list.extras.map(e=><li key={e}><label className={trip.done.includes(e)?'done':''}><input type="checkbox" checked={trip.done.includes(e)} onChange={()=>toggle(e)}/><span>{e}</span></label></li>)}</ul>
  <p className="small muted" role="status">Уложено: {packed} из {total}</p>
  <CopyButton text={packingText(list,{...trip,days:Number.isFinite(trip.days)?trip.days:1,temperature:Number.isFinite(trip.temperature)?trip.temperature:15},trip.title)} label="Скопировать список"/>
  {trip.done.length>0&&<button className="link-button full" onClick={()=>set({done:[]})}>Снять все отметки</button>}
 </Modal>
}

// ---- Чего не хватает ----
function Missing({items,store,version,onClose}:{items:Item[];onClose:()=>void}&Shared){
 const list=useMemo(()=>missingPieces(items),[items]);
 return <Modal title="Чего не хватает" onClose={onClose}>
  <p className="small muted">Покупки, которые дадут больше всего новых комплектов с вашими вещами. Считается по назначению и сезону вещей, а не по цвету и фасону.</p>
  {list.length?<ol className="idea-list">{list.map(p=><li key={p.name}><h3>{p.name}</h3><p className="idea-gain">{p.kind==='outer'?`Закроет ${setCount(p.gain)}, к которым сейчас нет верхней одежды`:`+${setCount(p.gain)}`}</p>
   {p.pairs.length>0&&<div className="idea-row"><span className="small muted">Сочетается с:</span>{p.pairs.map(i=><Thumb key={i.id} item={i} store={store} version={version}/>)}</div>}
   <p className="small">Искать: <a href={`https://www.ozon.ru/search/?text=${encodeURIComponent(p.query)}`} target="_blank" rel="noopener noreferrer">Ozon</a> · <a href={`https://www.wildberries.ru/catalog/0/search.aspx?search=${encodeURIComponent(p.query)}`} target="_blank" rel="noopener noreferrer">Wildberries</a></p></li>)}</ol>
  :<p>{items.length<3?'Добавьте хотя бы несколько вещей — тогда станет видно, чего не хватает.':'Основа гардероба собрана: ни одна базовая вещь из списка не добавит новых комплектов.'}</p>}
 </Modal>
}

// ---- Разбор шкафа ----
function Review({items,saved,store,version,onClose,onOpenOutfit,onSell,onRemove}:{items:Item[];saved:Outfit[];onClose:()=>void;onOpenOutfit:(o:Outfit)=>void;onSell:(i:Item)=>void;onRemove:(i:Item)=>void}&Shared){
 const list=useMemo(()=>unwornItems(items,saved),[items,saved]);
 return <Modal title="Разбор шкафа" onClose={onClose}>
  <p className="small muted">{saved.length?`Вещи, которые не попали ни в один сохранённый образ: ${list.length} из ${items.length}.`:'Сохранённых образов пока нет, поэтому здесь все вещи. Сохраняйте образы — список станет короче и точнее.'}</p>
  {list.length?<ul className="idea-list">{list.map(u=><li key={u.item.id}><div className="idea-row"><Thumb item={u.item} store={store} version={version}/><div><h3>{u.item.name}</h3><p className="small">{u.sets?`Есть с чем носить: ${setCount(u.sets)}.`:'Сейчас носить не с чем — можно продать или отдать.'}</p></div></div>
   {u.partners.length>0&&<div className="idea-row"><span className="small muted">Например, с:</span>{u.partners.map(i=><Thumb key={i.id} item={i} store={store} version={version}/>)}</div>}
   <div className="idea-actions">{u.example&&<button className="button secondary" onClick={()=>onOpenOutfit(comboOutfit(u.example!,`С чем носить: ${u.item.name}`.slice(0,90)))}>С чем носить</button>}<button className="button secondary" onClick={()=>onSell(u.item)}>Продать</button><button className="button secondary" onClick={()=>onRemove(u.item)}>Отдать</button></div></li>)}</ul>
  :<p>Все вещи участвуют в сохранённых образах.</p>}
  <p className="small muted">«Отдать» убирает вещь из гардероба в приложении — перед этим будет вопрос.</p>
 </Modal>
}

// ---- Капсула на сезон ----
export const seasonNow=():Season=>{const m=new Date().getMonth();return m<2||m===11?'winter':m<5?'spring':m<8?'summer':'autumn'};
function CapsuleView({items,store,version,onClose,onOpenOutfit}:{items:Item[];onClose:()=>void;onOpenOutfit:(o:Outfit)=>void}&Shared){
 const [season,setSeason]=useState<Season>(seasonNow),[shown,setShown]=useState(12);
 const result=useMemo(()=>capsule(items,season),[items,season]);
 const title=`Капсула: ${seasons[season].toLocaleLowerCase('ru')}`;
 return <Modal title="Капсула на сезон" onClose={onClose}>
  <div className="occasion-chips" role="group" aria-label="Сезон капсулы">{(Object.keys(seasons) as (keyof typeof seasons)[]).filter((s):s is Season=>s!=='all').map(s=><button key={s} className={season===s?'chip active':'chip'} aria-pressed={season===s} onClick={()=>{setSeason(s);setShown(12)}}>{seasons[s]}</button>)}</div>
  {result.items.length?<>
   <h3 className="idea-heading">{thingCount(result.items.length)} · {setCount(result.combos.length)}</h3>
   <div className="capsule-grid">{result.items.map(i=><figure key={i.id}><Thumb item={i} store={store} version={version}/><figcaption>{i.name}</figcaption></figure>)}</div>
   {result.items.length<12&&<p className="small muted">На этот сезон подходящих вещей меньше двенадцати — капсула собрана из того, что есть.</p>}
   {result.combos.length>0&&<><h3 className="idea-heading">Все комплекты</h3>{result.outers.length>0&&<p className="small muted">Верхняя одежда из капсулы надевается поверх любого подходящего комплекта.</p>}
    <ul className="combo-list">{result.combos.slice(0,shown).map((c,n)=><li key={c.items.map(i=>i.id).join('|')}><button className="combo" aria-label={`Открыть комплект ${n+1}: ${c.items.map(i=>i.name).join(', ')}`} onClick={()=>onOpenOutfit(comboOutfit(c.items,title))}><span className="small muted">{n+1}</span>{c.items.map(i=><Thumb key={i.id} item={i} store={store} version={version}/>)}</button></li>)}</ul>
    {shown<result.combos.length&&<button className="button secondary full" onClick={()=>setShown(n=>n+24)}>Показать ещё ({result.combos.length-shown})</button>}
    <p className="small muted">Нажмите на комплект, чтобы открыть его как образ и сохранить.</p></>}
  </>:<p>На этот сезон в гардеробе нет вещей. Проверьте сезон в карточках вещей.</p>}
 </Modal>
}

// ---- Вкладка «Идеи» ----
type Tool='suitcase'|'missing'|'review'|'capsule';
const tools:[Tool,string,string][]=[['capsule','Капсула на сезон','12–15 вещей, которые сочетаются между собой, и все комплекты из них'],['missing','Чего не хватает','Какие 3–5 покупок дадут больше всего новых комплектов'],['review','Разбор шкафа','Вещи, которые не попали в образы: продать, отдать или с чем носить'],['suitcase','Сборщик чемодана','Список в поездку по дням, погоде и вашим вещам']];
export function Ideas({items,saved,store,version,onOpenOutfit,onSell,onRemove,onAdd}:{items:Item[];saved:Outfit[];onOpenOutfit:(o:Outfit)=>void;onSell:(i:Item)=>void;onRemove:(i:Item)=>void;onAdd:()=>void}&Shared){
 const [tool,setTool]=useState<Tool|null>(null),close=()=>setTool(null);
 const stats=useMemo(()=>{const buy=missingPieces(items).length,idle=unwornItems(items,saved).length;return{capsule:setCount(capsule(items,seasonNow()).combos.length),missing:buy?`${buy} ${buy===1?'покупка':buy<5?'покупки':'покупок'}`:'всё есть',review:idle?thingCount(idle):'',suitcase:''} as Record<Tool,string>},[items,saved]);
 // A removed item must not linger in an open list.
 if(!items.length)return <><div className="page-actions"><h1>Идеи</h1></div><div className="empty-state"><p>Здесь появятся капсула, разбор шкафа и список в поездку — когда в гардеробе будут вещи.</p><button className="button primary" onClick={onAdd}>Добавить вещь</button></div></>;
 return <><div className="page-actions"><h1>Идеи</h1></div>
  <div className="tool-list">{tools.map(([id,title,text])=><button key={id} className="tool-card" onClick={()=>setTool(id)}><span className="tool-text"><strong>{title}</strong><span>{text}</span></span>{stats[id]&&<b className="tool-stat">{stats[id]}</b>}</button>)}</div>
  <p className="small muted">Продать ненужную вещь: откройте её карточку в гардеробе и нажмите «Объявление для продажи».</p>
  {tool==='suitcase'&&<Suitcase items={items} store={store} version={version} onClose={close}/>}
  {tool==='missing'&&<Missing items={items} store={store} version={version} onClose={close}/>}
  {tool==='review'&&<Review items={items} saved={saved} store={store} version={version} onClose={close} onOpenOutfit={onOpenOutfit} onSell={onSell} onRemove={onRemove}/>}
  {tool==='capsule'&&<CapsuleView items={items} store={store} version={version} onClose={close} onOpenOutfit={onOpenOutfit}/>}
 </>;
}
