import {test} from 'node:test';import assert from 'node:assert/strict';import {orderPhotos} from '../src/photo-order';
test('portrait photos go first and similar proportions become neighbours',()=>{
 const items=['wide','portrait','square','tall','landscape'].map(id=>({id})),ratios=new Map([['wide',.5],['portrait',1.5],['square',1],['tall',2.5],['landscape',.7]]);
 assert.deepEqual(orderPhotos(items,ratios).map(i=>i.id),['tall','portrait','square','landscape','wide']);assert.deepEqual(items.map(i=>i.id),['wide','portrait','square','tall','landscape']);
});
test('equal proportions preserve the current order and unreadable photos go last',()=>{
 const items=['missing','first','invalid','second','infinite','negative'].map(id=>({id})),ratios=new Map([['first',1.5],['second',1.5],['invalid',NaN],['infinite',Infinity],['negative',-2]]);
 assert.deepEqual(orderPhotos(items,ratios).map(i=>i.id),['first','second','missing','invalid','infinite','negative']);assert.deepEqual(orderPhotos([],ratios),[]);
});
