import {test} from 'node:test';import assert from 'node:assert/strict';import {mkdtemp,mkdir,writeFile} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {createHash} from 'node:crypto';
// @ts-expect-error native build boundary
import {approvedAssetPaths} from '../scripts/release-assets.mjs';
test('source packaging never includes an excluded photo left in the asset directory',async()=>{
 const root=await mkdtemp(join(tmpdir(),'wardrobe-release-')),id='phone-0123456789abcdef01234567',removed='phone-ffffffffffffffffffffffff',bytes=Buffer.from('approved photo');await mkdir(join(root,'shared-wardrobe/photos'),{recursive:true});
 await writeFile(join(root,'shared-wardrobe/photos',id+'.jpg'),bytes);await writeFile(join(root,'shared-wardrobe/photos',removed+'.jpg'),'withdrawn');
 await writeFile(join(root,'shared-wardrobe/manifest.json'),JSON.stringify({version:1,items:[{id}],photos:{[id]:`shared-wardrobe/photos/${id}.jpg`}}));await writeFile(join(root,'photo-approval.json'),JSON.stringify({status:'approved',ids:[id],files:[{id,sha256:createHash('sha256').update(bytes).digest('hex')}]}));
 assert.deepEqual(await approvedAssetPaths(root),['photo-approval.json','shared-wardrobe/manifest.json',`shared-wardrobe/photos/${id}.jpg`]);
 await writeFile(join(root,'shared-wardrobe/photos',id+'.jpg'),'tampered');await assert.rejects(approvedAssetPaths(root),/hash/i);
});
