import {solidBackgroundMask} from './solid-background';import {cleanMask} from './mask-cleanup';import {assessMask} from './mask-quality';import {pixelColour} from './local-photo';import type {PhotoReport} from './photo-report';
const send=(value:unknown)=>postMessage(value);
onmessage=async({data})=>{
 const {id,photo,source='original'}=data,start=performance.now();
 try{
  send({id,progress:'Проверяем однородный фон'});
  const bitmap=await createImageBitmap(photo);if(bitmap.width*bitmap.height>60_000_000){bitmap.close();throw Error('IMAGE_TOO_LARGE')}
  const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height)),canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale))),ctx=canvas.getContext('2d')!;
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),mask=solidBackgroundMask(pixels.data,canvas.width,canvas.height);
  if(!mask){send({id,done:true,fallback:true,reason:'Фон неоднородный или предмет недостаточно отличается от фона. Оригинал сохранён.'});return}
  const metrics=assessMask(mask,canvas.width,canvas.height),clean=metrics.pass?cleanMask(mask,canvas.width,canvas.height):undefined;
  const report:PhotoReport={version:1,source,attempts:[{method:'solid',metrics,elapsedMs:performance.now()-start}],elapsedMs:performance.now()-start,...clean?{selected:'solid' as const}:{}};
  if(!clean){send({id,done:true,fallback:true,report});return}
  for(let i=0;i<mask.length;i++)if(!clean.mask[i])pixels.data[i*4+3]=0;const color=pixelColour(pixels.data);ctx.putImageData(pixels,0,0);
  const width=clean.maxX-clean.minX+1,height=clean.maxY-clean.minY+1,pad=Math.max(12,Math.round(Math.max(width,height)*.035)),output=new OffscreenCanvas(width+pad*2,height+pad*2);
  output.getContext('2d')!.drawImage(canvas,clean.minX,clean.minY,width,height,pad,pad,width,height);
  send({id,done:true,photo:await output.convertToBlob({type:'image/png'}),color,report});
 }catch(e){send({id,done:true,fallback:true,reason:String(e).slice(0,250)})}
};
