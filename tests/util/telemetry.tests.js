"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const tel = require("../../built/util/telemetry");

describe('Telemetry', function () {
    it('constructable', function () {
        let target = new tel.Telemetry();
    });
    it('accepts data', function () {
        let n = "some name";
        let target = new tel.Telemetry(n);

        assert.deepEqual(target.get(), { name: n, cnt: 0, avg: 0 });
        target.add(2);
        assert.deepEqual(target.get(), { name: n, cnt: 1, avg: 2 });
        target.add(4);
        assert.deepEqual(target.get(), { name: n, cnt: 2, avg: 3 });
        target.add(3);
        assert.deepEqual(target.get(), { name: n, cnt: 3, avg: 3 });
        target.add(7);
        assert.deepEqual(target.get(), { name: n, cnt: 4, avg: 4 });

        target.reset();
        assert.deepEqual(target.get(), { name: n, cnt: 0, avg: 0 });
        target.add(7);
        assert.deepEqual(target.get(), { name: n, cnt: 1, avg: 7 });
    });
});
