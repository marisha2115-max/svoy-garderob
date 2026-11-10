import type { Category } from './domain';
const labels: Record<string, Category> = { 'Upper-clothes':'top', Skirt:'bottom', Pants:'bottom', Dress:'dress', 'Left-shoe':'shoes', 'Right-shoe':'shoes', Bag:'accessory', Scarf:'accessory', Hat:'accessory', Belt:'accessory', Sunglasses:'accessory' };
export function selectGarment(masks: {label:string;area:number}[], category: Category) {
  const groups = new Map<Category, number>();
  for (const mask of masks) { const cat=labels[mask.label]; if(cat) groups.set(cat,(groups.get(cat)??0)+mask.area); }
  const chosen = category !== 'unknown' && groups.has(category) ? category : [...groups].sort((a,b)=>b[1]-a[1])[0]?.[0];
  return chosen ? { category:chosen, labels:masks.filter(m=>labels[m.label]===chosen).map(m=>m.label) } : undefined;
}
const palette: [string,number,number,number][] = [['Чёрный',25,25,28],['Белый',235,234,228],['Молочный',222,214,190],['Серый',135,135,135],['Бежевый',192,163,128],['Серо-коричневый',135,117,101],['Коричневый',91,60,44],['Терракотовый',177,77,45],['Оранжевый',239,127,32],['Красный',190,35,40],['Бордовый',108,29,45],['Розовый',210,135,158],['Жёлтый',220,190,50],['Зелёный',61,111,69],['Оливковый',112,115,59],['Голубой',115,173,199],['Синий',58,100,150],['Тёмно-синий',32,46,69],['Фиолетовый',112,64,143]];
export function pixelColour(rgba: Uint8ClampedArray | Uint8Array): string {
  const bins=new Map<number,{n:number;r:number;g:number;b:number}>();
  const stride=Math.max(1,Math.floor(rgba.length/4/100000));
  for(let i=0;i<rgba.length;i+=4*stride){if(rgba[i+3]<200)continue;const r=rgba[i],g=rgba[i+1],b=rgba[i+2],key=(r>>5)*64+(g>>5)*8+(b>>5);const v=bins.get(key)??{n:0,r:0,g:0,b:0};v.n++;v.r+=r;v.g+=g;v.b+=b;bins.set(key,v);}
  const dominant=[...bins.values()].sort((a,b)=>b.n-a.n)[0];if(!dominant)return 'Не определён';
  const r=dominant.r/dominant.n,g=dominant.g/dominant.n,b=dominant.b/dominant.n;
  const hue=r>g&&g>b?60*(g-b)/(r-b):0;
  if(r>1.6*g&&g>1.35*b&&hue>=8&&hue<=25)return 'Терракотовый';
  return [...palette].sort((a,c)=>distance(a)-distance(c))[0][0];
  function distance(p:typeof palette[number]){return 2*(p[1]-r)**2+3*(p[2]-g)**2+(p[3]-b)**2;}
}
