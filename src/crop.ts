export interface CropRect{x:number;y:number;width:number;height:number}
export type CropMode='move'|'nw'|'ne'|'sw'|'se';
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export function adjustCrop(r:CropRect,mode:CropMode,dx:number,dy:number):CropRect{
 if(mode==='move')return {...r,x:clamp(r.x+dx,0,1-r.width),y:clamp(r.y+dy,0,1-r.height)};
 const right=r.x+r.width,bottom=r.y+r.height;let x=r.x,y=r.y,x2=right,y2=bottom;
 if(mode.includes('w'))x=clamp(x+dx,0,right-.1);else x2=clamp(right+dx,x+.1,1);
 if(mode.includes('n'))y=clamp(y+dy,0,bottom-.1);else y2=clamp(bottom+dy,y+.1,1);
 return{x,y,width:x2-x,height:y2-y};
}

export function validCropRect(value:unknown):value is CropRect{const r=value as CropRect;return !!r&&[r.x,r.y,r.width,r.height].every(Number.isFinite)&&r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=1.000001&&r.y+r.height<=1.000001}
