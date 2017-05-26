"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const fe = require("../../built/util/freq_estimator");

describe('EventFrequencyScore', function () {
    describe('simple tests', function () {
        it('no data', function () {
            let d = new Date();
            let obj = new fe.EventFrequencyScore(1);
            assert.equal(obj.getEstimate(d), 0);
        });
        it('single data point', function () {
            let d = new Date();
            let obj = new fe.EventFrequencyScore(1);
            assert.equal(obj.add(d), 1);
        });
        it('two simutaneous data points', function () {
            let d = new Date();
            let obj = new fe.EventFrequencyScore(1);
            assert.equal(obj.add(d), 1);
            assert.equal(obj.add(d), 2);
        });
    });
    describe('no-so-simple tests', function () {
        it('constant influx - above', function () {
            let c = 10 * 60 * 1000;
            let obj = new fe.EventFrequencyScore(c);
            let dx = Date.now();
            for (let i = 0; i < 100; i++) {
                dx += c;
                let d = new Date(dx);
                //console.log(d, obj.add(d));
                obj.add(d);
            }
            assert.ok(obj.getEstimate(new Date(dx)) > 10);
        });
        it('constant influx - below', function () {
            let c = 11 * 60 * 1000;
            let obj = new fe.EventFrequencyScore(c - 1 * 60 * 1000);
            let dx = Date.now();
            for (let i = 0; i < 100; i++) {
                dx += c;
                let d = new Date(dx);
                //console.log(d, obj.add(d));
                obj.add(d);
            }
            assert.ok(obj.getEstimate(new Date(dx)) < 10);
        });
    });
});
