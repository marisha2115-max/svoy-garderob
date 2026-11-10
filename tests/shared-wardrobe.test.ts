import 'fake-indexeddb/auto';
import {test} from 'node:test';import assert from 'node:assert/strict';
import {openCloset,type ClosetSnapshot} from '../src/storage';import {demoItems} from '../src/demo';
const snapshot:ClosetSnapshot={items:[{...demoItems[0],id:'shared',demo:false}],photos:[{id:'shared',blob:new Blob(['shared photo'],{type:'image/jpeg'})}],outfits:[]};
test('fresh devices receive the shared set once; deletions stay deleted after reopening',async()=>{
 const name=crypto.randomUUID(),s=await openCloset(name);
 await s.initializeSharedWardrobe(snapshot);assert.equal((await s.listItems()).length,1);await s.deleteItem('shared');s.close();
 const reopened=await openCloset(name);await reopened.initializeSharedWardrobe(snapshot);assert.equal((await reopened.listItems()).length,0);reopened.close();
 const other=await openCloset(crypto.randomUUID());await other.initializeSharedWardrobe(snapshot);assert.equal(await(await other.getPhoto('shared'))?.text(),'shared photo');other.close();
});
test('existing personal or previously replaced wardrobes are never automatically populated',async()=>{
 for(const history of [false,true]){const s=await openCloset(crypto.randomUUID());
 if(history){await s.replaceWardrobe(snapshot,'previous');await s.deleteItem('shared')}
 else await s.putItem({...snapshot.items[0],id:'personal'},new Blob(['personal']));
 await s.initializeSharedWardrobe(snapshot);assert.deepEqual((await s.listItems()).map(i=>i.id),history?[]:['personal']);
 if(!history){await s.deleteItem('personal');await s.initializeSharedWardrobe(snapshot);assert.equal((await s.listItems()).length,0)}s.close();
 }
});
test('two tabs initialize once without duplicate or partial writes',async()=>{
 const name=crypto.randomUUID(),a=await openCloset(name),b=await openCloset(name);
 await Promise.all([a.initializeSharedWardrobe(snapshot),b.initializeSharedWardrobe(snapshot)]);assert.equal((await a.listItems()).length,1);a.close();b.close();
});
