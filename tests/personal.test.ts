import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateConditions, defaultConditions, type Item } from '../src/domain';
import { generateOutfits } from '../src/outfits';
const item = (id: string, category: Item['category'], styles: ('casual' | 'business' | 'smart' | 'sport')[] = ['casual']): Item => ({ id, category, styles, name: id, color: 'Бежевый', season: ['all'], warmth: 'medium', rain: 'no', wind: 'no', heel: 'no', demo: false, createdAt: '2026-11-07' });
test('occasion-only selection ignores stale weather and chooses explicitly smart clothes for the theatre', () => {
  const wardrobe = [item('tee', 'top'), item('jeans', 'bottom'), item('trainers', 'shoes'), item('blouse', 'top', ['smart']), item('skirt', 'bottom', ['smart']), item('flats', 'shoes', ['smart'])];
  const result = generateOutfits(wardrobe, { ...defaultConditions, useWeather: false, temperature: -20, rain: true, wind: 'strong', occasion: 'В театр с подругой' });
  assert.ok(result.outfits.length >= 1);
  assert.deepEqual(new Set(result.outfits[0].itemIds), new Set(['blouse', 'skirt', 'flats']));
  assert.match(result.outfits[0].conditions.occasion,/театр/i);
});
test('business occasion ranks available clothes without refusing a casual wardrobe', () => {
  const wardrobe = [item('tee', 'top'), item('jeans', 'bottom'), item('trainers', 'shoes')];
  assert.equal(generateOutfits(wardrobe, { ...defaultConditions, useWeather: false, occasion: 'Магазин' }).outfits.length, 1);
  const business = generateOutfits(wardrobe, { ...defaultConditions, useWeather: false, occasion: 'Деловая встреча' });
  assert.ok(business.outfits.length > 0);
  assert.equal(business.missing.length,0);
});
test('unknown occasions do not prevent a best available outfit', () => {
  assert.ok(validateConditions({ ...defaultConditions, useWeather: false, occasion: '' }).length);
  const wardrobe = [item('tee', 'top'), item('jeans', 'bottom'), item('trainers', 'shoes')];
  const unknown = generateOutfits(wardrobe, { ...defaultConditions, useWeather: false, occasion: 'На мероприятие у Кати' });
  assert.ok(unknown.outfits.length > 0);
  assert.equal(unknown.missing.length,0);
});
test('all wardrobe items are ranked before choosing combinations, including a late warmer item', () => {
  const wardrobe = Array.from({ length: 500 }, (_, i) => ({ ...item(`top-${i}`, 'top'), color: 'Розовый' }));
  wardrobe.push({ ...item('last-warm', 'top'), warmth: 'warm' });
  wardrobe.push(item('bottom', 'bottom'), item('shoes', 'shoes'), { ...item('coat', 'outer'), warmth: 'warm' });
  const result = generateOutfits(wardrobe, { ...defaultConditions, temperature: 2 });
  assert.ok(result.outfits[0].itemIds.includes('last-warm'));
});
