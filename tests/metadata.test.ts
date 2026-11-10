import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePhotoMetadata } from '../src/domain';
test('recognized description preserves only validated clothing attributes, never model ids or photo URLs', () => {
  const actual = sanitizePhotoMetadata({ name: ' Белая рубашка ', category: 'top', color: 'Белый', warmth: 'light', heel: 'no', styles: ['smart'], id: 'attack', imageUri: 'https://other.example/photo', rain: 'yes', wind: 'yes' });
  assert.equal(actual.name, 'Белая рубашка');
  assert.equal(actual.category, 'top');
  assert.ok(!('id' in actual)); assert.ok(!('imageUri' in actual));
  assert.equal(actual.rain, 'unknown', 'a photograph cannot certify waterproofness');
  assert.equal(actual.wind, 'unknown');
});
test('invalid metadata refuses to replace a saved original description', () => {
  assert.throws(() => sanitizePhotoMetadata({ name: 'Вещь', category: 'rocket', color: 'Белый' }));
  assert.throws(() => sanitizePhotoMetadata({ name: '', category: 'top', color: 'Белый' }));
});
test('a blazer belongs to outerwear, with canonical colour and no footwear attributes', () => {
  const result = sanitizePhotoMetadata({ name: 'Пиджак', category: 'outer', color: ' черный ', heel: 'yes' });
  assert.equal(result.category, 'outer');
  assert.equal(result.color, 'Чёрный');
  assert.equal(result.heel, 'unknown');
});
