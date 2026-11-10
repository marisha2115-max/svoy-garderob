export interface MaskMetrics{largestShare:number;largeComponents:number;frameShare:number;fill:number;holeShare?:number;area:number;largestArea:number;components:number;pass:boolean;score:number;reasons:string[];bounds:{x:number;y:number;width:number;height:number}}
export function assessMask(mask:Uint8Array,width:number,height:number):MaskMetrics{
 const size=width*height,seen=new Uint8Array(size),queue=new Int32Array(size),areas:number[]=[];let area=0,minX=width,minY=height,maxX=-1,maxY=-1;
 if(mask.length!==size||!Number.isInteger(size)||size<=0)throw Error('INVALID_MASK');
 for(let start=0;start<size;start++){if(!mask[start]||seen[start])continue;let head=0,end=1;queue[0]=start;seen[start]=1;
  while(head<end){const i=queue[head++],x=i%width,y=Math.floor(i/width);area++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&mask[j]&&!seen[j]){seen[j]=1;queue[end++]=j}}}areas.push(end);
 }
 const largestArea=areas.reduce((max,n)=>Math.max(max,n),0),largestShare=area?largestArea/area:0,largeComponents=areas.filter(n=>n>area*.01).length,frameShare=area/size,boxArea=area?(maxX-minX+1)*(maxY-minY+1):0,fill=boxArea?area/boxArea:0,reasons:string[]=[];
 seen.fill(0);let holes=0;
 for(let start=0;start<size;start++){if(mask[start]||seen[start])continue;let head=0,end=1,edge=false;queue[0]=start;seen[start]=1;while(head<end){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x===0||y===0||x===width-1||y===height-1)edge=true;for(let d=0;d<4;d++){const xx=x+(d===0?-1:d===1?1:0),yy=y+(d===2?-1:d===3?1:0),j=yy*width+xx;if(xx>=0&&xx<width&&yy>=0&&yy<height&&!mask[j]&&!seen[j]){seen[j]=1;queue[end++]=j}}}if(!edge&&end>area*.01)holes+=end}
 const holeShare=boxArea?holes/boxArea:0;
 if(largestShare<.9)reasons.push('largest_share');if(largeComponents>3)reasons.push('components');if(frameShare<.08||frameShare>.85)reasons.push('frame_share');if(fill<.35)reasons.push('fill');if(holeShare>.025)reasons.push('holes');
 return{largestShare,largeComponents,frameShare,fill,holeShare,area,largestArea,components:areas.length,pass:reasons.length===0,score:.6*largestShare+.4*fill,reasons,bounds:{x:area?minX:0,y:area?minY:0,width:area?maxX-minX+1:0,height:area?maxY-minY+1:0}};
}
export function chooseMask<T extends {method:string;metrics:MaskMetrics}>(candidates:T[]):T|undefined{return candidates.filter(c=>c.metrics.pass).sort((a,b)=>b.metrics.score-a.metrics.score)[0]}
