"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const fb = require("../../src/std_nodes/filter_bolt");

describe('FilterBolt', function () {
    it('constructable', function () {
        let target = new fb.FilterBolt();
    });
    it('init passes', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            filter: {}
        };
        let target = new fb.FilterBolt();
        target.init(name, config, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('receive - empty filter', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            filter: {}
        };
        let target = new fb.FilterBolt();
        target.init(name, config, (err) => {
            assert.ok(!err);

            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
    it('receive - non-empty filter - pass', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            filter: { test: true }
        };
        let target = new fb.FilterBolt();
        target.init(name, config, (err) => {
            assert.ok(!err);

            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 1);
                assert.deepEqual(emited[0].data, xdata);
                assert.equal(emited[0].stream_id, xstream_id);
                done();
            });
        });
    });
    it('receive - non-empty filter - block', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            },
            filter: { test: false }
        };
        let target = new fb.FilterBolt();
        target.init(name, config, (err) => {
            assert.ok(!err);

            target.receive(xdata, xstream_id, (err) => {
                assert.ok(!err);
                assert.equal(emited.length, 0);
                done();
            });
        });
    });
});
