import type {Item} from './domain';
export type Placement={x:number;y:number;width:number;height:number};
export type Corner='nw'|'ne'|'sw'|'se';
export const MIN_SIZE=.1;
const clamp=(v:number,min:number,max:number)=>Math.min(max,Math.max(min,v));
export function movePlacement(p:Placement,dx:number,dy:number):Placement{return{...p,x:clamp(p.x+dx,0,1-p.width),y:clamp(p.y+dy,0,1-p.height)}}
export function resizePlacement(p:Placement,width:number):Placement{
 const ratio=clamp(p.height/p.width,MIN_SIZE/.8,.9/MIN_SIZE),minimum=Math.max(MIN_SIZE,MIN_SIZE/ratio),maximum=Math.min(.8,.9/ratio),w=clamp(Number.isFinite(width)?width:p.width,minimum,maximum),h=clamp(w*ratio,MIN_SIZE,.9);
 return{width:w,height:h,x:clamp(p.x,0,1-w),y:clamp(p.y,0,1-h)};
}
export function resizeFromCorner(p:Placement,corner:Corner,dx:number,dy:number):Placement{
 const west=corner.endsWith('w'),north=corner.startsWith('n'),sx=1+dx*(west?-1:1)/p.width,sy=1+dy*(north?-1:1)/p.height,scale=Math.abs(sx-1)>Math.abs(sy-1)?sx:sy,next=resizePlacement(p,p.width*scale);
 return movePlacement({...next,x:0,y:0},west?p.x+p.width-next.width:p.x,north?p.y+p.height-next.height:p.y);
}
export function overlaps(a:Placement,b:Placement):boolean{const e=.000001;return a.x<b.x+b.width-e&&a.x+a.width>b.x+e&&a.y<b.y+b.height-e&&a.y+a.height>b.y+e}
export function validLayout(value:unknown,ids:string[]):boolean{if(value===undefined)return true;if(!value||typeof value!=='object'||Array.isArray(value))return false;return Object.entries(value).every(([id,p]:[string,any])=>ids.includes(id)&&p&&['x','y','width','height'].every(k=>typeof p[k]==='number'&&Number.isFinite(p[k]))&&p.x>=0&&p.y>=0&&p.width>=MIN_SIZE&&p.height>=MIN_SIZE&&p.x+p.width<=1.000001&&p.y+p.height<=1.000001)}
export function defaultLayout(items:Item[]):Record<string,Placement>{
 const out:Record<string,Placement>={},upper=items.filter(i=>['top','outer'].includes(i.category)),lower=items.filter(i=>i.category==='bottom'),dresses=items.filter(i=>i.category==='dress'),shoes=items.filter(i=>i.category==='shoes'),accessories=items.filter(i=>['accessory','unknown'].includes(i.category));
 const row=(list:Item[],x:number,y:number,w:number,h:number)=>{const cols=Math.min(2,list.length),rows=Math.ceil(list.length/Math.max(1,cols));for(const [n,i]of list.entries()){const ww=w/cols,hh=h/rows;out[i.id]={x:x+(n%cols)*ww+.005,y:y+Math.floor(n/cols)*hh+.005,width:ww-.01,height:hh-.01}}};
 const grid=()=>{for(const id of Object.keys(out))delete out[id];row(items,.01,0,.98,.99);return out};
 if(dresses.length&&(lower.length||upper.some(i=>i.category==='top')))return grid();
 if(dresses.length){row(dresses,upper.length?.31:.17,0,upper.length?.53:.66,.78);row(upper,.01,0,.28,.41)}else{row(upper,upper.length>1?.01:.18,0,upper.length>1?.98:.64,.41);row(lower,.17,.42,.66,.36)}
 row(shoes,.18,.80,.64,.19);for(const [n,i]of accessories.entries()){const rows=Math.ceil(accessories.length/2),h=Math.min(.22,.35/Math.max(1,rows));out[i.id]={x:n%2?.855:.005,y:.44+Math.floor(n/2)*h,width:.14,height:h-.01}}
 return Object.keys(out).length!==items.length||!validLayout(out,items.map(i=>i.id))?grid():out;
}
function freePlacement(wanted:Placement,occupied:Placement[]):Placement|undefined{
 for(let scale=1;scale>=.1;scale-=.05){const w=Math.max(MIN_SIZE,wanted.width*scale),h=Math.max(MIN_SIZE,wanted.height*scale),xs=[wanted.x,0,1-w,...occupied.flatMap(p=>[p.x+p.width+.005,p.x-w-.005])],ys=[wanted.y,0,1-h,...occupied.flatMap(p=>[p.y+p.height+.005,p.y-h-.005])];
  for(const y of ys)for(const x of xs){const p={x,y,width:w,height:h};if(validLayout({a:p},['a'])&&!occupied.some(b=>overlaps(p,b)))return p}
 }return undefined;
}
/** Preserve actual manual edits; reflow untouched defaults and search around them. */
export function layoutWithAdditions(items:Item[],current:Record<string,Placement>,locked:Set<string>):Record<string,Placement>|undefined{
 const defaults=defaultLayout(items);if(!locked.size)return defaults;
 const next:Record<string,Placement>={};for(const i of items)if(locked.has(i.id)&&current[i.id])next[i.id]=current[i.id];
 for(const i of items){if(next[i.id])continue;const desired=defaults[i.id],occupied=Object.values(next),p=freePlacement(desired,occupied);if(!p)return;next[i.id]=p}
 return next;
}
