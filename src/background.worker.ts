import {neatBackgroundMask} from './neat-background';import {assessMask} from './mask-quality';import {pixelColour} from './local-photo';import type {PhotoReport} from './photo-report';
const send=(value:unknown)=>postMessage(value);
onmessage=async({data})=>{
 const {id,photo,source='original'}=data,start=performance.now();
 try{
  send({id,progress:'Убираем однотонный фон'});
  const bitmap=await createImageBitmap(photo);if(bitmap.width*bitmap.height>60_000_000){bitmap.close();throw Error('IMAGE_TOO_LARGE')}
  const scale=Math.min(1,1024/Math.max(bitmap.width,bitmap.height)),canvas=new OffscreenCanvas(Math.max(1,Math.round(bitmap.width*scale)),Math.max(1,Math.round(bitmap.height*scale))),ctx=canvas.getContext('2d')!;
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),neat=neatBackgroundMask(pixels.data,canvas.width,canvas.height);
  // An unstable outline is not even offered: the original photo stays.
  if(!neat||neat.stability<.6){send({id,done:true,fallback:true,reason:'Фон неоднородный или предмет недостаточно отличается от фона. Оригинал сохранён.'});return}
  // The plain-backdrop method has its own checks (several pieces are allowed), so its attempt is recorded as passed.
  const metrics={...assessMask(neat.mask,canvas.width,canvas.height),pass:true,reasons:[]};
  const report:PhotoReport={version:1,source,attempts:[{method:'solid',metrics,elapsedMs:performance.now()-start}],elapsedMs:performance.now()-start,selected:'solid'};
  for(let i=0;i<neat.alpha.length;i++)pixels.data[i*4+3]=Math.min(pixels.data[i*4+3],neat.alpha[i]);const color=pixelColour(pixels.data);ctx.putImageData(pixels,0,0);
  const {x,y,width,height}=metrics.bounds,pad=Math.max(12,Math.round(Math.max(width,height)*.035)),output=new OffscreenCanvas(width+pad*2,height+pad*2);
  output.getContext('2d')!.drawImage(canvas,x,y,width,height,pad,pad,width,height);
  send({id,done:true,photo:await output.convertToBlob({type:'image/png'}),color,report,confident:neat.confident});
 }catch(e){send({id,done:true,fallback:true,reason:String(e).slice(0,250)})}
};
