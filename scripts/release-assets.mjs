import {readFile} from 'node:fs/promises';import {resolve} from 'node:path';import {createHash} from 'node:crypto';
export async function approvedAssetPaths(root){
 const shared=JSON.parse(await readFile(resolve(root,'shared-wardrobe/manifest.json'),'utf8')),approval=JSON.parse(await readFile(resolve(root,'photo-approval.json'),'utf8'));
 if(shared.version!==1||!Array.isArray(shared.items)||shared.items.length>38||approval.status!=='approved'||!Array.isArray(approval.ids)||!Array.isArray(approval.files)||approval.files.length!==approval.ids.length||approval.ids.length!==shared.items.length||new Set(approval.ids).size!==approval.ids.length||new Set(shared.items.map(i=>i.id)).size!==shared.items.length||Object.keys(shared.photos).length!==shared.items.length)throw Error('Invalid approved photo set');
 const paths=['photo-approval.json','shared-wardrobe/manifest.json'];
 for(const item of shared.items){const path=`shared-wardrobe/photos/${item.id}.jpg`;if(!/^phone-[a-f0-9]{24}$/.test(item.id)||!approval.ids.includes(item.id)||shared.photos[item.id]!==path)throw Error('Unapproved photo path');
  const bytes=await readFile(resolve(root,path)),records=approval.files.filter(p=>p.id===item.id);if(records.length!==1||createHash('sha256').update(bytes).digest('hex')!==records[0].sha256)throw Error('Approved photo hash differs: '+item.id);paths.push(path);
 }
 return paths;
}
