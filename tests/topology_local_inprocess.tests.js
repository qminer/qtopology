"use strict";

const assert = require("assert");
const tli = require("../src/topology_local_inprocess");


describe('TopologyBoltInproc', function () {
    describe('Construction', function () {
        it('Must be constructable', function () {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "test_inproc.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    some: "data"
                }
            };
            let target = new tli.TopologyBoltInproc(config);
            assert.equal(target._child._init_called, 0);
        });
        it('Init should be properly called', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "test_inproc.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    some: "data"
                }
            };
            let target = new tli.TopologyBoltInproc(config);
            target.init((err) => {
                assert.ok(err == null);
                assert.equal(target._child._init_called, 1);
                assert.equal(target._child._name, config.name);
                assert.deepEqual(target._child._init, config.init);
                done();
            });
        });
        it('Heartbeat should be properly called', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "test_inproc.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    some: "data"
                }
            };
            let target = new tli.TopologyBoltInproc(config);
            target.init((err) => {
                assert.ok(err == null);
                assert.equal(target._child._init_called, 1);
                assert.equal(target._child._name, config.name);
                assert.deepEqual(target._child._init, config.init);
                assert.equal(target._child._heartbeat_called, 0);
                target.heartbeat();
                assert.equal(target._child._heartbeat_called, 1);
                done();
            });
        });
    });
});

