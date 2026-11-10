import {outfitTitle,thingCount} from './presentation';
import {defaultConditions,newId,type Item,type Conditions,type Outfit,type SelectionResult} from './domain';
import {normalizedCategory,effectiveCategory} from './item-category';
const cold=(c:Conditions)=>c.useWeather!==false&&(c.temperature<16||c.rain||c.wind==='strong');
export function outfitAdvice(input:Item[],c:Conditions,wardrobe:Item[]=input):string{
 const items=input.map(normalizedCategory);
 const has=(category:Item['category'])=>items.some(i=>i.category===category),missing:string[]=[];
 if(!has('dress')){if(!has('top'))missing.push('верх');if(!has('bottom'))missing.push('низ')}
 if(!has('shoes'))missing.push('обувь');
 if(cold(c)&&!has('outer')&&!wardrobe.some(i=>effectiveCategory(i)==='outer'))missing.push('пальто');
 if(missing.length)return `${c.useWeather!==false?`Для ${c.temperature>0?'+':''}${c.temperature}° лучше добавить`:'Можно добавить'} ${missing.join(', ')}.`;
 if(cold(c)&&!has('outer')&&wardrobe.some(i=>effectiveCategory(i)==='outer'))return `Для ${c.temperature>0?'+':''}${c.temperature}° добавьте верхнюю одежду из гардероба.`;
 if((c.noHeels||c.walking||/без\s+каблук|много\s+ходить/i.test(c.wishes))&&items.some(i=>i.category==='shoes'&&i.heel==='yes'))return 'Для прогулки лучше заменить обувь на пару без каблука.';
 if((c.noHeels||c.walking||/без\s+каблук|много\s+ходить/i.test(c.wishes))&&items.some(i=>i.category==='shoes'&&i.heel==='unknown'))return 'У этой обуви не указан каблук. Проверьте, подходит ли она для прогулки.';
 if(items.some(i=>i.category==='unknown'))return 'Уточните категории вещей — следующие сочетания будут точнее.';
 if(c.wishes.trim()&&!/^(без\s+каблук\S*|буду много ходить|много ходить)[.! ]*$/i.test(c.wishes.trim()))return 'Детали пожелания можно уточнить, заменив вещи вручную.';
 return '';
}
export function bestOutfits(input:Item[],raw:Conditions,limit=3):SelectionResult{
 const own=input.filter(i=>!i.demo).map(normalizedCategory),ignoredItemIds=own.filter(i=>i.category==='unknown').map(i=>i.id);
 const result:SelectionResult={outfits:[],warnings:ignoredItemIds.length?[`Не учтено: ${thingCount(ignoredItemIds.length)}`]:[],missing:[],ignoredItemIds};const items=own.filter(i=>i.category!=='unknown');if(!items.length){if(ignoredItemIds.length)result.missing.push('Укажите категорию хотя бы одной вещи.');return result}
 const c:Conditions={...defaultConditions,...raw,temperature:Number.isFinite(raw.temperature)?Math.min(45,Math.max(-40,raw.temperature)):8};
 if(c.useWeather===false&&!c.occasion.trim()&&!c.styleTag)c.occasion='Образ';
 const target=c.styleTag||(/театр|вечер|ресторан|свадьб/i.test(c.occasion)?'smart':/работ|делов|офис/i.test(c.occasion)?'business':/спорт/i.test(c.occasion)?'sport':/прогул|повседнев|магазин/i.test(c.occasion)?'casual':'');
 const noHeels=c.noHeels||c.walking||/без\s+каблук|много\s+ходить/i.test(c.wishes);
 const heelTier=(i:Item)=>i.heel==='no'?0:i.heel==='unknown'?1:2;
 const preferredHeelTier=Math.min(...items.filter(i=>i.category==='shoes').map(heelTier));
 const score=(i:Item)=>{
  let n=0;if(target&&i.styles?.length)n+=i.styles.includes(target)?12:-8;
  if(i.category==='shoes'&&noHeels)n+=i.heel==='yes'?-100:i.heel==='no'?10:0;
  if(c.useWeather!==false){const season=c.temperature<5?'winter':c.temperature>23?'summer':c.temperature<15?'autumn':'spring';if(!i.season.includes('all'))n+=i.season.includes(season)?4:-4;n+=cold(c)&&i.warmth==='warm'?3:0;if(c.rain&&i.rain==='yes')n+=3}
  if(/бел|ч[её]рн|сер|беж|син|корич/i.test(i.color))n++;return n;
 };
 const pool=(cat:Item['category'])=>{let all=items.filter(i=>i.category===cat);if(cat==='shoes'&&noHeels){const flat=all.filter(i=>i.heel==='no'),unknown=all.filter(i=>i.heel==='unknown');all=flat.length?flat:unknown.length?unknown:all}const clean=all.filter(i=>!i.backgroundFailed);return (clean.length?clean:all).sort((a,b)=>score(b)-score(a)).slice(0,3)};
 const tops=pool('top'),bottoms=pool('bottom'),dresses=pool('dress'),shoes=pool('shoes'),outers=pool('outer');
 const bases:Item[][]=[];for(const top of tops.length?tops:[undefined])for(const bottom of bottoms.length?bottoms:[undefined]){const b=[top,bottom].filter((v):v is Item=>!!v);if(b.length)bases.push(b)}for(const dress of dresses)bases.push([dress]);if(!bases.length)bases.push([]);
 const candidates:{picked:Item[];score:number}[]=[];
 for(const base of bases)for(const shoe of shoes.length?shoes:[undefined])for(const outer of cold(c)&&outers.length?outers:[undefined]){
  let picked=[...base,...shoe?[shoe]:[],...outer?[outer]:[]];const requested=items.find(i=>i.id===c.pinnedId),pinned=requested?.category==='shoes'&&noHeels&&heelTier(requested)>preferredHeelTier?undefined:requested;
  if(pinned&&!picked.some(i=>i.id===pinned.id)){picked=picked.filter(i=>i.category!==pinned.category&&!(pinned.category==='dress'&&['top','bottom'].includes(i.category))&&!(['top','bottom'].includes(pinned.category)&&i.category==='dress'));picked.push(pinned)}
  if(pinned?.category==='top'&&!picked.some(i=>i.category==='bottom')&&bottoms.length)picked.push(bottoms[0]);
  if(pinned?.category==='bottom'&&!picked.some(i=>i.category==='top')&&tops.length)picked.push(tops[0]);
  if(!picked.length)picked=[items.slice().sort((a,b)=>score(b)-score(a))[0]];
  const order:Item['category'][]=['top','bottom','dress','shoes','outer','accessory'];picked.sort((a,b)=>order.indexOf(a.category)-order.indexOf(b.category));
  const complete=picked.some(i=>i.category==='dress')?2:Number(picked.some(i=>i.category==='top'))+Number(picked.some(i=>i.category==='bottom'));
  const main=picked.filter(i=>['top','bottom','dress'].includes(i.category)),layers=picked.filter(i=>!main.includes(i)),baseScore=main.length?main.reduce((n,i)=>n+score(i),0)/main.length:0,occasionPreference=target==='smart'&&main.some(i=>i.category==='dress')?6:target==='business'&&main.some(i=>i.category==='top')&&main.some(i=>i.category==='bottom')?6:0;
  candidates.push({picked,score:complete*200+Number(picked.some(i=>i.category==='shoes'))*200+baseScore+layers.reduce((n,i)=>n+score(i),0)+occasionPreference});
 }
 const used=new Set<string>();for(const {picked}of candidates.sort((a,b)=>b.score-a.score)){const signature=picked.map(i=>i.id).sort().join('|');if(used.has(signature))continue;used.add(signature);const outfit:Outfit={id:newId(),title:outfitTitle(c),itemIds:picked.map(i=>i.id),itemSnapshots:picked,conditions:c,mode:'rules',createdAt:new Date().toISOString(),explanation:outfitAdvice(picked,c)};result.outfits.push(outfit);if(result.outfits.length>=Math.min(250,Math.max(1,limit)))break}
 return result;
}
