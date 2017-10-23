"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const async = require("async");
const tli = require("../built/topology_local_inprocess");

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
            assert.equal(emits.length, 0);
            assert.equal(target.getBoltObject()._init_called, 0);
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
                assert.ok(!err);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._name, config.name);
                assert.deepEqual(target.getBoltObject()._init, config.init);
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
                assert.ok(!err);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._name, config.name);
                assert.deepEqual(target.getBoltObject()._init, config.init);
                assert.equal(target.getBoltObject()._heartbeat_called, 0);
                target.heartbeat();
                assert.equal(target.getBoltObject()._heartbeat_called, 1);
                done();
            });
        });
        it('Simple receive - stream_id is null - no emit', function (done) {
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
            let data1 = { x: 89 };
            let data_stream1 = null;
            async.series(
                [
                    (xcallback) => {
                        target.init(xcallback);
                    },
                    (xcallback) => {
                        target.receive(data1, data_stream1, xcallback);
                    }
                ],
                (err) => {
                    assert.ok(!err);
                    assert.equal(emits.length, 0);
                    assert.equal(target.getBoltObject()._receive_list.length, 1);
                    assert.deepEqual(target.getBoltObject()._receive_list, [
                        { data: data1, stream_id: data_stream1 }
                    ]);
                    done();
                }
            );
        });
        it('Simple receive - stream_id is not null - no emit', function (done) {
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
            let data1 = { x: 89 };
            let data_stream1 = "SomeStreamId";
            async.series(
                [
                    (xcallback) => {
                        target.init(xcallback);
                    },
                    (xcallback) => {
                        target.receive(data1, data_stream1, xcallback);
                    }
                ],
                (err) => {
                    assert.ok(!err);
                    assert.equal(emits.length, 0);
                    assert.equal(target.getBoltObject()._receive_list.length, 1);
                    assert.deepEqual(target.getBoltObject()._receive_list, [
                        { data: data1, stream_id: data_stream1 }
                    ]);
                    done();
                }
            );
        });
        it('Simple receive - stream_id is null - with 1 emit', function (done) {
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
            let data1 = { x: 89 };
            let data_stream1 = null;

            let data2 = { b: "123" };
            let data_stream2 = null;

            async.series(
                [
                    (xcallback) => {
                        target.init(xcallback);
                    },
                    (xcallback) => {
                        target.getBoltObject()._setupEmit(data2, data_stream2);
                        target.receive(data1, data_stream1, xcallback);
                    }
                ],
                (err) => {
                    assert.ok(!err);
                    assert.equal(emits.length, 1);
                    assert.deepEqual(emits, [
                        { data: data2, stream_id: data_stream2 }
                    ]);
                    assert.equal(target.getBoltObject()._receive_list.length, 1);
                    assert.deepEqual(target.getBoltObject()._receive_list, [
                        { data: data1, stream_id: data_stream1 }
                    ]);
                    done();
                }
            );
        });


        it('Concurrent receive - different stream_ids', function (done) {
            this.timeout(5000);
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "test_inproc.js",
                subtype: "derived",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    some: "data"
                }
            };
            let target = new tli.TopologyBoltInproc(config);
            let data1 = { x: 89 };
            let data_stream1 = "stream1";

            let data2 = { b: "123" };
            let data_stream2 = "stream2";

            async.series(
                [
                    (xcallback) => {
                        target.init(xcallback);
                    },
                    (xcallback) => {
                        // send 2 messages in parallel
                        async.parallel(
                            [
                                (xxcallback) => {
                                    target.receive(data1, data_stream1, xxcallback);
                                },
                                (xxcallback) => {
                                    assert.equal(target.getBoltObject()._receive_list.length, 1);
                                    target.receive(data2, data_stream2, xxcallback);
                                    // inner object shouldn't have received the second message
                                    // the qtopology objects should have queued the message internally
                                    assert.equal(target.getBoltObject()._receive_list.length, 1);
                                }
                            ],
                            xcallback
                        );
                    }
                ],
                (err) => {
                    // ok, now assert both messages were received
                    assert.ok(!err);
                    assert.equal(emits.length, 0);
                    assert.equal(target.getBoltObject()._receive_list.length, 2);
                    assert.deepEqual(target.getBoltObject()._receive_list, [
                        { data: data1, stream_id: data_stream1 },
                        { data: data2, stream_id: data_stream2 }
                    ]);
                    done();
                }
            );
        });
    });
});

