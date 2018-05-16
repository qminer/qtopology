"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const ab = require("../../built/std_nodes/accumulator_bolt");

describe('accumulator_bolt - Rec', function () {
    it('no data', function () {
        let target = new ab.Rec();
        assert.deepEqual(target.report(), { min: Number.MAX_VALUE, max: Number.MIN_VALUE, avg: 0, count: 0 });
    });
    it('1 data point', function () {
        let target = new ab.Rec();
        target.add(34);
        assert.deepEqual(target.report(), { min: 34, max: 34, avg: 34, count: 1 });
    });
    it('2 data points', function () {
        let target = new ab.Rec();
        target.add(34);
        target.add(38);
        assert.deepEqual(target.report(), { min: 34, max: 38, avg: 36, count: 2 });
    });
});
describe('accumulator_bolt - Accumulator', function () {
    it('no data', function () {
        let target = new ab.Accumulator();
        assert.deepEqual(target.report(),
            [
                ["", { min: Number.MAX_VALUE, max: Number.MIN_VALUE, avg: 0, count: 0 }]
            ]);
    });
    describe('accumulator_bolt - no tags', function () {
        it('1 data point', function () {
            let target = new ab.Accumulator();
            target.add(34, []);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 34, avg: 34, count: 1 }]
                ]);
        });
        it('2 data points', function () {
            let target = new ab.Accumulator();
            target.add(34, []);
            target.add(38, []);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 38, avg: 36, count: 2 }]
                ]);
        });
    });
    describe('accumulator_bolt - 1 tag', function () {
        it('1 data point', function () {
            let target = new ab.Accumulator();
            target.add(34, ["country=SI"]);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["country=SI", { min: 34, max: 34, avg: 34, count: 1 }]
                ]);
        });
        it('2 data points', function () {
            let target = new ab.Accumulator();
            target.add(34, ["country=SI"]);
            target.add(38, ["country=SI"]);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["country=SI", { min: 34, max: 38, avg: 36, count: 2 }]
                ]);
        });
    });
    describe('accumulator_bolt - 2 tags', function () {
        it('1 data point', function () {
            let target = new ab.Accumulator();
            target.add(34, ["country=SI", "server=s1"]);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["country=SI", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["country=SI.server=s1", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["server=s1", { min: 34, max: 34, avg: 34, count: 1 }]
                ]);
        });
        it('2 data points', function () {
            let target = new ab.Accumulator();
            target.add(34, ["country=SI", "server=s1"]);
            target.add(38, ["country=SI", "server=s1"]);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["country=SI", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["country=SI.server=s1", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["server=s1", { min: 34, max: 38, avg: 36, count: 2 }]
                ]);
        });
        it('2 data points, different tag values', function () {
            let target = new ab.Accumulator();
            target.add(34, ["country=SI", "server=s1"]);
            target.add(38, ["country=SI", "server=s2"]);
            assert.deepEqual(target.report(),
                [
                    ["", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["country=SI", { min: 34, max: 38, avg: 36, count: 2 }],
                    ["country=SI.server=s1", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["country=SI.server=s2", { min: 38, max: 38, avg: 38, count: 1 }],
                    ["server=s1", { min: 34, max: 34, avg: 34, count: 1 }],
                    ["server=s2", { min: 38, max: 38, avg: 38, count: 1 }]
                ]);
        });
    });
});
