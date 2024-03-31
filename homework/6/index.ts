import * as assert from "node:assert";

class Link<T> {
  value: T;
  next: Link<T> | null;
  prev: Link<T> | null;

  constructor(value: T) {
    this.value = value;
    this.next = null;
    this.prev = null;
  }
}

class LinkedList<T> {
  first: Link<T> | null = null;
  last: Link<T> | null = null;

  get values() {
    return this[Symbol.iterator]();
  }

  add(value: T): T {
    const newLink = new Link(value);

    if (!this.first) {
      this.first = newLink;
      this.last = newLink;
      return newLink.value;
    }

    for (const value of this.values) {
      if (!value.next) {
        value.next = newLink;
        this.last = newLink;
        newLink.prev = value;
      }
    }

    return newLink.value;
  }

  [Symbol.iterator]() {
    let cursor = this.first;

    return {
      [Symbol.iterator]() {
        return this;
      },

      next: () => {
        if (!cursor) {
          return {
            done: true,
          };
        }

        const temp = cursor;
        cursor = cursor.next;

        return {
          value: temp,
          done: false,
        };
      },
    };
  }
}

const list = new LinkedList();

list.add(655);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 655);

list.add(797);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 797);
assert.equal(list.first?.next?.value, 797);
assert.equal(list.last?.prev?.value, 655);

list.add(64);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 64);
assert.equal(list.first?.next?.value, 797);
assert.equal(list.last?.prev?.value, 797);

list.add(77);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 77);
assert.equal(list.first?.next?.value, 797);
assert.equal(list.last?.prev?.value, 64);

list.add(1);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 1);
assert.equal(list.first?.next?.value, 797);
assert.equal(list.last?.prev?.value, 77);

list.add(8990);
assert.equal(list.first?.value, 655);
assert.equal(list.last?.value, 8990);
assert.equal(list.first?.next?.value, 797);
assert.equal(list.last?.prev?.value, 1);

const values = [...list].map((link) => link.value);
assert.deepEqual(values, [655, 797, 64, 77, 1, 8990]);
