// Conservative flood fill for a contrasted item against a uniform backdrop.
// A varied border, blank image or implausible foreground returns no cutout.
export function solidBackgroundMask(pixels:Uint8ClampedArray,width:number,height:number):Uint8Array|undefined{
 const size=width*height;if(!Number.isSafeInteger(size)||width<8||height<8||pixels.length!==size*4)return;
 const border:number[]=[];for(let x=0;x<width;x++){border.push(x,(height-1)*width+x)}for(let y=1;y<height-1;y++)border.push(y*width,y*width+width-1);
 const median=(channel:number)=>border.map(i=>pixels[i*4+channel]).sort((a,b)=>a-b)[Math.floor(border.length/2)];const rgb=[median(0),median(1),median(2)];
 const matches=(i:number)=>pixels[i*4+3]<16||rgb.every((v,c)=>Math.abs(pixels[i*4+c]-v)<=28);
 if(border.filter(matches).length<border.length*.95)return;
 const seen=new Uint8Array(size),queue=new Int32Array(size);let end=0,head=0;
 const add=(i:number)=>{if(!seen[i]&&matches(i)){seen[i]=1;queue[end++]=i}};for(const i of border)add(i);
 while(head<end){const i=queue[head++],x=i%width,y=Math.floor(i/width);if(x)add(i-1);if(x+1<width)add(i+1);if(y)add(i-width);if(y+1<height)add(i+width)}
 const mask=new Uint8Array(size);let area=0;for(let i=0;i<size;i++)if(!seen[i]&&pixels[i*4+3]>=16){mask[i]=1;area++}
 if(area<size*.08||area>size*.85)return;return mask;
}
