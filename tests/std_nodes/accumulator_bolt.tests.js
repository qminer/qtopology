"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const async = require("async");
const ab = require("../../built/std_nodes/accumulator_bolt");

describe('accumulator_bolt', function () {
    describe('accumulator_bolt - Rec', function () {
        it('no data', function () {
            let target = new ab.Rec();
            assert.deepEqual(target.report(), { min: null, max: null, avg: null, count: 0 });
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
                    ["", { min: null, max: null, avg: null, count: 0 }]
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
            it('3 data points, different tag values', function () {
                let target = new ab.Accumulator();
                target.add(34, ["country=SI", "server=s1"]);
                target.add(38, ["country=SI", "server=s2"]);
                target.add(30, ["country=US", "server=s1"]);
                assert.deepEqual(target.report(),
                    [
                        ["", { min: 30, max: 38, avg: 34, count: 3 }],
                        ["country=SI", { min: 34, max: 38, avg: 36, count: 2 }],
                        ["country=SI.server=s1", { min: 34, max: 34, avg: 34, count: 1 }],
                        ["country=SI.server=s2", { min: 38, max: 38, avg: 38, count: 1 }],
                        ["server=s1", { min: 30, max: 34, avg: 32, count: 2 }],
                        ["server=s2", { min: 38, max: 38, avg: 38, count: 1 }],
                        ["country=US", { min: 30, max: 30, avg: 30, count: 1 }],
                        ["country=US.server=s1", { min: 30, max: 30, avg: 30, count: 1 }]
                    ]);
            });
        });
    });
    describe('accumulator_bolt - AccumulatorBolt', function () {
        it('init', function (done) {
            let target = new ab.AccumulatorBolt();
            let emitted_msgs = [];
            let onEmit = (data, stream_id, cb) => {
                emitted_msgs.push({ data, stream_id });
                cb();
            };
            async.series(
                [
                    (xcallback) => {
                        target.init("bolt1", { onEmit: onEmit, granularity: 10000 }, {}, xcallback);
                    },
                    (xcallback) => {
                        assert.equal(emitted_msgs.length, 0);
                        xcallback();
                    }
                ],
                done
            );
        });
        describe('accumulator_bolt - simple tags', function (done) {
            it('1 data point', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init("bolt1", { onEmit: onEmit, granularity: 10000 }, {}, xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: 12345678, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 0);
                            xcallback();
                        }
                    ],
                    done
                );
            });
            it('2 data points - single batch', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init("bolt1", { onEmit: onEmit, granularity: 10000 }, {}, xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: 12345678, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: 12345678 + 1, tags: { country: "SI" }, values: { amount: 125 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 0);
                            xcallback();
                        }
                    ],
                    done
                );
            });
            it('2 data points - separate batch', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let granularity = 10000;
                let ts_start = 12345678;
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init("bolt1", { onEmit: onEmit, granularity: granularity }, {}, xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start + 0.5 * granularity, tags: { country: "SI" }, values: { amount: 125 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 2);
                            assert.deepEqual(
                                emitted_msgs,
                                [
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    }
                                ]);
                            xcallback();
                        }
                    ],
                    done
                );
            });

            it('2 data points - separate batch, with 2 empty batches, not emitted', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let granularity = 10000;
                let ts_start = 12345678;
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init("bolt1", { onEmit: onEmit, granularity: granularity }, {}, xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start + 2.5 * granularity, tags: { country: "SI" }, values: { amount: 125 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 2);
                            assert.deepEqual(
                                emitted_msgs,
                                [
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    }
                                ]);
                            xcallback();
                        }
                    ],
                    done
                );
            });

            it('2 data points - separate batch, with 2 empty batches, emitted', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let granularity = 10000;
                let ts_start = 12345678;
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init(
                                "bolt1",
                                { onEmit: onEmit, granularity: granularity, emit_zero_counts: true },
                                {},
                                xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start + 2.5 * granularity, tags: { country: "SI" }, values: { amount: 125 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 6);
                            assert.deepEqual(
                                emitted_msgs,
                                [
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12350000,
                                            "name": "amount",
                                            "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12350000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12360000,
                                            "name": "amount",
                                            "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12360000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                        },
                                        "stream_id": null
                                    },
                                ]);
                            xcallback();
                        }
                    ],
                    done
                );
            });

            it('3 data points - separate batch, with 2x2 empty batches - not emitted', function (done) {
                let target = new ab.AccumulatorBolt();
                let emitted_msgs = [];
                let granularity = 10000;
                let ts_start = 12345678;
                let onEmit = (data, stream_id, cb) => {
                    emitted_msgs.push({ data, stream_id });
                    cb();
                };
                async.series(
                    [
                        (xcallback) => {
                            target.init("bolt1", { onEmit: onEmit, granularity: granularity }, {}, xcallback);
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start, tags: { country: "SI" }, values: { amount: 123 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start + 2.5 * granularity, tags: { country: "SI" }, values: { amount: 125 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            target.receive(
                                { ts: ts_start + 5.1 * granularity, tags: { country: "SI" }, values: { amount: 130 } },
                                null,
                                xcallback
                            );
                        },
                        (xcallback) => {
                            assert.equal(emitted_msgs.length, 4);
                            assert.deepEqual(
                                emitted_msgs,
                                [
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12340000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12370000,
                                            "name": "amount",
                                            "stats": { "min": 125, "max": 125, "avg": 125, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                    {
                                        "data": {
                                            "ts": 12370000,
                                            "name": "amount.country=\"SI",
                                            "stats": { "min": 125, "max": 125, "avg": 125, "count": 1 }
                                        },
                                        "stream_id": null
                                    },
                                ]);
                            xcallback();
                        }
                    ],
                    done
                );
            });
        });
        it('3 data points - separate batch, with 2x2 empty batches - not emitted', function (done) {
            let target = new ab.AccumulatorBolt();
            let emitted_msgs = [];
            let granularity = 10000;
            let ts_start = 12345678;
            let onEmit = (data, stream_id, cb) => {
                emitted_msgs.push({ data, stream_id });
                cb();
            };
            async.series(
                [
                    (xcallback) => {
                        target.init(
                            "bolt1",
                            { onEmit: onEmit, granularity: granularity, emit_zero_counts: true },
                            {},
                            xcallback);
                    },
                    (xcallback) => {
                        target.receive(
                            { ts: ts_start, tags: { country: "SI" }, values: { amount: 123 } },
                            null,
                            xcallback
                        );
                    },
                    (xcallback) => {
                        target.receive(
                            { ts: ts_start + 2.5 * granularity, tags: { country: "SI" }, values: { amount: 125 } },
                            null,
                            xcallback
                        );
                    },
                    (xcallback) => {
                        target.receive(
                            { ts: ts_start + 5.1 * granularity, tags: { country: "SI" }, values: { amount: 130 } },
                            null,
                            xcallback
                        );
                    },
                    (xcallback) => {
                        assert.equal(emitted_msgs.length, 10);
                        assert.deepEqual(
                            emitted_msgs,
                            [
                                {
                                    "data": {
                                        "ts": 12340000,
                                        "name": "amount",
                                        "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12340000,
                                        "name": "amount.country=\"SI",
                                        "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12350000,
                                        "name": "amount",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12350000,
                                        "name": "amount.country=\"SI",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12360000,
                                        "name": "amount",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12360000,
                                        "name": "amount.country=\"SI",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12370000,
                                        "name": "amount",
                                        "stats": { "min": 125, "max": 125, "avg": 125, "count": 1 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12370000,
                                        "name": "amount.country=\"SI",
                                        "stats": { "min": 125, "max": 125, "avg": 125, "count": 1 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12380000,
                                        "name": "amount",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                                {
                                    "data": {
                                        "ts": 12380000,
                                        "name": "amount.country=\"SI",
                                        "stats": { "min": null, "max": null, "avg": null, "count": 0 }
                                    },
                                    "stream_id": null
                                },
                            ]);
                        xcallback();
                    }
                ],
                done
            );
        });
    });
});
