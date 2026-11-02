# ts-bounded-skiplist

An ordered set backed by a skiplist whose node heights are capped at a fixed maximum level.

```js
import { BoundedSkipList } from './src/index.js';

const list = new BoundedSkipList((a, b) => a - b);

list.add(5);
list.add(3);
list.add(8);

console.log(list.toArray()); // [3, 5, 8]
console.log(list.has(5));    // true
console.log(list.min(), list.max()); // 3 8

list.delete(5);
console.log(list.toArray()); // [3, 8]
```

## Why this exists

A standard skiplist lets node height grow with the number of elements. That is fine in the
common case, but it makes the worst-case memory footprint depend on the random source. If the
random source is biased, or if an attacker can influence it, the towers can grow taller than the
data warrants. This library caps every node at `maxLevel` (default 16). Search, insert, and
delete remain expected logarithmic for the supported sizes, and the memory bound is explicit.

The trade-off is that very large sets will have slightly longer search paths than an unbounded
skiplist with the same probability, because the top of the structure cannot grow past the cap.
For sets where that matters, raise `maxLevel` at construction time.

## API

### `new BoundedSkipList(comparator, options?)`

- `comparator(a, b)` returns a negative number, zero, or a positive number. It must define a
total order over the values you insert.
- `options.maxLevel` (default `16`) is the maximum height of any node. Must be a positive integer.
- `options.probability` (default `0.5`) is the chance that a node is promoted one more level.
  Must be strictly between `0` and `1`.
- `options.random` (default `Math.random`) is a function returning a number in `[0, 1)`. Pass a
deterministic function in tests to make level promotion reproducible.

### Methods

- `add(value)` returns `true` if the value was inserted, `false` if it was already present.
- `delete(value)` returns `true` if the value was removed, `false` if it was not present.
- `has(value)` returns `true` if the value is present.
- `min()` returns the smallest value, or `undefined` when empty.
- `max()` returns the largest value, or `undefined` when empty.
- `toArray()` returns all values in ascending order.
- `clear()` removes all values.
- `isEmpty()` returns `true` when the list holds no values.
- `length` is a getter for the number of stored values.

## The awkward edge

Because the structure is bounded, `maxLevel` is a hard ceiling, not a target. If you set
`maxLevel` too low relative to the number of elements, the upper levels fill up and the lower
levels carry more of the search work. The implementation still returns correct results, but the
search path lengthens. The default of `16` is a reasonable starting point for sets up to a few
hundred thousand elements.
