import {test} from 'node:test';import assert from 'node:assert/strict';import {solidBackgroundMask} from '../src/solid-background';
test('uniform background is removed while a complete contrasted garment is retained',()=>{
 const pixels=new Uint8ClampedArray(100*120*4).fill(255);for(let y=15;y<105;y++)for(let x=25;x<75;x++){const i=(y*100+x)*4;pixels[i]=140;pixels[i+1]=30;pixels[i+2]=20}
 const mask=solidBackgroundMask(pixels,100,120);assert.ok(mask);assert.equal(mask[0],0);assert.equal(mask[15*100+25],1);assert.equal(mask[104*100+74],1);assert.equal(mask.reduce((a,b)=>a+b,0),4500);
});
test('a varied photo border and a blank photo are refused without destroying the original',()=>{
 const pixels=new Uint8ClampedArray(100*100*4).fill(255);assert.equal(solidBackgroundMask(pixels,100,100),undefined);for(let y=0;y<100;y++)for(let x=0;x<100;x++){const i=(y*100+x)*4;pixels[i]=(x+y)%2?0:255;pixels[i+1]=0;pixels[i+2]=0}assert.equal(solidBackgroundMask(pixels,100,100),undefined);
});
