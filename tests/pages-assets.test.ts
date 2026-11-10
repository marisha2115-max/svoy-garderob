import {test} from 'node:test';import assert from 'node:assert/strict';
import {resolveAsset} from '../src/assets';import {parseSharedWardrobe} from '../src/shared-wardrobe';import {demoItems} from '../src/demo';
test('asset URLs stay under both a root domain and a repository subpath',()=>{
 for(const [script,expected]of [['https://example.test/assets/main-HASH.js','https://example.test/shared-wardrobe/manifest.json'],['https://example.test/repository/assets/main-HASH.js','https://example.test/repository/shared-wardrobe/manifest.json']])assert.equal(resolveAsset('shared-wardrobe/manifest.json',script),expected);
 for(const bad of ['/assets/a.js','../secret','https://other.test/a','//other.test/a'])assert.throws(()=>resolveAsset(bad,'https://example.test/repo/assets/main.js'));
});
test('approved shared sets can contain fewer than38 items, including an empty set',()=>{
 const id='phone-0123456789abcdef01234567',item={...demoItems[0],id,demo:false};
 assert.equal(parseSharedWardrobe({version:1,items:[item],photos:{[id]:`shared-wardrobe/photos/${id}.jpg`}}).items.length,1);
 assert.equal(parseSharedWardrobe({version:1,items:[],photos:{}}).items.length,0);
 for(const path of [`https://other.test/${id}.jpg`,`../photos/${id}.jpg`])assert.throws(()=>parseSharedWardrobe({version:1,items:[item],photos:{[id]:path}}));
 assert.throws(()=>parseSharedWardrobe({version:1,items:[item,item],photos:{[id]:`shared-wardrobe/photos/${id}.jpg`}}));
});
