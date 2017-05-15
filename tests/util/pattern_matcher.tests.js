"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const pm = require("../../built/util/pattern_matcher");

describe('PaternMatcher', function () {
    it('empty filter - empty data', function () {
        let data = {};
        let filter = {};
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('empty filter - non-empty data', function () {
        let data = { a: 4, b: "b" };
        let filter = {};
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - numeric - succeed', function () {
        let data = { a: 4, b: "b" };
        let filter = { a: 4 };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - numeric - fail', function () {
        let data = { a: 4, b: "b" };
        let filter = { a: 3 };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - string - succeed', function () {
        let data = { a: 4, b: "b" };
        let filter = { b: "b" };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string - fail', function () {
        let data = { a: 4, b: "b" };
        let filter = { b: "c" };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - string array - succeed', function () {
        let data = { a: 4, b: "b" };
        let filter = { b: ["a", "b"] };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string array - fail', function () {
        let data = { a: 4, b: "c" };
        let filter = { b: ["a", "b"] };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - no such field', function () {
        let data = { a: 4, b: "b" };
        let filter = { c: "c" };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - succeed 1', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "b" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - fail 1', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "c" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - succeed 2', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "b(a|x)" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - fail 2', function () {
        let data = { a: 4, b: "1bt" };
        let filter = { b: { $like: "b(a|x)" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - succeed 3', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "[0-5]b" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - fail 3', function () {
        let data = { a: 4, b: "8ba" };
        let filter = { b: { $like: "$[0-5]b" } };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
    describe('nested fields', function () {
        it('simple filter - 1 field nested - string - succeed 1', function () {
            let data = { x: { a: 4, b: "1ba" } };
            let filter = { "x.a": 4 };
            let target = new pm.PaternMatcher(filter);
            assert.ok(target.isMatch(data));
        });
        it('simple filter - 1 field nested - string - fail - no such field', function () {
            let data = { x: { a: 4, b: "1ba" } };
            let filter = { "x.c": 4 };
            let target = new pm.PaternMatcher(filter);
            assert.ok(!target.isMatch(data));
        });
        it('simple filter - 1 field nested - string - fail - value missmatch', function () {
            let data = { x: { a: 4, b: "1ba" } };
            let filter = { "x.a": 5 };
            let target = new pm.PaternMatcher(filter);
            assert.ok(!target.isMatch(data));
        });
    });
});

