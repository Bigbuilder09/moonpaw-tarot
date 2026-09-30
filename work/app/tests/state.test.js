// Streaks, once-per-period locks and the card content, tested on the shared state module.
import { test, before, beforeEach, after, mock } from 'node:test';
import assert from 'node:assert/strict';
import { fakeStorage } from './helpers.js';

globalThis.localStorage = fakeStorage(); // state.js loads the save as soon as it is imported
const st = await import('../src/state.js');
const { ARTS } = await import('../src/data.js');
const { D, markDay, liveStreak, doneFor, periodKey, P } = st;

const at = (iso) => mock.timers.setTime(new Date(iso).getTime());

before(() => mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-10T09:00:00').getTime() }));
after(() => mock.timers.reset());
beforeEach(() => { D.streak = { last: '', count: 0, best: 0, days: 0 }; P().done = {}; });

test('the first daily reading starts a streak of 1', () => {
  at('2026-09-10T09:00:00');
  assert.equal(markDay(), true);
  assert.deepEqual(D.streak, { last: '2026-09-10', count: 1, best: 1, days: 1 });
});

test('opening twice on the same day counts once', () => {
  at('2026-09-10T09:00:00'); markDay();
  at('2026-09-10T23:59:00');
  assert.equal(markDay(), false);
  assert.equal(D.streak.count, 1);
  assert.equal(D.streak.days, 1);
});

test('days in a row grow the streak, across a month end too', () => {
  for (const d of ['2026-09-29', '2026-09-30', '2026-10-01']) { at(d + 'T08:00:00'); markDay(); }
  assert.equal(D.streak.count, 3);
  assert.equal(D.streak.best, 3);
  assert.equal(D.streak.days, 3);
});

test('a missed day restarts the streak but keeps the best and the total', () => {
  for (const d of ['2026-09-01', '2026-09-02', '2026-09-03']) { at(d + 'T08:00:00'); markDay(); }
  at('2026-09-05T08:00:00'); markDay();
  assert.equal(D.streak.count, 1);
  assert.equal(D.streak.best, 3);
  assert.equal(D.streak.days, 4);
});

test('the live streak shows until the end of the next day, then drops to 0', () => {
  at('2026-09-10T08:00:00'); markDay();
  at('2026-09-11T22:00:00'); assert.equal(liveStreak(), 1);
  at('2026-09-12T00:01:00'); assert.equal(liveStreak(), 0);
});

test('the daily reading locks for the rest of the day and opens again at midnight', () => {
  at('2026-09-10T20:00:00');
  P().done.daily = { key: periodKey('daily'), arts: ['sun'], revs: [false] };
  assert.ok(doneFor('daily'));
  at('2026-09-11T00:00:01');
  assert.equal(doneFor('daily'), null);
});

test('the monthly reading locks until the 1st of next month', () => {
  at('2026-09-02T10:00:00');
  P().done.monthly = { key: periodKey('monthly'), arts: ['sun', 'moon', 'star'], revs: [] };
  at('2026-09-30T23:00:00'); assert.ok(doneFor('monthly'));
  at('2026-10-01T00:00:01'); assert.equal(doneFor('monthly'), null);
});

test('the ten-card spread opens again 24 hours later', () => {
  at('2026-09-10T12:00:00');
  P().done.celtic = { key: 'x', at: Date.now(), arts: [], revs: [] };
  at('2026-09-11T11:59:00'); assert.ok(doneFor('celtic'));
  at('2026-09-11T12:00:01'); assert.equal(doneFor('celtic'), null);
});

test('every one of the 78 cards has a reading for cats and dogs, both ways up, and an album meaning', async () => {
  await st.loadContent();
  assert.equal(ARTS.length, 78);
  for (const sp of ['cat', 'dog']) {
    P().pet = sp;
    for (const a of ARTS) for (const rev of [false, true]) {
      const r = st.R(a, rev);
      for (const k of ['th', 'key', 'what', 'mean', 'adv']) assert.ok(r[k], `${sp} ${a} ${rev ? 'reversed' : 'upright'} is missing ${k}`);
    }
  }
  for (const a of ARTS) assert.equal((st.MEANING[a] || []).length, 3, `album meaning for ${a}`);
});
