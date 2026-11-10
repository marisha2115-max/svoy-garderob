import {spawnSync} from 'node:child_process';
// The Pages scenario supersedes legacy local-token/model-specific flows.
const result=spawnSync(process.execPath,['browser/pages.mjs'],{stdio:'inherit'});if(result.status!==0)process.exit(result.status??1);const cards=spawnSync(process.execPath,['browser/card-fit.mjs'],{stdio:'inherit'});process.exitCode=cards.status??1;
