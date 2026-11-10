import { build } from 'esbuild';
import { mkdir, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
await mkdir('.test-build', { recursive: true });
const tests = (await readdir('tests')).filter(f => f.endsWith('.test.ts'));
await build({ entryPoints: tests.map(f => `tests/${f}`), outdir: '.test-build', bundle: true, platform: 'node', format: 'esm', packages: 'external', external: ['../server.mjs'], sourcemap: 'inline' });
const result = spawnSync(process.execPath, ['--test', ...tests.map(f => `.test-build/${f.replace(/\.ts$/, '.js')}`)], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
