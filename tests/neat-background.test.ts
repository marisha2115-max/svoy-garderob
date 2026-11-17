import {test} from 'node:test';import assert from 'node:assert/strict';import {neatBackgroundMask} from '../src/neat-background';
function canvas(width:number,height:number,bg:(x:number,y:number)=>[number,number,number]){const p=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const i=(y*width+x)*4,c=bg(x,y);p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2];p[i+3]=255}return p}
function box(p:Uint8ClampedArray,width:number,x0:number,y0:number,x1:number,y1:number,c:[number,number,number]){for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*width+x)*4;p[i]=c[0];p[i+1]=c[1];p[i+2]=c[2]}}
test('a softly lit plain backdrop is removed and both shoes of a pair are kept',()=>{
 const p=canvas(200,160,(x,y)=>{const v=240-Math.round((x+y)/12);return [v,v,v-4]});box(p,200,20,60,90,120,[40,30,30]);box(p,200,110,60,180,120,[40,30,30]);
 const r=neatBackgroundMask(p,200,160);assert.ok(r);assert.equal(r.confident,true);assert.equal(r.pieces,2);assert.equal(r.mask[0],0);assert.equal(r.mask[90*200+50],1);assert.equal(r.mask[90*200+150],1);assert.equal(r.mask[90*200+100],0);assert.equal(r.alpha[90*200+50],255);assert.equal(r.alpha[5*200+5],0);
});
test('an item that touches the frame edge is still separated',()=>{
 const p=canvas(120,160,()=>[236,236,232]);box(p,120,40,0,80,130,[20,20,24]);
 const r=neatBackgroundMask(p,120,160);assert.ok(r);assert.equal(r.confident,true);assert.equal(r.mask[10*120+60],1);assert.equal(r.mask[150*120+60],0);
});
test('backdrop enclosed by the item is cleared, a small light detail is not',()=>{
 const p=canvas(200,200,()=>[240,240,240]);box(p,200,40,40,160,160,[30,60,120]);box(p,200,80,80,120,120,[240,240,240]);box(p,200,50,50,54,54,[240,240,240]);
 const r=neatBackgroundMask(p,200,200);assert.ok(r);assert.equal(r.mask[100*200+100],0);assert.equal(r.mask[52*200+52],1);
});
test('a busy backdrop, a blank photo and an item close to the backdrop colour are not trusted',()=>{
 const busy=canvas(120,120,(x,y)=>(Math.floor(x/8)+Math.floor(y/8))%2?[30,90,40]:[220,200,160]);box(busy,120,40,40,80,80,[150,20,20]);assert.equal(neatBackgroundMask(busy,120,120),undefined);
 assert.equal(neatBackgroundMask(canvas(100,100,()=>[255,255,255]),100,100),undefined);
 // A cream dress on a white wall: the outline depends on the tolerance, so it must not be applied automatically.
 const pale=canvas(160,200,()=>[244,244,244]);for(let y=30;y<180;y++)for(let x=50;x<110;x++){const i=(y*160+x)*4,v=244-Math.round(48*Math.min(1,(x-50)/30));pale[i]=v;pale[i+1]=v;pale[i+2]=v-6}
 const r=neatBackgroundMask(pale,160,200);assert.ok(!r||!r.confident);
});
