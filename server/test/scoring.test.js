import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIndicators, normalizeWeights, rank, tierOf } from '../src/scoring.js';
import { csvCell, toCsv } from '../src/csv.js';

test('normalizes weights to a unit sum', () => {
  const result = normalizeWeights({ V: 20, G: 20, D: 20, B: 20, S: 20 });
  assert.equal(result.total, 100);
  assert.equal(Object.values(result.weights).reduce((sum, value) => sum + value, 0), 1);
});

test('rejects invalid and all-zero weights', () => {
  assert.throws(() => normalizeWeights({ V: 0, G: 0, D: 0, B: 0, S: 0 }));
  assert.throws(() => normalizeWeights({ V: -1, G: 1, D: 1, B: 1, S: 1 }));
});

test('applies four tier boundaries', () => {
  assert.equal(tierOf(65, 5_000_000), 1);
  assert.equal(tierOf(65, 4_999_999), 2);
  assert.equal(tierOf(50, 0), 3);
  assert.equal(tierOf(49.99, 0), 4);
});

test('excludes incomplete and unrankable areas and handles constants', () => {
  const yearly = [];
  for (const province of [
    { province_id: 1, name_th: 'ทดสอบหนึ่ง', name_en: 'One', is_ranked: true },
    { province_id: 2, name_th: 'ทดสอบสอง', name_en: 'Two', is_ranked: true },
    { province_id: 3, name_th: 'เขตเศรษฐกิจจำเพาะ', name_en: 'Exclusive Economic Zone', is_ranked: false },
    { province_id: 4, name_th: 'ไม่ครบ', name_en: 'Incomplete', is_ranked: true },
  ]) {
    for (const year of [2022, 2023, 2024, 2025].slice(0, province.province_id === 4 ? 3 : 4)) {
      yearly.push({ ...province, year_ad: year, arrival: 100, departure: 100 });
    }
  }
  const indicators = buildIndicators(yearly, []);
  assert.deepEqual(indicators.map((row) => row.name_en), ['One', 'Two']);
  assert.equal(indicators[0].V, 50);
  assert.equal(indicators[0].G, 50);
  assert.equal(rank(indicators)[0].rank, 1);
});

test('CSV includes a UTF-8 BOM, quotes Thai text, and guards formulas', () => {
  assert.equal(csvCell('ไทย,ทดสอบ'), '"ไทย,ทดสอบ"');
  assert.equal(csvCell('=1+1'), `"'=1+1"`);
  assert.ok(toCsv([{ name: 'name', label: 'ชื่อ' }], [{ name: 'ท่าเรือ' }]).startsWith('﻿'));
});
