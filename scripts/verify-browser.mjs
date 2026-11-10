import {spawnSync} from 'node:child_process';
// The Pages scenario supersedes legacy local-token/model-specific flows.
const result=spawnSync(process.execPath,['browser/pages.mjs'],{stdio:'inherit'});process.exitCode=result.status??1;
