// "Neat background": separates an item from a plain backdrop (wall, sheet, floor,
// studio page) without a neural model. It tolerates soft lighting gradients, an item
// touching the frame edge and several separate pieces (a pair of shoes).
// It never guesses: a busy backdrop or an unstable result returns nothing or
// `confident:false`, and the caller keeps the original photo.
export interface NeatMask{mask:Uint8Array;alpha:Uint8ClampedArray;confident:boolean;background:[number,number,number];borderShare:number;stability:number;pieces:number}
type Rgb=[number,number,number];
const far=(p:Uint8ClampedArray|Uint8Array,i:number,c:Rgb)=>Math.max(Math.abs(p[i]-c[0]),Math.abs(p[i+1]-c[1]),Math.abs(p[i+2]-c[2]));
const step=(p:Uint8ClampedArray|Uint8Array,i:number,j:number)=>Math.max(Math.abs(p[i]-p[j]),Math.abs(p[i+1]-p[j+1]),Math.abs(p[i+2]-p[j+2]));

function borderIndexes(width:number,height:number){
 const ring=Math.max(1,Math.round(Math.min(width,height)*.006)),out:number[]=[];
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){if(x<ring||y<ring||x>=width-ring||y>=height-ring)out.push(y*width+x);else if(x===ring&&y>=ring&&y<height-ring)x=width-ring-1}
 return out;
}
// The most common border colour, not the median: an item may cover part of the edge.
function dominant(pixels:Uint8ClampedArray|Uint8Array,border:number[]):Rgb|undefined{
 const bins=new Map<number,number>();
 for(const i of border){if(pixels[i*4+3]<16)continue;const key=(pixels[i*4]>>4)<<8|(pixels[i*4+1]>>4)<<4|pixels[i*4+2]>>4;bins.set(key,(bins.get(key)??0)+1)}
 let best=-1,count=0;for(const [key,n] of bins)if(n>count){best=key;count=n}
 if(best<0)return;
 let colour:Rgb=[(best>>8&15)*16+8,(best>>4&15)*16+8,(best&15)*16+8];
 for(let pass=0;pass<2;pass++){let r=0,g=0,b=0,n=0;for(const i of border){if(pixels[i*4+3]>=16&&far(pixels,i*4,colour)<=24){r+=pixels[i*4];g+=pixels[i*4+1];b+=pixels[i*4+2];n++}}if(!n)return;colour=[r/n,g/n,b/n]}
 return colour;
}
function grow(pixels:Uint8ClampedArray|Uint8Array,width:number,height:number,border:number[],bg:Rgb,reach:number,edge:number,queue:Int32Array):Uint8Array{
 const size=width*height,seen=new Uint8Array(size);let head=0,end=0;
 for(const i of border)if(!seen[i]&&(pixels[i*4+3]<16||far(pixels,i*4,bg)<=reach)){seen[i]=1;queue[end++]=i}
 const visit=(from:number,j:number)=>{if(seen[j])return;if(pixels[j*4+3]<16||far(pixels,j*4,bg)<=reach&&step(pixels,from*4,j*4)<=edge){seen[j]=1;queue[end++]=j}};
 while(head<end){const i=queue[head++],x=i%width;if(x)visit(i,i-1);if(x+1<width)visit(i,i+1);if(i>=width)visit(i,i-width);if(i+width<size)visit(i,i+width)}
 // Enclosed backdrop (between boot legs, inside a bag handle): only a very close colour match.
 const limit=Math.max(24,Math.round(size*.0015));
 for(let start=0;start<size;start++){if(seen[start]||far(pixels,start*4,bg)>14)continue;const from=end;seen[start]=2;queue[end++]=start;let at=from;
  while(at<end){const i=queue[at++],x=i%width;for(const j of [x?i-1:-1,x+1<width?i+1:-1,i-width,i+width]){if(j<0||j>=size||seen[j]||far(pixels,j*4,bg)>14)continue;seen[j]=2;queue[end++]=j}}
  if(end-from<limit)for(let k=from;k<end;k++)seen[queue[k]]=3;end=from;
 }
 for(let i=0;i<size;i++)seen[i]=seen[i]===3?0:seen[i]?1:0;
 return seen;
}
export function neatBackgroundMask(pixels:Uint8ClampedArray|Uint8Array,width:number,height:number):NeatMask|undefined{
 const size=width*height;if(!Number.isSafeInteger(size)||width<8||height<8||pixels.length!==size*4)return;
 const border=borderIndexes(width,height),bg=dominant(pixels,border);if(!bg)return;
 const borderShare=border.filter(i=>pixels[i*4+3]<16||far(pixels,i*4,bg)<=40).length/border.length;
 if(borderShare<.6)return;
 const queue=new Int32Array(size),count=(m:Uint8Array)=>{let n=0;for(let i=0;i<size;i++)if(!m[i])n++;return n};
 const normal=grow(pixels,width,height,border,bg,44,14,queue),area=count(normal);
 if(area<size*.04||area>size*.9)return;
 const strict=count(grow(pixels,width,height,border,bg,30,9,queue)),loose=count(grow(pixels,width,height,border,bg,60,20,queue));
 const stability=1-Math.min(1,Math.abs(strict-loose)/area);
 // Keep every real piece (both shoes), drop specks.
 const mask=new Uint8Array(size),label=new Uint8Array(size),pieces:{from:number;to:number}[]=[];let end=0;
 for(let start=0;start<size;start++){if(normal[start]||label[start])continue;const from=end;label[start]=1;queue[end++]=start;let at=from;
  while(at<end){const i=queue[at++],x=i%width,y=(i-x)/width;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;const j=yy*width+xx;if(!normal[j]&&!label[j]){label[j]=1;queue[end++]=j}}}
  pieces.push({from,to:end});
 }
 const largest=pieces.reduce((n,p)=>Math.max(n,p.to-p.from),0),kept=pieces.filter(p=>p.to-p.from>=largest*.04);
 let keptArea=0,minX=width,minY=height,maxX=-1,maxY=-1;
 for(const p of kept)for(let k=p.from;k<p.to;k++){const i=queue[k],x=i%width,y=(i-x)/width;mask[i]=1;keptArea++;if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y}
 if(keptArea<size*.04||kept.length>4)return;
 const fill=keptArea/((maxX-minX+1)*(maxY-minY+1));
 // Soft one-pixel edge so the item does not look cut out with scissors.
 const alpha=new Uint8ClampedArray(size);
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){let sum=0,n=0;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=width||yy>=height)continue;sum+=mask[yy*width+xx];n++}alpha[y*width+x]=Math.max(0,Math.min(1,(sum/n-.3)/.5))*255}
 return{mask,alpha,background:[Math.round(bg[0]),Math.round(bg[1]),Math.round(bg[2])],borderShare,stability,pieces:kept.length,confident:borderShare>=.72&&stability>=.9&&fill>=.22&&kept.length<=3};
}
