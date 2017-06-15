"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const oo = require("../../built/util/object_override");

describe('object_override', function () {
    describe('same object', function () {
        it('simple test', function () {
            let source = { a: 5, b: "12" };
            let addition = { c: true };
            let expected = { a: 5, b: "12", c: true };
            let result = oo.overrideObject(source, addition, false);
            assert.deepStrictEqual(result, expected);
            source.a = "Q";
            let expected2 = { a: "Q", b: "12", c: true };
            assert.deepStrictEqual(result, expected2); // result changes, since it was not cloned
        });
        it('nested test', function () {
            let source = { a: 5, b: "12", c: { d: 12, e: 13 } };
            let addition = { c: { d: "a", f: "d" } };
            let expected = { a: 5, b: "12", c: { d: "a", e: 13, f: "d" } };
            let result = oo.overrideObject(source, addition, false);
            assert.deepStrictEqual(result, expected);
            source.c.e = "Q";
            let expected2 = { a: 5, b: "12", c: { d: "a", e: "Q", f: "d" } };
            assert.deepStrictEqual(result, expected2); // result changes, since it was not cloned
        });
        it('nested test 2', function () {
            let source = { a: 5, b: "12", c: { d: 12, e: 13 } };
            let addition = { c: { f: { g: 13 } }, values: { val1: 12 } };
            let expected = { a: 5, b: "12", c: { d: 12, e: 13, f: { g: 13 } }, values: { val1: 12 } };
            let result = oo.overrideObject(source, addition, false);
            assert.deepStrictEqual(result, expected);
            source.c.e = "Q";
            let expected2 = { a: 5, b: "12", c: { d: 12, e: "Q", f: { g: 13 } }, values: { val1: 12 } };
            assert.deepStrictEqual(result, expected2); // result changes, since it was not cloned
        });
    });
    describe('cloned object', function () {
        it('simple test', function () {
            let source = { a: 5, b: "12" };
            let addition = { c: true };
            let expected = { a: 5, b: "12", c: true };
            let result = oo.overrideObject(source, addition, true);
            assert.deepStrictEqual(result, expected);
            source.a = "Q";
            assert.deepStrictEqual(result, expected); // result remains unchanged, as it was cloned
        });
        it('nested test', function () {
            let source = { a: 5, b: "12", c: { d: 12, e: 13 } };
            let addition = { c: { d: "a", f: "d" } };
            let expected = { a: 5, b: "12", c: { d: "a", e: 13, f: "d" } };
            let result = oo.overrideObject(source, addition, true);
            assert.deepStrictEqual(result, expected);
            source.c.e = "Q";
            assert.deepStrictEqual(result, expected); // result remains unchanged, as it was cloned
        });
        it('nested test 2', function () {
            let source = { a: 5, b: "12", c: { d: 12, e: 13 } };
            let addition = { c: { f: { g: 13 } }, values: { val1: 12 } };
            let expected = { a: 5, b: "12", c: { d: 12, e: 13, f: { g: 13 } }, values: { val1: 12 } };
            let result = oo.overrideObject(source, addition, true);
            assert.deepStrictEqual(result, expected);
            source.c.e = "Q";
            assert.deepStrictEqual(result, expected); // result remains unchanged, as it was cloned
        });
    });
});
