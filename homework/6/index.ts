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

list.add(1);
list.add(2);
list.add(3);

for (const { value } of list) {
  console.log(value);
}
