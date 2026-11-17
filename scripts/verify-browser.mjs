import {spawnSync} from 'node:child_process';
// The Pages scenario supersedes legacy local-token/model-specific flows.
const result=spawnSync(process.execPath,['browser/pages.mjs'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);const cards=spawnSync(process.execPath,['browser/tile-fit.mjs'],{stdio:'inherit'});if(cards.status!==0)process.exit(cards.status??1);const pwa=spawnSync(process.execPath,['browser/pwa.mjs'],{stdio:'inherit'});process.exitCode=pwa.status??1;
