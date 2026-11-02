import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BoundedSkipList } from '../src/index.js';

const numberCompare = (a, b) => a - b;

/**
 * Deterministic pseudo-random generator for tests. It returns a fixed cycle
 * of values so that level promotion is reproducible across runs.
 */
function makeRandom(sequence) {
  let index = 0;
  return () => {
    const value = sequence[index % sequence.length];
    index += 1;
    return value;
  };
}

test('adds and reports membership', () => {
  const list = new BoundedSkipList(numberCompare);
  assert.equal(list.add(5), true);
  assert.equal(list.add(3), true);
  assert.equal(list.add(8), true);
  assert.equal(list.has(5), true);
  assert.equal(list.has(4), false);
  assert.equal(list.length, 3);
});

test('rejects duplicate values', () => {
  const list = new BoundedSkipList(numberCompare);
  assert.equal(list.add(5), true);
  assert.equal(list.add(5), false);
  assert.equal(list.length, 1);
  assert.equal(list.has(5), true);
});

test('orders values ascending', () => {
  const list = new BoundedSkipList(numberCompare, {
    random: makeRandom([0.1, 0.9, 0.2, 0.8, 0.3, 0.7]),
  });
  for (const value of [5, 3, 8, 1, 9, 2]) {
    list.add(value);
  }
  assert.deepEqual(list.toArray(), [1, 2, 3, 5, 8, 9]);
});

test('deletes existing values and reports missing ones', () => {
  const list = new BoundedSkipList(numberCompare);
  for (const value of [5, 3, 8, 1, 9, 2]) {
    list.add(value);
  }
  assert.equal(list.delete(3), true);
  assert.equal(list.delete(3), false);
  assert.equal(list.delete(100), false);
  assert.deepEqual(list.toArray(), [1, 2, 5, 8, 9]);
  assert.equal(list.length, 5);
});

test('min and max return undefined on empty list', () => {
  const list = new BoundedSkipList(numberCompare);
  assert.equal(list.min(), undefined);
  assert.equal(list.max(), undefined);
  assert.equal(list.isEmpty(), true);
});

test('min and max return the extremes', () => {
  const list = new BoundedSkipList(numberCompare);
  for (const value of [5, 3, 8, 1, 9, 2]) {
    list.add(value);
  }
  assert.equal(list.min(), 1);
  assert.equal(list.max(), 9);
});

test('handles a single element', () => {
  const list = new BoundedSkipList(numberCompare);
  list.add(42);
  assert.equal(list.min(), 42);
  assert.equal(list.max(), 42);
  assert.deepEqual(list.toArray(), [42]);
  assert.equal(list.delete(42), true);
  assert.equal(list.isEmpty(), true);
});

test('clear empties the list', () => {
  const list = new BoundedSkipList(numberCompare);
  list.add(1);
  list.add(2);
  list.clear();
  assert.equal(list.length, 0);
  assert.equal(list.isEmpty(), true);
  assert.deepEqual(list.toArray(), []);
});

test('respects the maximum level bound', () => {
  // A random function that always promotes would create an unbounded tower
  // without the maxLevel cap. The cap is what makes the structure bounded.
  const list = new BoundedSkipList(numberCompare, {
    maxLevel: 3,
    random: () => 0,
  });
  for (let i = 0; i < 20; i++) {
    list.add(i);
  }
  assert.equal(list.length, 20);
  assert.deepEqual(list.toArray(), Array.from({ length: 20 }, (_, i) => i));
  assert.ok(list.level <= 3);
});

test('supports custom comparators', () => {
  const reverse = (a, b) => b - a;
  const list = new BoundedSkipList(reverse);
  for (const value of [3, 1, 2]) {
    list.add(value);
  }
  assert.deepEqual(list.toArray(), [3, 2, 1]);
  assert.equal(list.min(), 3);
  assert.equal(list.max(), 1);
});

test('rejects invalid constructor arguments', () => {
  assert.throws(() => new BoundedSkipList(null), TypeError);
  assert.throws(() => new BoundedSkipList(numberCompare, { maxLevel: 0 }), RangeError);
  assert.throws(() => new BoundedSkipList(numberCompare, { maxLevel: 1.5 }), RangeError);
  assert.throws(() => new BoundedSkipList(numberCompare, { probability: 0 }), RangeError);
  assert.throws(() => new BoundedSkipList(numberCompare, { probability: 1 }), RangeError);
  assert.throws(() => new BoundedSkipList(numberCompare, { random: 42 }), TypeError);
});

test('maintains order after interleaved operations', () => {
  const list = new BoundedSkipList(numberCompare, {
    random: makeRandom([0.2, 0.4, 0.6, 0.8]),
  });
  for (const value of [10, 20, 30, 40, 50]) {
    list.add(value);
  }
  list.delete(30);
  list.add(25);
  list.delete(10);
  list.add(5);
  assert.deepEqual(list.toArray(), [5, 20, 25, 40, 50]);
  assert.equal(list.length, 5);
});
