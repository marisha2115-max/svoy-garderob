import {assessMask} from './mask-quality';
export function cleanMask(source:Uint8Array,width:number,height:number):{mask:Uint8Array;area:number;minX:number;minY:number;maxX:number;maxY:number}|undefined{
 const size=width*height;if(!Number.isSafeInteger(size)||size<1||source.length!==size)return;
 if(!assessMask(source,width,height).pass)return;
 const seen=new Uint8Array(size),queue=new Int32Array(size);let largest:number[]=[],second=0,total=0;
 for(let start=0;start<size;start++){if(!source[start]||seen[start])continue;let head=0,end=1;queue[0]=start;seen[start]=1;const region:number[]=[];
  while(head<end){const i=queue[head++];region.push(i);const x=i%width,y=Math.floor(i/width);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&source[j]&&!seen[j]){seen[j]=1;queue[end++]=j}}}
  total+=region.length;if(region.length>largest.length){second=largest.length;largest=region}else second=Math.max(second,region.length);
 }
 const mask=new Uint8Array(size);for(const i of largest)mask[i]=1;seen.fill(0);
 const holeLimit=Math.max(4,Math.floor(largest.length*.001));
 for(let start=0;start<size;start++){if(mask[start]||seen[start])continue;let head=0,end=1,edge=false;queue[0]=start;seen[start]=1;
  while(head<end){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x===0||y===0||x===width-1||y===height-1)edge=true;for(let d=0;d<4;d++){const xx=x+(d===0?-1:d===1?1:0),yy=y+(d===2?-1:d===3?1:0),j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&!mask[j]&&!seen[j]){seen[j]=1;queue[end++]=j}}}
  if(!edge&&end<=holeLimit)for(let i=0;i<end;i++)mask[queue[i]]=1;
 }
 let minX=width,minY=height,maxX=-1,maxY=-1,area=0;for(let i=0;i<size;i++)if(mask[i]){const x=i%width,y=Math.floor(i/width);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);area++}
 return {mask,area,minX,minY,maxX,maxY};
}
