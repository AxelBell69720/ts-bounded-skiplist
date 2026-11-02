const DEFAULT_MAX_LEVEL = 16;
const DEFAULT_PROBABILITY = 0.5;

/**
 * Implements a bounded skiplist: an ordered set with a fixed maximum level.
 * The bound on levels keeps memory predictable and avoids unbounded tower growth
 * when the random source is adversarial or has low entropy.
 *
 * The list stores unique values. Inserting an existing value is a no-op.
 * Ordering is determined by a comparator function that returns a negative number,
 * zero, or a positive number, following the same contract as Array.prototype.sort.
 */
export class BoundedSkipList {
  /**
   * @param {(a: any, b: any) => number} comparator
   * @param {object} [options]
   * @param {number} [options.maxLevel=16] Maximum height of any node. Must be >= 1.
   * @param {number} [options.probability=0.5] Probability of promoting a node. Must be in (0, 1).
   * @param {() => number} [options.random=Math.random] Source of randomness in [0, 1).
   */
  constructor(comparator, options = {}) {
    if (typeof comparator !== 'function') {
      throw new TypeError('comparator must be a function');
    }
    const maxLevel = options.maxLevel === undefined ? DEFAULT_MAX_LEVEL : options.maxLevel;
    const probability = options.probability === undefined ? DEFAULT_PROBABILITY : options.probability;
    const random = options.random === undefined ? Math.random : options.random;

    if (!Number.isInteger(maxLevel) || maxLevel < 1) {
      throw new RangeError('maxLevel must be a positive integer');
    }
    if (typeof probability !== 'number' || probability <= 0 || probability >= 1) {
      throw new RangeError('probability must be in (0, 1)');
    }
    if (typeof random !== 'function') {
      throw new TypeError('random must be a function');
    }

    this.comparator = comparator;
    this.maxLevel = maxLevel;
    this.probability = probability;
    this.random = random;
    this.level = 0;
    this.size = 0;
    // Sentinel head node. Its value is never compared against.
    this.head = { value: undefined, next: new Array(maxLevel).fill(null) };
  }

  /**
   * Returns true if the value is present.
   * @param {any} value
   * @returns {boolean}
   */
  has(value) {
    return this._find(value) !== null;
  }

  /**
   * Inserts a value. Returns true if the value was added, false if it was already present.
   * @param {any} value
   * @returns {boolean}
   */
  add(value) {
    const update = new Array(this.maxLevel).fill(null);
    let current = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (current.next[i] !== null && this.comparator(current.next[i].value, value) < 0) {
        current = current.next[i];
      }
      update[i] = current;
    }
    const candidate = current.next[0];
    if (candidate !== null && this.comparator(candidate.value, value) === 0) {
      return false;
    }

    const nodeLevel = this._randomLevel();
    if (nodeLevel > this.level) {
      for (let i = this.level; i < nodeLevel; i++) {
        update[i] = this.head;
      }
      this.level = nodeLevel;
    }

    const node = { value, next: new Array(nodeLevel).fill(null) };
    for (let i = 0; i < nodeLevel; i++) {
      node.next[i] = update[i].next[i];
      update[i].next[i] = node;
    }
    this.size += 1;
    return true;
  }

  /**
   * Removes a value. Returns true if the value was removed, false if it was not present.
   * @param {any} value
   * @returns {boolean}
   */
  delete(value) {
    const update = new Array(this.maxLevel).fill(null);
    let current = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (current.next[i] !== null && this.comparator(current.next[i].value, value) < 0) {
        current = current.next[i];
      }
      update[i] = current;
    }
    const target = current.next[0];
    if (target === null || this.comparator(target.value, value) !== 0) {
      return false;
    }

    for (let i = 0; i < this.level; i++) {
      if (update[i].next[i] === target) {
        update[i].next[i] = target.next[i];
      }
    }
    while (this.level > 0 && this.head.next[this.level - 1] === null) {
      this.level -= 1;
    }
    this.size -= 1;
    return true;
  }

  /**
   * Returns the smallest value, or undefined if the list is empty.
   * @returns {any}
   */
  min() {
    const node = this.head.next[0];
    return node === null ? undefined : node.value;
  }

  /**
   * Returns the largest value, or undefined if the list is empty.
   * @returns {any}
   */
  max() {
    if (this.head.next[0] === null) {
      return undefined;
    }
    let current = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (current.next[i] !== null) {
        current = current.next[i];
      }
    }
    return current.value;
  }

  /**
   * Returns the values in ascending order as an array.
   * @returns {any[]}
   */
  toArray() {
    const result = [];
    let current = this.head.next[0];
    while (current !== null) {
      result.push(current.value);
      current = current.next[0];
    }
    return result;
  }

  /**
   * Returns the number of stored values.
   * @returns {number}
   */
  get length() {
    return this.size;
  }

  /**
   * Returns true if the list is empty.
   * @returns {boolean}
   */
  isEmpty() {
    return this.size === 0;
  }

  /**
   * Removes all values.
   */
  clear() {
    this.head = { value: undefined, next: new Array(this.maxLevel).fill(null) };
    this.level = 0;
    this.size = 0;
  }

  /**
   * Internal search helper. Returns the node or null.
   * @private
   */
  _find(value) {
    let current = this.head;
    for (let i = this.level - 1; i >= 0; i--) {
      while (current.next[i] !== null && this.comparator(current.next[i].value, value) < 0) {
        current = current.next[i];
      }
    }
    const candidate = current.next[0];
    if (candidate !== null && this.comparator(candidate.value, value) === 0) {
      return candidate;
    }
    return null;
  }

  /**
   * Chooses a level for a new node using the configured probability.
   * The loop is bounded by maxLevel, which is the whole point of a bounded skiplist.
   * @private
   * @returns {number}
   */
  _randomLevel() {
    let level = 1;
    while (level < this.maxLevel && this.random() < this.probability) {
      level += 1;
    }
    return level;
  }
}
