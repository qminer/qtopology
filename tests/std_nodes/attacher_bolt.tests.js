"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const ab = require("../../built/std_nodes/attacher_bolt");

describe('AttacherBolt', function () {
    it('constructable', function () {
        let target = new ab.AttacherBolt();
    });
    it('init', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            extra_fields: { a: true }
        };
        let target = new ab.AttacherBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('receive', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xdata_out = { test: true, a: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            extra_fields: { a: true }
        };
        let target = new ab.AttacherBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata_out);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
    it('receive + nested extra fields', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true, tags: { a: "top" } };
        let xdata_out = { test: true, tags: { a: "top", b: "ok" }, values: { val1: 12 } };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            extra_fields: { tags: { b: "ok" }, values: { val1: 12 } }
        };
        let target = new ab.AttacherBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata_out);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
});
