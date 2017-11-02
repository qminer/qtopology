"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const log = require("../../built/util/logger");
log.logger().setLevel("none")
const tli = require("../../built/topology_local_inprocess");
const bb = require("../helpers/bad_bolt.js");

describe('local_inprocess: bolt errors', function () {
    describe('Construction', function () {
        it('should be constructable', function () {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            assert.equal(emits.length, 0);
            assert.equal(target.getBoltObject()._init_called, 0);
        });
        it('should throw in constructor', function () {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                subtype: bb.badActions.throw,
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            assert.throws(() => {
                let target = new tli.TopologyBoltWrapper(config);
            });
        });
    });
    describe('Initialization', function () {
        it('should pass thrown exception to callback', function () {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.init
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            let cb_called = false;
            let got_exception = false;
            target.init((e) => {
                cb_called = true;
                got_exception = (e != undefined);

            });
            assert(cb_called);
            assert(got_exception);
            assert.equal(emits.length, 0);
            assert.equal(target.getBoltObject()._init_called, 1);
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: bb.badActions.callbackException,
                    location: bb.badLocations.init
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            let cb_called = false;
            let got_exception = false;
            target.init((e) => {
                assert(e != undefined);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                done();
            });
        });
    });
    describe('Heartbeat', function () {
        it('should pass thrown exception to error callback', function () {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.heartbeat
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            target.init((e) => { });
            target.heartbeat();
            assert(onErrorCalled);
            assert.equal(emits.length, 0);
            assert.equal(target.getBoltObject()._init_called, 1);
            assert.equal(target.getBoltObject()._heartbeat_called, 1);
        });
    });
    describe('Shutdown', function () {
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.shutdown
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            target.init((e) => { });
            target.shutdown((e) => {
                assert(e != undefined);
                assert(!onErrorCalled);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._shutdown_called, 1);
                done();
            });
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.callbackException,
                    location: bb.badLocations.shutdown
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            target.init((e) => { });
            target.shutdown((e) => {
                assert(e != undefined);
                assert(!onErrorCalled);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._shutdown_called, 1);
                done();
            });
        });
    });
    describe('Receive', function () {
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.receive
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            target.init((e) => { });
            target.receive({}, null, (e) => {
                assert(e != undefined);
                assert(!onErrorCalled);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._receive_called, 1);
                done();
            });
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.callbackException,
                    location: bb.badLocations.receive
                }
            };
            let target = new tli.TopologyBoltWrapper(config);
            target.init((e) => { });
            target.receive({}, null, (e) => {
                assert(e != undefined);
                assert(!onErrorCalled);
                assert.equal(emits.length, 0);
                assert.equal(target.getBoltObject()._init_called, 1);
                assert.equal(target.getBoltObject()._receive_called, 1);
                done();
            });
        });
    });

});