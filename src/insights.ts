// Wardrobe tools built on item descriptions only (category, season, purpose, heel, colour).
// Nothing here looks at the photos or calls a server, and none of it is an AI stylist:
// "goes with" means "same purpose and season", not colour or silhouette harmony.
import {defaultConditions,newId,categories,seasons,type Item,type Outfit,type ClothingStyle,type Category} from './domain';
import {normalizedCategory} from './item-category';
export type Season=Exclude<keyof typeof seasons,'all'>;
export interface Combo{items:Item[]}
const order:Category[]=['top','bottom','dress','shoes','outer','accessory','unknown'];
const byOrder=(a:Item,b:Item)=>order.indexOf(a.category)-order.indexOf(b.category);
const wearable=(items:Item[])=>items.filter(i=>!i.demo).map(normalizedCategory).filter(i=>i.category!=='unknown');
const neutral=(i:Item)=>/бел|ч[её]рн|сер|беж|син|корич|молоч/i.test(i.color);
export function goesWith(a:Item,b:Item):boolean{
 const sa=a.styles??[],sb=b.styles??[];
 return(!sa.length||!sb.length||sa.some(s=>sb.includes(s)))&&(a.season.includes('all')||b.season.includes('all')||a.season.some(s=>b.season.includes(s)));
}
function bases(items:Item[]):Item[][]{
 const out:Item[][]=[];
 for(const top of items)if(top.category==='top')for(const bottom of items)if(bottom.category==='bottom'&&goesWith(top,bottom))out.push([top,bottom]);
 for(const dress of items)if(dress.category==='dress')out.push([dress]);
 return out;
}
// Every "top + bottom" or dress, with each pair of shoes that suits it. Without any shoes the clothes alone count.
export function combos(input:Item[]):Combo[]{
 const items=wearable(input),shoes=items.filter(i=>i.category==='shoes'),out:Combo[]=[];
 for(const base of bases(items)){if(!shoes.length)out.push({items:base});else for(const shoe of shoes)if(base.every(i=>goesWith(i,shoe)))out.push({items:[...base,shoe]})}
 return out;
}
const complete=(items:Item[])=>items.some(i=>i.category==='shoes')?combos(items):[];
export function comboOutfit(items:Item[],title:string):Outfit{
 const picked=[...items].sort(byOrder);
 return{id:newId(),title,itemIds:picked.map(i=>i.id),itemSnapshots:picked,conditions:{...defaultConditions,useWeather:false,occasion:title},mode:'rules',createdAt:new Date().toISOString(),explanation:''};
}

// ---- Чего не хватает ----
export interface Purchase{name:string;category:Category;gain:number;kind:'sets'|'outer';pairs:Item[];query:string}
interface Idea{name:string;category:Category;color:string;styles:ClothingStyle[];season:Item['season'];heel?:Item['heel'];have:RegExp}
const ideas:Idea[]=[
 {name:'Белая рубашка',category:'top',color:'Белый',styles:['business','smart','casual'],season:['all'],have:/рубашк|блуз/},
 {name:'Белая футболка',category:'top',color:'Белый',styles:['casual','sport'],season:['all'],have:/футболк|майк|лонгслив/},
 {name:'Базовый джемпер',category:'top',color:'Бежевый',styles:['casual','business'],season:['autumn','winter','spring'],have:/джемпер|свитер|водолазк|кардиган|свитшот|худи/},
 {name:'Нарядный топ',category:'top',color:'Чёрный',styles:['smart'],season:['all'],have:/топ|блуз/},
 {name:'Синие джинсы',category:'bottom',color:'Синий',styles:['casual'],season:['all'],have:/джинс/},
 {name:'Чёрные брюки',category:'bottom',color:'Чёрный',styles:['business','smart','casual'],season:['all'],have:/брюк/},
 {name:'Юбка миди',category:'bottom',color:'Чёрный',styles:['smart','business','casual'],season:['all'],have:/юбк/},
 {name:'Спортивные брюки',category:'bottom',color:'Серый',styles:['sport'],season:['all'],have:/спортивн|леггинс|джоггер|лосин/},
 {name:'Маленькое чёрное платье',category:'dress',color:'Чёрный',styles:['smart'],season:['all'],have:/плать|сарафан/},
 {name:'Платье на каждый день',category:'dress',color:'Бежевый',styles:['casual'],season:['all'],have:/плать|сарафан/},
 {name:'Белые кеды',category:'shoes',color:'Белый',styles:['casual','sport'],season:['spring','summer','autumn'],heel:'no',have:/кед|кроссовк/},
 {name:'Лоферы',category:'shoes',color:'Чёрный',styles:['business','casual'],season:['spring','summer','autumn'],heel:'no',have:/лофер|балетк|мокасин/},
 {name:'Туфли-лодочки',category:'shoes',color:'Чёрный',styles:['smart','business'],season:['all'],heel:'yes',have:/туфл|босонож/},
 {name:'Ботинки на холодную погоду',category:'shoes',color:'Чёрный',styles:['casual','business'],season:['autumn','winter'],heel:'no',have:/ботинк|сапог|ботильон/},
 {name:'Пиджак',category:'outer',color:'Чёрный',styles:['business','smart','casual'],season:['spring','summer','autumn'],have:/пиджак|жакет|блейзер/},
 {name:'Тренч',category:'outer',color:'Бежевый',styles:['casual','business','smart'],season:['spring','autumn'],have:/тренч|плащ/},
 {name:'Тёплая куртка',category:'outer',color:'Чёрный',styles:['casual','sport'],season:['winter','autumn'],have:/пуховик|куртк|парк/},
 {name:'Пальто',category:'outer',color:'Бежевый',styles:['business','smart','casual'],season:['autumn','winter','spring'],have:/пальто/},
];
const asItem=(idea:Idea):Item=>({id:'idea:'+idea.name,name:idea.name,category:idea.category,color:idea.color,season:idea.season,warmth:'medium',rain:'unknown',wind:'unknown',heel:idea.heel??'unknown',demo:false,createdAt:'',styles:idea.styles});
const uncovered=(sets:Combo[],outers:Item[])=>sets.filter(c=>!outers.some(o=>c.items.every(i=>goesWith(i,o))));
// Which few purchases unlock the most new complete sets (clothes + shoes) from what is already owned.
export function missingPieces(input:Item[],max=5):Purchase[]{
 const items=wearable(input),now=complete(items),outers=items.filter(i=>i.category==='outer'),bare=uncovered(now,outers),out:Purchase[]=[];
 for(const idea of ideas){
  // Already owned: same kind of thing for at least one of the same purposes.
  if(items.some(i=>i.category===idea.category&&idea.have.test(`${i.name} ${i.subcategory??''}`.toLocaleLowerCase('ru'))&&(!i.styles?.length||i.styles.some(s=>idea.styles.includes(s)))))continue;
  const virtual=asItem(idea);let fresh:Combo[],kind:Purchase['kind']='sets';
  if(idea.category==='outer'){fresh=bare.filter(c=>c.items.every(i=>goesWith(i,virtual)));kind='outer'}
  else fresh=complete([...items,virtual]).filter(c=>c.items.some(i=>i.id===virtual.id));
  const gain=idea.category==='outer'?fresh.length:fresh.length+complete([...items,virtual]).length-fresh.length-now.length;
  if(gain<=0)continue;
  const seen=new Map<string,{item:Item;n:number}>();for(const c of fresh)for(const i of c.items)if(i.id!==virtual.id){const v=seen.get(i.id)??{item:i,n:0};v.n++;seen.set(i.id,v)}
  // Show partners of different kinds (a bottom and shoes), not four pairs of shoes.
  const ranked=[...seen.values()].sort((a,b)=>b.n-a.n).map(v=>v.item),varied=ranked.filter((v,k)=>ranked.findIndex(o=>o.category===v.category)===k);
  out.push({name:idea.name,category:idea.category,gain,kind,pairs:[...varied,...ranked.filter(v=>!varied.includes(v))].slice(0,4),query:idea.name.toLocaleLowerCase('ru')+' женские'});
 }
 // One suggestion per category first, so the list is not five kinds of tops.
 out.sort((a,b)=>Number(a.kind==='outer')-Number(b.kind==='outer')||b.gain-a.gain);
 const first:Purchase[]=[],rest:Purchase[]=[];for(const p of out)(first.some(f=>f.category===p.category)?rest:first).push(p);
 return[...first,...rest].slice(0,Math.max(1,max)).sort((a,b)=>Number(a.kind==='outer')-Number(b.kind==='outer')||b.gain-a.gain);
}

// ---- Разбор шкафа ----
export interface Unworn{item:Item;sets:number;partners:Item[];example?:Item[]}
// Items that are in no saved outfit, with what they could be worn with.
export function unwornItems(input:Item[],outfits:Pick<Outfit,'itemIds'>[]):Unworn[]{
 const items=wearable(input),used=new Set(outfits.flatMap(o=>o.itemIds)),all=combos(items);
 return items.filter(i=>!used.has(i.id)).map(item=>{
  const core=['top','bottom','dress','shoes'].includes(item.category),mine=core?all.filter(c=>c.items.some(i=>i.id===item.id)):all.filter(c=>c.items.every(i=>goesWith(i,item)));
  const seen=new Map<string,{item:Item;n:number}>();for(const c of mine)for(const i of c.items)if(i.id!==item.id){const v=seen.get(i.id)??{item:i,n:0};v.n++;seen.set(i.id,v)}
  const partners:Item[]=[];for(const v of[...seen.values()].sort((a,b)=>b.n-a.n))if(!partners.some(p=>p.category===v.item.category))partners.push(v.item);
  return{item,sets:mine.length,partners:partners.sort(byOrder).slice(0,3),example:mine[0]?[...mine[0].items,...core?[]:[item]]:undefined};
 }).sort((a,b)=>a.sets-b.sets||byOrder(a.item,b.item));
}

// ---- Капсула и чемодан: общий отбор ----
type Caps=Partial<Record<Category,number>>;
function value(items:Item[]):number{
 const b=bases(items),shoes=items.filter(i=>i.category==='shoes'),outers=items.filter(i=>i.category==='outer'),extras=items.filter(i=>i.category==='accessory');
 let n=b.length;for(const base of b){n+=3*shoes.filter(s=>base.every(i=>goesWith(i,s))).length;n+=.6*outers.filter(o=>base.every(i=>goesWith(i,o))).length;n+=.2*extras.filter(o=>base.every(i=>goesWith(i,o))).length}
 return n;
}
// Greedy: each step adds the item that opens the most new sets with those already chosen.
function pick(pool:Item[],caps:Caps,size:number,prefer:(i:Item)=>number=()=>0):Item[]{
 const chosen:Item[]=[],seed:Category[]=['bottom','top','shoes','dress','outer','accessory'];
 while(chosen.length<size){
  const current=value(chosen);let best:Item|undefined,bestScore=-Infinity;
  for(const c of pool){
   if(chosen.includes(c)||chosen.filter(i=>i.category===c.category).length>=(caps[c.category]??0))continue;
   const empty=!chosen.some(i=>i.category===c.category);
   const score=(value([...chosen,c])-current)*10+chosen.filter(i=>goesWith(i,c)).length+(neutral(c)?1.5:0)+prefer(c)+(empty?30-seed.indexOf(c.category):0);
   if(score>bestScore){best=c;bestScore=score}
  }
  if(!best)break;chosen.push(best);
 }
 return chosen.sort(byOrder);
}
export interface Capsule{items:Item[];combos:Combo[];outers:Item[]}
const inSeason=(i:Item,season:Season)=>i.season.includes('all')||i.season.includes(season);
// 12–15 mutually combinable items for one season, and every set they make.
export function capsule(input:Item[],season:Season,size=15):Capsule{
 const pool=wearable(input).filter(i=>inSeason(i,season)&&!(season==='summer'&&i.warmth==='warm')&&!(season==='winter'&&i.warmth==='light'&&i.category==='shoes'));
 const caps:Caps=season==='summer'?{top:6,bottom:3,dress:3,shoes:3,accessory:2}:{top:5,bottom:3,dress:2,shoes:3,outer:2,accessory:2};
 const prefer=(i:Item)=>(i.season.includes(season)?2:0)+(season==='winter'&&i.warmth==='warm'?1:0);
 const items=pick(pool,caps,Math.max(1,size),prefer);
 return{items,combos:combos(items),outers:items.filter(i=>i.category==='outer')};
}

// ---- Сборщик чемодана ----
export interface Trip{days:number;temperature:number;rain:boolean;plans:ClothingStyle[]}
export interface Packing{items:Item[];extras:string[];notes:string[];sets:number;season:Season}
export const tripSeason=(t:number):Season=>t<5?'winter':t>23?'summer':t<15?'autumn':'spring';
export function packingList(input:Item[],trip:Trip):Packing{
 const days=Math.min(30,Math.max(1,Math.round(trip.days)||1)),t=Number.isFinite(trip.temperature)?trip.temperature:15,season=tripSeason(t),plans=trip.plans,cold=t<16||trip.rain;
 const seasonal=wearable(input).filter(i=>inSeason(i,season)&&!(t>23&&i.warmth==='warm'));
 const fits=(i:Item)=>!plans.length||!i.styles?.length||i.styles.some(s=>plans.includes(s));
 // Keep to the plans, but never drop a whole category because of them.
 const pool=seasonal.filter(i=>fits(i)||!seasonal.some(o=>o.category===i.category&&fits(o)));
 const dressy=plans.includes('smart'),caps:Caps={top:Math.min(6,Math.ceil(days/2)+(days>2?1:0)),bottom:Math.min(3,Math.ceil(days/4)+(days>2?1:0)),dress:dressy||days>=5?1:0,shoes:Math.min(3,1+Number(days>=4||plans.length>1)+Number(plans.includes('sport')&&plans.length>2)),outer:cold?1:0,accessory:Math.min(2,Math.ceil(days/3))};
 const walking=(i:Item)=>i.category==='shoes'?(i.heel==='no'?3:i.heel==='yes'?-2:0):0;
 const prefer=(i:Item)=>(i.season.includes(season)?2:0)+walking(i)+(trip.rain&&i.rain==='yes'?2:0)+(t<5&&i.warmth==='warm'?2:0)+(plans.length&&i.styles?.some(s=>plans.includes(s))?2:0);
 const items=pick(pool,caps,Object.values(caps).reduce((a,b)=>a+(b??0),0),prefer);
 const notes:string[]=[];for(const cat of['top','bottom','shoes','outer'] as const)if((caps[cat]??0)>0&&!items.some(i=>i.category===cat)&&!(cat!=='shoes'&&cat!=='outer'&&items.some(i=>i.category==='dress')))notes.push(`В гардеробе нет подходящих вещей: ${categories[cat].toLocaleLowerCase('ru')}.`);
 if(plans.includes('sport')&&!items.some(i=>i.styles?.includes('sport')))notes.push('Для спорта подходящих вещей в гардеробе не нашлось.');
 if(items.some(i=>i.category==='shoes')&&!items.some(i=>i.category==='shoes'&&i.heel==='no'))notes.push('Среди обуви нет пары без каблука — для долгих прогулок проверьте, удобно ли.');
 const extras=[`Бельё — ${days} ${days===1?'комплект':days<5?'комплекта':'комплектов'}`,`Носки или колготки — ${days} ${days===1?'пара':days<5?'пары':'пар'}`,'Одежда для сна','Косметичка и зубная щётка','Зарядка для телефона','Документы, деньги, карты','Лекарства, которые принимаете'];
 if(trip.rain)extras.push('Зонт');if(t<5)extras.push('Шапка, шарф, перчатки');if(t>23)extras.push('Купальник','Солнцезащитный крем','Очки от солнца','Головной убор от солнца');
 return{items,extras,notes,sets:combos(items).length,season};
}
export function packingText(p:Packing,trip:Trip,title=''):string{
 const lines=[`${title.trim()||'Поездка'}: ${trip.days} дн., ${trip.temperature>0?'+':''}${trip.temperature}°${trip.rain?', дождь':''}`,''];
 for(const cat of order){const group=p.items.filter(i=>i.category===cat);if(group.length){lines.push(categories[cat]+':');for(const i of group)lines.push('— '+i.name)}}
 lines.push('','Ещё:');for(const e of p.extras)lines.push('— '+e);return lines.join('\n');
}

// ---- Объявление за минуту ----
export const conditionsForSale=['Новое с биркой','Новое без бирки','Отличное','Хорошее','Есть следы носки'] as const;
export interface SaleDetails{size:string;condition:string;brand:string;price:string;note:string}
export function saleAd(item:Item,d:SaleDetails):{title:string;text:string}{
 const clean=(s:string)=>s.trim().replace(/\s+/g,' '),brand=clean(d.brand),size=clean(d.size),price=clean(d.price).replace(/[^\d]/g,''),note=clean(d.note),name=clean(item.name)||'Вещь';
 const known=item.color&&item.color!=='Не определён',colour=known?item.color.toLocaleLowerCase('ru'):'';
 let title=[name,brand].filter(Boolean).join(' ');if(size)title+=`, размер ${size}`;if(title.length>50)title=[name,brand].filter(Boolean).join(' ').slice(0,50);
 const lines=[`${[name,brand].filter(Boolean).join(' ')}${colour&&!name.toLocaleLowerCase('ru').includes(colour.slice(0,4))?`, цвет ${colour}`:''}.`,''];
 if(size)lines.push(`Размер: ${size}.`);
 lines.push(`Состояние: ${(d.condition||conditionsForSale[2]).toLocaleLowerCase('ru')}.`);
 if(known)lines.push(`Цвет: ${colour}.`);
 const itemSeasons=item.season.filter(s=>s!=='all');if(itemSeasons.length)lines.push(`Сезон: ${itemSeasons.map(s=>seasons[s].toLocaleLowerCase('ru')).join(', ')}.`);
 if(item.category==='shoes'&&item.heel!=='unknown')lines.push(item.heel==='yes'?'На каблуке.':'Без каблука.');
 const uses:Record<ClothingStyle,string>={casual:'на каждый день',business:'для работы',smart:'на выход',sport:'для спорта'};
 if(item.styles?.length)lines.push(`Подойдёт ${item.styles.map(s=>uses[s]).join(', ')}.`);
 if(note)lines.push(note.endsWith('.')?note:note+'.');
 lines.push('','Продаю, потому что не ношу. Отвечу на вопросы и пришлю дополнительные фото.');
 if(price)lines.push(`Цена: ${Number(price).toLocaleString('ru-RU')} ₽.`);
 return{title,text:lines.join('\n')};
}
