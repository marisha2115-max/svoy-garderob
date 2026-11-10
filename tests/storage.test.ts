import 'fake-indexeddb/auto';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openCloset } from '../src/storage';
import { validateItem, validateConditions, defaultConditions, sanitizePhotoMetadata, type Item } from '../src/domain';

const item: Item = { id: 'shirt', name: 'Белая рубашка', category: 'top', color: 'Белый', season: ['all'], warmth: 'light', rain: 'unknown', wind: 'unknown', heel: 'no', demo: false, createdAt: '2026-11-07T12:00:00Z' };

test('a photo and edited item survive closing and reopening storage', async () => {
  const name = `closet-${crypto.randomUUID()}`;
  const first = await openCloset(name);
  await first.putItem(item, new Blob(['photograph'], { type: 'image/jpeg' }));
  await first.putItem({ ...item, name: 'Любимая рубашка' });
  first.close();
  const second = await openCloset(name);
  assert.equal((await second.listItems())[0].name, 'Любимая рубашка');
  assert.equal(await (await second.getPhoto('shirt'))?.text(), 'photograph');
  second.close();
});

test('deleting an item deletes its photograph but preserves saved outfit for incomplete marking', async () => {
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  await store.putItem(item, new Blob(['photo']));
  await store.putOutfit({ id: 'o', itemIds: ['shirt'], title: 'Образ', explanation: '', mode: 'rules', createdAt: '2026-11-07', conditions: { temperature: 20, rain: false, wind: 'calm', location: 'outside', occasion: '', wishes: '', style: '', pinnedId: '', noHeels: false, walking: false } });
  await store.deleteItem('shirt');
  assert.deepEqual(await store.listItems(), []);
  assert.equal(await store.getPhoto('shirt'), undefined);
  assert.deepEqual((await store.listOutfits())[0].itemIds, ['shirt']);
  store.close();
});

test('failed writes reject instead of reporting a saved item', async () => {
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  store.close();
  await assert.rejects(store.putItem(item, new Blob(['photo'])));
});

test('invalid categories and missing names are refused at storage boundary', async () => {
  assert.ok(validateItem({ ...item, category: 'spaceship' }).length);
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  await assert.rejects(store.putItem({ ...item, name: ' ' }, new Blob(['photo'])));
  assert.deepEqual(await store.listItems(), []);
  store.close();
});

test('runtime enums reject arrays instead of coercing them into weather and protection strings', () => {
  assert.ok(validateConditions({ ...defaultConditions, wind: ['strong'] }).length);
  assert.ok(validateConditions({ ...defaultConditions, location: ['outside'] }).length);
  assert.ok(validateItem({ ...item, warmth: ['warm'] }).length);
  assert.ok(validateItem({ ...item, rain: ['yes'] }).length);
});

test('a late photo analysis cannot recreate a deleted item or overwrite a manual edit', async () => {
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  const pending = { ...item, category: 'unknown' as const, analysisStatus: 'waiting' as const };
  const metadata = sanitizePhotoMetadata({ name: 'AI рубашка', category: 'top', color: 'Белый' });
  await store.putItem(pending, new Blob(['photo']));
  await store.deleteItem(pending.id);
  assert.equal(await store.applyPhotoMetadata(pending.id, metadata), undefined);
  assert.deepEqual(await store.listItems(), []);
  await store.putItem({ ...item, analysisStatus: 'done' }, new Blob(['photo']));
  assert.equal(await store.applyPhotoMetadata(item.id, metadata), undefined);
  assert.equal((await store.listItems())[0].name, 'Белая рубашка');
  store.close();
});

test('manual description edits are protected even when category is still unknown', async () => {
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  const metadata = sanitizePhotoMetadata({ name: 'AI рубашка', category: 'top', color: 'Белый' });
  await store.putItem({ ...item, name: 'Моя вещь', category: 'unknown', analysisStatus: 'waiting', metadataRevision: 1 }, new Blob(['photo']));
  assert.equal(await store.applyPhotoMetadata(item.id, metadata, 0), undefined);
  assert.equal((await store.listItems())[0].name, 'Моя вещь');
  assert.equal((await store.applyPhotoMetadata(item.id, metadata, 1))?.name, 'AI рубашка');
  store.close();
});

test('an unrecognized category retains a retryable status', async () => {
  const store = await openCloset(`closet-${crypto.randomUUID()}`);
  await store.putItem({ ...item, category: 'unknown', analysisStatus: 'waiting' }, new Blob(['photo']));
  const updated = await store.applyPhotoMetadata(item.id, { name: 'Вещь', category: 'unknown', color: 'Не определён' });
  assert.equal(updated?.analysisStatus, 'error');
  store.close();
});
