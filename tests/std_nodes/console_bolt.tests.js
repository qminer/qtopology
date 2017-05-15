"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const cb = require("../../built/std_nodes/console_bolt");

describe('ConsoleBolt', function () {
    it('constructable', function () {
        let target = new cb.ConsoleBolt();
    });
    it('init passes', function (done) {
        let emited = [];
        let name = "some_name";
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            }
        };
        let target = new cb.ConsoleBolt();
        target.init(name, config, null, (err) => {
            assert.ok(!err);
            done();
        });
    });
    it('receive - must pass through', function (done) {
        let emited = [];
        let name = "some_name";
        let xdata = { test: true };
        let xstream_id = null;
        let config = {
            onEmit: (data, stream_id, callback) => {
                emited.push({ data, stream_id });
                callback();
            }
        };
        let target = new cb.ConsoleBolt();
        target.init(name, config, null, (err) => {
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
});
