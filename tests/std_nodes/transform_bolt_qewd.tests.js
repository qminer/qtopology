"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const tb = require("../../built/std_nodes/transform_bolt");

function test(input, output, template, done) {
    let emited = [];
    let name = "some_name";
    let xdata = input;
    let xdata_out = output;
    let xstream_id = null;
    let config = {
        onEmit: (data, stream_id, callback) => {
            emited.push({ data, stream_id });
            callback();
        },
        output_template: template,
        use_qewd: true
    };
    let target = new tb.TransformBolt();
    target.init(name, config, null, (err) => {
        assert.ok(!err);
        target.receive(xdata, xstream_id, (err) => {
            assert.ok(!err);
            if (Array.isArray(template) && Array.isArray(output)) {
                assert.equal(emited.length, template.length);
                assert.deepEqual(
                    emited.map(x => x.data),
                    xdata_out);
                for (let e of emited) {
                    assert.equal(e.stream_id, xstream_id);
                }
            } else {
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata_out);
                assert.equal(emited[0].stream_id, xstream_id);
            }
            done();
        });
    });
}

function test_helper(input, output, template) {
    let target = new tb.TransformHelperQewd(template);
    let result = target.transform(input);
    assert.deepEqual(result, output);
}

describe('TransformBolt', function () {
    describe('TransformHelperQewd', function () {
        it('constructable', function () {
            let target = new tb.TransformHelperQewd({ b: "a" });
        });
        describe('single level', function () {
            it('single level 1', function () {
                test_helper(
                    { a: true },
                    { b: true },
                    { b: "{{a}}" }
                );
            });
            it('single level 2', function () {
                test_helper(
                    { a: true, x: 12, z: "abc", y: "###" },
                    { b: true, c: 12, d: "abc" },
                    { b: "{{a}}", c: "{{x}}", d: "{{z}}" }
                );
            });
        });
        describe('2-level', function () {
            it('2-level 1', function () {
                test_helper(
                    { a: true },
                    { b: { x: true } },
                    { b: { x: "{{a}}" } }
                );
            });
            it('2-level 2', function () {
                test_helper(
                    { a: true, b: "xyz", c: new Date(12345678908) },
                    { b: { x: true }, c: { r: new Date(12345678908) } },
                    { b: { x: "{{a}}" }, c: { r: "{{c}}" } }
                );
            });
        });
        describe('single level + deep', function () {
            it('single level 1', function () {
                test_helper(
                    { w: { a: true } },
                    { b: true },
                    { b: "{{w.a}}" }
                );
            });
            it('single level 2', function () {
                test_helper(
                    { a: true, t: { x: 12, z: "abc" }, y: "###" },
                    { b: true, c: 12, d: "abc" },
                    { b: "{{a}}", c: "{{t.x}}", d: "{{t.z}}" }
                );
            });
        });
        describe('csv real-life', function () {
            it('csv 1', function () {
                test_helper(
                    { ts: new Date(1526381842000), country: "SI", browser: "Chrome", amount: 123.45, duration: 432 },
                    {
                        ts: new Date(1526381842000),
                        tags: {
                            country: "SI",
                            browser: "Chrome"
                        },
                        values: {
                            amount: 123.45,
                            duration: 432
                        }
                    },
                    {
                        ts: "{{ts}}",
                        tags: {
                            country: "{{country}}",
                            browser: "{{browser}}"
                        },
                        values: {
                            amount: "{{amount}}",
                            duration: "{{duration}}"
                        }
                    }
                );
            });
        });
    });
    describe('TransformBolt', function () {
        it('constructable', function () {
            let target = new tb.TransformBolt();
        });
        it('init', function (done) {
            let emited = [];
            let name = "some_name";
            let config = {
                onEmit: (data, stream_id, callback) => {
                    emited.push({ data, stream_id });
                    callback();
                },
                output_template: { b: "a" },
                use_qewd: true
            };
            let target = new tb.TransformBolt();
            target.init(name, config, null, (err) => {
                assert.ok(!err);
                done();
            });
        });
        describe('single level', function () {
            it('single level 1', function (done) {
                test(
                    { a: true },
                    { b: true },
                    { b: "{{a}}" },
                    done
                );
            });
            it('single level 2', function (done) {
                test(
                    { a: true, x: 12, z: "abc", y: "###" },
                    { b: true, c: 12, d: "abc" },
                    { b: "{{a}}", c: "{{x}}", d: "{{z}}" },
                    done
                );
            });
        });
        describe('2-level', function () {
            it('2-level 1', function (done) {
                test(
                    { a: true },
                    { b: { x: true } },
                    { b: { x: "{{a}}" } },
                    done
                );
            });
            it('2-level 2', function (done) {
                test(
                    { a: true, b: "xyz", c: new Date(12345678908) },
                    { b: { x: true }, c: { r: new Date(12345678908) } },
                    { b: { x: "{{a}}" }, c: { r: "{{c}}" } },
                    done
                );
            });
        });
        describe('single level + deep', function () {
            it('single level 1', function (done) {
                test(
                    { w: { a: true } },
                    { b: true },
                    { b: "{{w.a}}" },
                    done
                );
            });
            it('single level 2', function (done) {
                test(
                    { a: true, t: { x: 12, z: "abc" }, y: "###" },
                    { b: true, c: 12, d: "abc" },
                    { b: "{{a}}", c: "{{t.x}}", d: "{{t.z}}" },
                    done
                );
            });
        });
        describe('multi emit', function () {
            it('single level 1', function (done) {
                test(
                    { w: { a: true, q: 12 }, m: 76 },
                    [{ b: true }, { x: 12, y: 76 }],
                    [{ b: "{{w.a}}" }, { x: "{{w.q}}", y: "{{m}}" }],
                    done
                );
            });
        });
        describe('csv real-life', function () {
            it('csv 1', function (done) {
                test(
                    {
                        ts: new Date(1526381842000),
                        country: "SI",
                        browser: "Chrome",
                        amount: 123.45,
                        duration: 432 },
                    {
                        ts: new Date(1526381842000),
                        tags: {
                            country: "SI-plus",
                            browser: "Chrome-agent"
                        },
                        values: {
                            amount: 123.45,
                            duration: 432
                        }
                    },
                    {
                        ts: "{{ts}}",
                        tags: {
                            country: "{{country}}-plus",
                            browser: "{{browser}}-agent"
                        },
                        values: {
                            amount: "{{amount}}",
                            duration: "{{duration}}"
                        }
                    },
                    done
                );
            });
        });
    });
});
