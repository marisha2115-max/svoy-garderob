import {test} from 'node:test';import assert from 'node:assert/strict';import {detectDevice} from '../src/install';import {serviceWorkerSource} from '../scripts/service-worker.mjs';
test('the install help recognises the phone and its browser',()=>{
 assert.equal(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1',false),'iphone');
 assert.equal(detectDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1',false),'iphone-other-browser');
 assert.equal(detectDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Safari/605.1.15',true),'iphone','iPad reports itself as a Mac with touch');
 assert.equal(detectDevice('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',false),'android');
 assert.equal(detectDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36',false),'computer');
});
test('the offline copy lists every site file once and changes its version when files change',()=>{
 const files=['index.html','assets/main-AAA.js','assets/main-BBB.css','sw.js','.nojekyll','shared-wardrobe/manifest.json','icons/icon-192.png'];
 const a=serviceWorkerSource(files),b=serviceWorkerSource(files.map(f=>f.replace('AAA','CCC')));
 const list=JSON.parse(a.source.match(/FILES=(\[.*?\]);/)![1]);
 assert.deepEqual(list,['./','./assets/main-AAA.js','./assets/main-BBB.css','./icons/icon-192.png','./index.html','./shared-wardrobe/manifest.json']);
 assert.notEqual(a.version,b.version);assert.match(a.source,/skipWaiting/);assert.match(a.source,/caches\.delete/);
});
