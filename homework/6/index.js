"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7;
Object.defineProperty(exports, "__esModule", { value: true });
const assert = __importStar(require("node:assert"));
class Link {
    constructor(value) {
        this.value = value;
        this.next = null;
        this.prev = null;
    }
    setNext(link) {
        this.next = link;
    }
    setPrev(link) {
        this.prev = link;
    }
}
class LinkedList {
    constructor() {
        this.first = null;
        this.last = null;
    }
    get values() {
        return this[Symbol.iterator]();
    }
    add(value) {
        const newLink = new Link(value);
        if (!this.first) {
            this.first = newLink;
            this.last = newLink;
        }
        if (this.last) {
            this.last.setNext(newLink);
            newLink.setPrev(this.last);
            this.last = newLink;
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
assert.equal((_a = list.first) === null || _a === void 0 ? void 0 : _a.value, 655);
assert.equal((_b = list.last) === null || _b === void 0 ? void 0 : _b.value, 655);
list.add(797);
assert.equal((_c = list.first) === null || _c === void 0 ? void 0 : _c.value, 655);
assert.equal((_d = list.last) === null || _d === void 0 ? void 0 : _d.value, 797);
assert.equal((_f = (_e = list.first) === null || _e === void 0 ? void 0 : _e.next) === null || _f === void 0 ? void 0 : _f.value, 797);
assert.equal((_h = (_g = list.last) === null || _g === void 0 ? void 0 : _g.prev) === null || _h === void 0 ? void 0 : _h.value, 655);
list.add(64);
assert.equal((_j = list.first) === null || _j === void 0 ? void 0 : _j.value, 655);
assert.equal((_k = list.last) === null || _k === void 0 ? void 0 : _k.value, 64);
assert.equal((_m = (_l = list.first) === null || _l === void 0 ? void 0 : _l.next) === null || _m === void 0 ? void 0 : _m.value, 797);
assert.equal((_p = (_o = list.last) === null || _o === void 0 ? void 0 : _o.prev) === null || _p === void 0 ? void 0 : _p.value, 797);
list.add(77);
assert.equal((_q = list.first) === null || _q === void 0 ? void 0 : _q.value, 655);
assert.equal((_r = list.last) === null || _r === void 0 ? void 0 : _r.value, 77);
assert.equal((_t = (_s = list.first) === null || _s === void 0 ? void 0 : _s.next) === null || _t === void 0 ? void 0 : _t.value, 797);
assert.equal((_v = (_u = list.last) === null || _u === void 0 ? void 0 : _u.prev) === null || _v === void 0 ? void 0 : _v.value, 64);
list.add(1);
assert.equal((_w = list.first) === null || _w === void 0 ? void 0 : _w.value, 655);
assert.equal((_x = list.last) === null || _x === void 0 ? void 0 : _x.value, 1);
assert.equal((_z = (_y = list.first) === null || _y === void 0 ? void 0 : _y.next) === null || _z === void 0 ? void 0 : _z.value, 797);
assert.equal((_1 = (_0 = list.last) === null || _0 === void 0 ? void 0 : _0.prev) === null || _1 === void 0 ? void 0 : _1.value, 77);
list.add(8990);
assert.equal((_2 = list.first) === null || _2 === void 0 ? void 0 : _2.value, 655);
assert.equal((_3 = list.last) === null || _3 === void 0 ? void 0 : _3.value, 8990);
assert.equal((_5 = (_4 = list.first) === null || _4 === void 0 ? void 0 : _4.next) === null || _5 === void 0 ? void 0 : _5.value, 797);
assert.equal((_7 = (_6 = list.last) === null || _6 === void 0 ? void 0 : _6.prev) === null || _7 === void 0 ? void 0 : _7.value, 1);
const values = [...list].map((link) => link.value);
assert.deepEqual(values, [655, 797, 64, 77, 1, 8990]);
