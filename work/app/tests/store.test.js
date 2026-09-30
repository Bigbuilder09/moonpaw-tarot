import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.js';
import * as store from '../src/store.js';

beforeEach(() => { globalThis.localStorage = fakeStorage(); });

test('a first visit gets one empty cat and default settings', () => {
  const d = store.load();
  assert.equal(d.v, 2);
  assert.equal(d.met, false);
  assert.equal(d.pets.length, 1);
  assert.equal(d.pets[0].pet, 'cat');
  assert.equal(d.activeId, d.pets[0].id);
  assert.deepEqual(d.collected, []);
  assert.deepEqual(d.streak, { last: '', count: 0, best: 0, days: 0 });
});

test('a broken save does not crash the game', () => {
  localStorage.setItem('soulmysty.v1', '{not json');
  const d = store.load();
  assert.equal(d.pets.length, 1);
});

test('save then load gives the same household back', () => {
  const d = store.load();
  d.met = true; d.pets[0].name = 'ข้าวปั้น'; d.collected = ['sun', 'cups1'];
  store.save(d);
  const again = store.load();
  assert.equal(again.pets[0].name, 'ข้าวปั้น');
  assert.deepEqual(again.collected, ['sun', 'cups1']);
});

test('an old single-pet save (v1, Moonpaw) is moved to the household format', () => {
  localStorage.setItem('moonpaw.v1', JSON.stringify({
    met: true, pet: 'dog', name: 'โมจิ', petBirthday: '2022-05-01', ownerBirthday: '1995-01-02',
    daily: { date: '2026-09-20', arts: ['sun'], revs: [false] },
    monthly: { month: '2026-09', arts: ['cups1', 'cups2', 'cups3'], revs: [false, true, false] },
    collected: ['sun', 'cups1', 'cups2', 'cups3'],
    journal: [
      { id: 'd-2026-09-20', mode: 'รายวัน', day: 20, month: 8, year: 2026, cards: ['sun'] },
      { id: 'd-2026-09-19', mode: 'รายวัน', day: 19, month: 8, year: 2026, cards: ['moon'] },
      { id: 'm-2026-09', mode: 'รายเดือน', day: 1, month: 8, year: 2026, cards: ['cups1', 'cups2', 'cups3'] }
    ]
  }));
  const d = store.load();
  assert.equal(d.v, 2);
  assert.equal(d.pets.length, 1);
  const p = d.pets[0];
  assert.equal(p.pet, 'dog');
  assert.equal(p.name, 'โมจิ');
  assert.equal(d.ownerBirthday, '1995-01-02');
  assert.deepEqual(p.done.daily, { key: '2026-09-20', arts: ['sun'], revs: [false] });
  assert.equal(p.done.monthly.key, '2026-09');
  assert.deepEqual(p.journal.map((e) => e.mk), ['daily', 'daily', 'monthly']);
  assert.ok(p.journal.every((e) => e.id.includes(p.id)), 'journal ids are tied to the pet');
  assert.equal(d.streak.days, 2, 'two different days with a daily reading');
  assert.deepEqual(d.collected, ['sun', 'cups1', 'cups2', 'cups3']);
});

test('pets that are not cats or dogs become cats (only those have readings)', () => {
  localStorage.setItem('soulmysty.v1', JSON.stringify({ v: 2, pets: [{ id: 'a', pet: 'rabbit', done: {}, journal: [] }], activeId: 'a' }));
  assert.equal(store.load().pets[0].pet, 'cat');
});

test('an unknown active pet falls back to the first pet', () => {
  localStorage.setItem('soulmysty.v1', JSON.stringify({ v: 2, pets: [{ id: 'a', pet: 'dog', done: {}, journal: [] }], activeId: 'gone' }));
  assert.equal(store.load().activeId, 'a');
});

test('clear removes both the new and the old save', () => {
  localStorage.setItem('soulmysty.v1', '{}'); localStorage.setItem('moonpaw.v1', '{}');
  store.clear();
  assert.deepEqual(localStorage.dump(), {});
});
