import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSerialQueue } from '../src/analysis-queue';
test('jobs from consecutive uploads never compete for the server and one error does not block the queue', async () => {
  const enqueue = createSerialQueue();
  let active = 0, maximum = 0;
  const completed: number[] = [];
  const job = (id: number) => enqueue(async () => {
    active++; maximum = Math.max(maximum, active);
    await new Promise(resolve => setTimeout(resolve, 5));
    active--;
    if (id === 2) throw new Error('provider refusal');
    completed.push(id);
  });
  const results = await Promise.allSettled([job(1), job(2), job(3), job(4)]);
  assert.equal(maximum, 1);
  assert.deepEqual(completed, [1, 3, 4]);
  assert.equal(results[1].status, 'rejected');
});
