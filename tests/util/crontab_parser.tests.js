"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const ctp = require("../../built/util/crontab_parser");

describe('CronTabParser', function () {
    it('empty filter', function () {
        let target = new ctp.CronTabParser("* * * * * *");
        assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
    });
    describe('simple filter', function () {
        it('seconds', function () {
            let target = new ctp.CronTabParser("12 * * * * *");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 45, 13)));
        });
        it('minutes', function () {
            let target = new ctp.CronTabParser("* 45 * * * *");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 44, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 46, 13)));
        });
        it('hours', function () {
            let target = new ctp.CronTabParser("* * 6 * * *");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 5, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 7, 45, 13)));
        });
        it('days', function () {
            let target = new ctp.CronTabParser("* * * 1 * *");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
        });
        it('months', function () {
            let target = new ctp.CronTabParser("* * * * 1 *");
            assert.ok(target.isIncluded(new Date(2018, 0, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2017, 11, 1, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 45, 13)));
        });
        it('DoW', function () {
            let target = new ctp.CronTabParser("* * * * * 4");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
        });
    });

    describe('simple enumeration', function () {
        it('DoW', function () {
            let target = new ctp.CronTabParser("* * * * * thu");
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
        });
    });
    describe('simple range filter', function () {
        it('seconds', function () {
            let target = new ctp.CronTabParser("12-30 * * * * *");
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 45, 11)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 29)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 30)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 45, 31)));
        });
        it('minutes', function () {
            let target = new ctp.CronTabParser("* 45-52 * * * *");
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 44, 11)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 46, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 51, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 52, 13)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 6, 53, 13)));
        });
        it('hours', function () {
            let target = new ctp.CronTabParser("* * 6-18 * * *");
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 5, 45, 11)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 7, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 17, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 18, 45, 13)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 1, 19, 45, 13)));
        });
        it('days', function () {
            let target = new ctp.CronTabParser("* * * 1-5 * *");
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(target.isIncluded(new Date(2018, 1, 4, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 5, 6, 45, 13)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 6, 6, 45, 13)));
        });
        it('months', function () {
            let target = new ctp.CronTabParser("* * * * 1-9 *");
            assert.ok(!target.isIncluded(new Date(2017, 11, 1, 6, 45, 11)));
            assert.ok(target.isIncluded(new Date(2018, 0, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 7, 1, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 8, 1, 6, 45, 13)));
            assert.ok(!target.isIncluded(new Date(2018, 9, 1, 6, 45, 13)));
        });
        it('DoW', function () {
            let target = new ctp.CronTabParser("* * * * * 4-5");
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 3, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 4, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 5, 6, 45, 11)));
        });
    });

    describe('simple enumeration range', function () {
        it('DoW', function () {
            let target = new ctp.CronTabParser("* * * * * thu-sat");
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(target.isIncluded(new Date(2018, 1, 3, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 4, 6, 45, 11)));
        });
        it('DoW 2', function () {
            let target = new ctp.CronTabParser("* * * * * thu-thu");
            assert.ok(!target.isIncluded(new Date(2018, 0, 31, 6, 45, 13)));
            assert.ok(target.isIncluded(new Date(2018, 1, 1, 6, 45, 12)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 2, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 3, 6, 45, 11)));
            assert.ok(!target.isIncluded(new Date(2018, 1, 4, 6, 45, 11)));
        });
    });
});

