import {useMemo,useState} from 'react';
import {defaultConditions,type Conditions,type Item,type Outfit} from '../domain';import type {ClosetStore} from '../storage';
import {generateOutfits} from '../outfits';import {capsule,type Season} from '../insights';import {thingCount} from '../presentation';
import {FlatLay} from './FlatLay';import {useInstallState} from './InstallHelp';import {isPhone} from '../install';import {seasonNow,setCount} from './Ideas';
const seasonFor:Record<Season,string>={winter:'зиму',spring:'весну',summer:'лето',autumn:'осень'};
export const greeting=(hour:number)=>hour<5?'Доброй ночи':hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер';
const degrees=(t:number)=>`${t>0?'+':''}${t}°`;
// First screen: one outfit for today from the owner's own things, by the same rules as «Образы».
export function Today({items,store,version,conditions,onTemperature,onOpen,onSave,onIdeas,onAdd,onInstall}:{onInstall:()=>void;items:Item[];store:ClosetStore;version:number;conditions:Conditions;onTemperature:(t:number)=>void;onOpen:(o:Outfit)=>void;onSave:(o:Outfit)=>Promise<void>;onIdeas:()=>void;onAdd:()=>void}){
 const now=new Date(),temperature=Number.isFinite(conditions.temperature)?conditions.temperature:defaultConditions.temperature;
 const [shift,setShift]=useState(0),[editing,setEditing]=useState(false),[saved,setSaved]=useState(''),[busy,setBusy]=useState(false);
 const looks=useMemo(()=>generateOutfits(items,{...defaultConditions,temperature},12).outfits,[items,temperature]);
 // A different starting outfit each day, the same one all day.
 const day=Math.floor((now.getTime()-now.getTimezoneOffset()*60000)/86400000),look=looks.length?looks[(day+shift)%looks.length]:undefined;
 const picked=look?look.itemIds.map(id=>items.find(i=>i.id===id)).filter((i):i is Item=>!!i):[];
 const season=seasonNow(),set=useMemo(()=>capsule(items,season),[items,season]);
 const install=useInstallState(),[hintHidden,setHintHidden]=useState(()=>{try{return localStorage.getItem('wardrobe-install-hint')==='hidden'}catch{return false}});
 const hideHint=()=>{setHintHidden(true);try{localStorage.setItem('wardrobe-install-hint','hidden')}catch{}};
 const date=now.toLocaleDateString('ru-RU',{weekday:'long',day:'numeric',month:'long'});
 async function wear(){if(!look||busy)return;setBusy(true);try{await onSave({...look,title:`${now.toLocaleDateString('ru-RU',{day:'numeric',month:'long'})}, ${degrees(temperature)}`});setSaved(look.id)}catch{/* App shows the storage error. */}finally{setBusy(false)}}
 return <section className="today">
  {!install.installed&&isPhone(install.device)&&!hintHidden&&<div className="install-hint"><button className="install-hint-open" onClick={onInstall}><b>Поставьте на экран телефона</b><span>Без магазина приложений, за минуту</span></button><button className="icon-button" aria-label="Скрыть подсказку об установке" onClick={hideHint}>×</button></div>}
  <p className="caps">{date}</p><h1 className="today-hello">{greeting(now.getHours())}</h1>
  <div className="today-weather">{editing?<><label htmlFor="today-temperature">На улице, °C</label><input id="today-temperature" type="number" inputMode="decimal" min={-40} max={45} defaultValue={temperature} onChange={e=>{const v=Number(e.target.value);if(e.target.value!==''&&Number.isFinite(v))onTemperature(Math.min(45,Math.max(-40,v)))}}/><button className="link-button" onClick={()=>setEditing(false)}>Готово</button></>:<><span>На улице {degrees(temperature)}{temperature<16?' · нужен верхний слой':''}</span><button className="link-button" onClick={()=>setEditing(true)}>Изменить</button></>}</div>
  {!items.length?<div className="empty-state"><p>Добавьте первые вещи — и здесь каждый день будет готовый образ.</p><button className="button primary" onClick={onAdd}>Добавить вещь</button></div>
  :!look||!picked.length?<div className="empty-state"><p>Пока не из чего собрать образ. Укажите категории вещей в гардеробе.</p></div>
  :<div className="today-look">
   <button className="today-hero" aria-label="Открыть образ дня" onClick={()=>onOpen(look)}><span className="today-tag">Образ дня</span><FlatLay items={picked} store={store} version={version}/></button>
   {look.explanation&&<p className="small muted">{look.explanation}</p>}
   <div className="today-actions"><button className="button primary" disabled={busy||saved===look.id} onClick={()=>void wear()}>{saved===look.id?'Сохранён в образах':'Надену это'}</button><button className="button secondary" disabled={looks.length<2} onClick={()=>setShift(n=>n+1)}>Другой</button></div>
  </div>}
  {set.combos.length>0&&<button className="today-promo" onClick={onIdeas}><span><span className="caps">Капсула на {seasonFor[season]}</span><small>{thingCount(set.items.length)} уже подобраны</small></span><b>{setCount(set.combos.length)}</b></button>}
 </section>;
}
