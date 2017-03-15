"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const pm = require("../../src/util/pattern_matcher");

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
    it('simple filter - 1 field - string+like - succeed', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "b"} };
        let target = new pm.PaternMatcher(filter);
        assert.ok(target.isMatch(data));
    });
    it('simple filter - 1 field - string+like - fail', function () {
        let data = { a: 4, b: "1ba" };
        let filter = { b: { $like: "c"} };
        let target = new pm.PaternMatcher(filter);
        assert.ok(!target.isMatch(data));
    });
});


