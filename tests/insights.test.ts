import {test} from 'node:test';import assert from 'node:assert/strict';import type {Item} from '../src/domain';
import {capsule,combos,goesWith,missingPieces,packingList,packingText,saleAd,unwornItems} from '../src/insights';
let n=0;const item=(name:string,category:Item['category'],extra:Partial<Item>={}):Item=>({id:'i'+(++n),name,category,color:'Чёрный',season:['all'],warmth:'medium',rain:'unknown',wind:'unknown',heel:'unknown',demo:false,createdAt:'2026-01-01T00:00:00.000Z',styles:[],...extra});
const closet=()=>[item('Белая рубашка','top',{styles:['business','casual']}),item('Свитер','top',{styles:['casual'],season:['autumn','winter']}),item('Синие джинсы','bottom',{styles:['casual']}),item('Чёрные брюки','bottom',{styles:['business']}),item('Платье','dress',{styles:['smart']}),item('Кеды','shoes',{styles:['casual'],heel:'no'}),item('Туфли','shoes',{styles:['smart','business'],heel:'yes'}),item('Пальто','outer',{styles:['business','casual'],season:['autumn','winter']})];
test('sets pair only things with a shared purpose and season',()=>{
 const items=closet(),names=combos(items).map(c=>c.items.map(i=>i.name).join('+'));
 assert.ok(names.includes('Белая рубашка+Синие джинсы+Кеды'));assert.ok(names.includes('Белая рубашка+Чёрные брюки+Туфли'));assert.ok(names.includes('Платье+Туфли'));
 assert.ok(!names.includes('Платье+Кеды'));assert.ok(!names.includes('Свитер+Чёрные брюки+Туфли'));
 assert.equal(goesWith(item('Сандалии','shoes',{season:['summer']}),items[1]),false);
 assert.equal(combos([items[0],items[2]]).length,1,'without shoes the clothes alone still make a set');
});
test('missing pieces are ranked by new complete sets and skip what is owned',()=>{
 const items=closet(),before=combos(items).length,list=missingPieces(items);
 assert.ok(list.length>0&&list.length<=5);assert.ok(list.every(p=>p.gain>0));assert.ok(!list.some(p=>p.name==='Синие джинсы'||p.name==='Белая рубашка'||p.name==='Пальто'));
 const skirt=list.find(p=>p.name==='Юбка миди');assert.ok(skirt);
 const withSkirt=[...items,item('Юбка миди','bottom',{styles:['smart','business','casual']})];assert.equal(combos(withSkirt).length-before,skirt.gain);assert.ok(skirt.pairs.every(i=>items.includes(i)));
 const noShoes=missingPieces(items.filter(i=>i.category!=='shoes'));assert.ok(noShoes.length>0&&noShoes.every(p=>p.category==='shoes'||p.kind==='outer'),'without shoes only shoes complete a set');
 assert.deepEqual(missingPieces([]),[]);
});
test('wardrobe review lists only items outside saved outfits, with partners',()=>{
 const items=closet(),[shirt,,jeans,,dress,sneakers,,coat]=items,list=unwornItems(items,[{itemIds:[shirt.id,jeans.id,sneakers.id]}]);
 assert.ok(!list.some(u=>[shirt.id,jeans.id,sneakers.id].includes(u.item.id)));assert.equal(list.length,5);
 const d=list.find(u=>u.item.id===dress.id)!;assert.equal(d.sets,1);assert.deepEqual(d.partners.map(i=>i.name),['Туфли']);assert.deepEqual(d.example?.map(i=>i.name),['Платье','Туфли']);
 const c=list.find(u=>u.item.id===coat.id)!;assert.ok(c.sets>0);assert.ok(c.example?.includes(coat));
 const lonely=item('Спортивный топ','top',{styles:['sport']}),alone=unwornItems([...items,lonely],[]).find(u=>u.item.id===lonely.id)!;assert.equal(alone.sets,0);assert.equal(alone.example,undefined);assert.equal(unwornItems([...items,lonely],[])[0].item.id,lonely.id,'things with nothing to wear them with come first');
});
test('a season capsule stays within 15 items that all take part in the season',()=>{
 const many=[...closet(),...Array.from({length:8},(_,k)=>item('Топ '+k,'top',{styles:['casual']})),...Array.from({length:6},(_,k)=>item('Юбка '+k,'bottom',{styles:['casual']})),item('Сандалии','shoes',{season:['summer'],heel:'no'}),item('Шуба','outer',{season:['winter'],warmth:'warm'})];
 const summer=capsule(many,'summer');assert.ok(summer.items.length>=12&&summer.items.length<=15);assert.ok(!summer.items.some(i=>i.category==='outer'||i.name==='Свитер'||i.name==='Шуба'));assert.ok(summer.items.some(i=>i.name==='Сандалии'));
 assert.ok(summer.combos.length>10);assert.ok(summer.combos.every(c=>c.items.every(i=>summer.items.includes(i))));
 const winter=capsule(many,'winter');assert.ok(winter.outers.length>=1&&winter.outers.length<=2);assert.ok(!winter.items.some(i=>i.name==='Сандалии'));
 assert.equal(capsule([],'spring').items.length,0);
});
test('a packing list follows days, weather and plans',()=>{
 const items=closet(),cold=packingList(items,{days:3,temperature:2,rain:true,plans:['casual']});
 assert.equal(cold.season,'winter');assert.ok(cold.items.some(i=>i.name==='Пальто'));assert.ok(cold.items.some(i=>i.name==='Кеды'));assert.ok(!cold.items.some(i=>i.name==='Платье'));assert.ok(cold.extras.includes('Зонт'));assert.ok(cold.extras.some(e=>e.startsWith('Бельё — 3 комплекта')));assert.ok(cold.sets>0);
 const warm=packingList(items,{days:1,temperature:28,rain:false,plans:['smart']});assert.ok(!warm.items.some(i=>i.category==='outer'));assert.ok(warm.items.some(i=>i.name==='Платье'));assert.ok(warm.extras.includes('Купальник'));assert.ok(warm.items.filter(i=>i.category==='top').length<=1);
 assert.ok(packingList(items.filter(i=>i.category!=='outer'),{days:2,temperature:0,rain:false,plans:[]}).notes.some(t=>/верхняя одежда/.test(t)));
 const text=packingText(cold,{days:3,temperature:2,rain:true,plans:['casual']},'Казань');assert.match(text,/^Казань: 3 дн\., \+2°, дождь/);assert.match(text,/— Пальто/);assert.match(text,/— Зонт/);
 assert.equal(packingList([], {days:NaN,temperature:NaN,rain:false,plans:[]}).items.length,0);
});
test('a sale ad is built from the card and the owner\'s answers without inventing facts',()=>{
 const boots=item('Ботинки на шнуровке','shoes',{color:'Чёрный',heel:'no',season:['autumn','winter'],styles:['casual']}),ad=saleAd(boots,{size:' 38 ',condition:'Отличное',brand:'',price:'3 500 руб',note:'надевала два раза'});
 assert.equal(ad.title,'Ботинки на шнуровке, размер 38');assert.match(ad.text,/Размер: 38\./);assert.match(ad.text,/Состояние: отличное\./);assert.match(ad.text,/Цвет: чёрный\./);assert.match(ad.text,/Сезон: осень, зима\./);assert.match(ad.text,/Без каблука\./);assert.match(ad.text,/надевала два раза\./);assert.match(ad.text,/Цена: 3[\s  ]500 ₽\./);
 const bare=saleAd(item('Вещь 1','unknown',{color:'Не определён'}),{size:'',condition:'',brand:'',price:'',note:''});assert.doesNotMatch(bare.text,/Размер|Цвет|Цена|Сезон/);assert.match(bare.text,/Состояние: отличное\./);
 assert.ok(saleAd(item('Очень длинное название вещи которое не помещается в заголовок','top'),{size:'44',condition:'',brand:'Бренд',price:'',note:''}).title.length<=50);
});
