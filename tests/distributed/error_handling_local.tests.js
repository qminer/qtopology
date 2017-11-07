"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const log = require("../../built/util/logger");
//log.logger().setLevel("none");
const tl = require("../../built/topology_local");
const bb = require("../helpers/bad_bolt.js");
const bs = require("../helpers/bad_spout.js");

let topology_json = {
    "general": {
        "heartbeat": 10000,
        // each module needs to expose init(initObj, common_context, xcallback)
        "initialization": [
            {
                "disabled": true,
                "working_dir": "./tests/helpers",
                "cmd": "bad_init.js",
                "init": {}
            }
        ],
        // each module needs to expose shutdown(callback)
        "shutdown": [
            {
                "disabled": true,
                "working_dir": "./tests/helpers",
                "cmd": "bad_shutdown.js",
            }
        ]
    },
    "spouts": [],
    "bolts": [],
    "variables": {}
}

describe('local: bolt errors', function () {
    describe('Construction', function () {
        it('should be constructable', function () {
            let errors = [];
            let onError = (e) => { errors.push(e); }
            let target = new tl.TopologyLocal(onError);
            assert(errors.length == 0);
        });
    });
    describe('Initialization', function () {
        it('should pass an exception to init callback if bolt_config.inputs is missing', function (done) {
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
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                // init was not called since an exception was emitted before calling individual init functions
                assert.equal(target.bolts[0].getBoltObject()._init_called, 0);
                done();
            });
        });
        it('should pass thrown exception to callback', function (done) {
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
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                done();
            });
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
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                done();
            });
        });
    });
    describe('Heartbeat', function () {
        it('should pass thrown exception to error callback', function (done) {
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
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.general.heartbeat = 5;
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                target.run(()=>{
                    setTimeout(() => {
                        assert(initErrors.length == 0);
                        assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                        assert(errors.length == 1);
                        target.bolts[0].isError = false; // clear error for shutdown
                        target.shutdown(done);
                    }, 10)
                });
            });
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
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                target.shutdown((e) => {
                    assert(e != undefined);
                    assert(initErrors.length == 0);
                    assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                    assert.equal(target.bolts[0].getBoltObject()._shutdown_called, 1);
                    assert(errors.length == 0);
                    done();
                }, 10)
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
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                target.shutdown((e) => {
                    assert(e != undefined);
                    assert(initErrors.length == 0);
                    assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                    assert.equal(target.bolts[0].getBoltObject()._shutdown_called, 1);
                    assert(errors.length == 0);
                    done();
                }, 10)
            });
        });
    });
    describe('Redirect', function () {
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    console.log("emitting")
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.receive
                },
                inputs: [{ source: "source1"} ]
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                target.redirect("source1", {}, null, (e) => {
                    assert(e != undefined);
                    assert(!onErrorCalled);
                    assert.equal(emits.length, 0);
                    assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                    assert.equal(target.bolts[0].getBoltObject()._receive_called, 1);
                    target.shutdown((e) => {
                        assert(e != undefined); // internal error
                        done();
                    });
                })
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
                    console.log("emitting")
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bb.badActions.callbackException,
                    location: bb.badLocations.receive
                },
                inputs: [{ source: "source1"} ]
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.bolts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                target.redirect("source1", {}, null, (e) => {
                    assert(e != undefined);
                    assert(!onErrorCalled);
                    assert.equal(emits.length, 0);
                    assert.equal(target.bolts[0].getBoltObject()._init_called, 1);
                    assert.equal(target.bolts[0].getBoltObject()._receive_called, 1);
                    target.shutdown((e) => {
                        assert(e != undefined); // internal error
                        done();
                    });
                })
            });
        });
    });

});

describe('local: spout errors', function () {
    describe('Construction', function () {
        it('should be constructable', function () {
            let errors = [];
            let onError = (e) => { errors.push(e); }
            let target = new tl.TopologyLocal(onError);
            assert(errors.length == 0);
        });
        it('should throw in constructor', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                subtype: bs.badActions.throw,
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                done();
            });
        });
    });
    describe('Initialization', function () {
        it('should handle thrown exceptions in init callback', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            let msg = [];
            let errfn = log.logger().error;
            let excfn = log.logger().exception;
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                log.logger().setLevel("error");
                log.logger().error = (m)=>{ msg.push(m); }
                log.logger().exception = (m)=>{ msg.push(m); }
                throw new Error("I'm bad!");
            });
            setTimeout(()=> {
                log.logger().setLevel("none");
                log.logger().error = errfn;
                log.logger().exception = excfn;
                assert(msg[0].startsWith("THIS SHOULD NOT"));
                assert(msg[1].message.startsWith("I'm bad!"));
                target.shutdown(done);
            }, 100);
        });
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: bs.badActions.throw,
                    location: bs.badLocations.init
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                assert.equal(emits.length, 0);
                assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                done();
            });
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: bs.badActions.callbackException,
                    location: bs.badLocations.init
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 1);
                assert.equal(emits.length, 0);
                assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                done();
            });
        });
    });
    describe('Heartbeat', function () {
        it('should pass thrown exception to error callback', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: bs.badActions.throw,
                    location: bs.badLocations.heartbeat
                },
                inputs: []
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.general.heartbeat = 5;
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.run(()=>{
                    setTimeout(() => {
                        assert.equal(errors.length, 1);
                        assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                        assert.equal(target.spouts[0].getSpoutObject()._heartbeat_called, 1);
                        target.spouts[0].isError = false; // clear error for shutdown
                        target.shutdown(done);
                    }, 10)
                });
            });
        });
    });
    describe('Shutdown', function () {
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bs.badActions.throw,
                    location: bs.badLocations.shutdown
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            //log.logger().setLevel("error");
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.shutdown((e) => {
                    assert(e != undefined);
                    assert(!onErrorCalled);
                    assert.equal(emits.length, 0);
                    assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                    assert.equal(target.spouts[0].getSpoutObject()._shutdown_called, 1);
                    done();
                });
            });
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bs.badActions.callbackException,
                    location: bs.badLocations.shutdown
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            //log.logger().setLevel("error");
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.shutdown((e) => {
                    assert(e != undefined);
                    assert(!onErrorCalled);
                    assert.equal(emits.length, 0);
                    assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                    assert.equal(target.spouts[0].getSpoutObject()._shutdown_called, 1);
                    done();
                });
            });
        });
    });
    describe('Next', function () {
        it('should pass thrown exception to callback', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.spouts[0].getSpoutObject().location = bs.badLocations.next;
                target.spouts[0].getSpoutObject().action = bs.badActions.throw;
                target.run((e)=>{
                    assert(e == undefined);
                    setTimeout(()=>{
                        assert(errors.length == 1);
                        assert.equal(emits.length, 0);
                        assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                        assert.equal(target.spouts[0].getSpoutObject()._next_called, 1);
                        target.shutdown((e)=>{
                            assert(e != null); // error flag, shutdown refused
                            done();
                        });
                    }, 50);
                });
            });
        });
        it('should call callback with exception', function (done) {
            let emits = [];
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                init: {
                    action: "",
                    location: ""
                }
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.spouts[0].getSpoutObject().location = bs.badLocations.next;
                target.spouts[0].getSpoutObject().action = bs.badActions.callbackException;
                target.run((e)=>{
                    assert(e == undefined);
                    setTimeout(()=>{
                        assert(errors.length == 1);
                        assert.equal(emits.length, 0);
                        assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                        assert.equal(target.spouts[0].getSpoutObject()._next_called, 1);
                        target.shutdown((e)=>{
                            assert(e != null); // error flag, shutdown refused
                            done();
                        });
                    }, 50);
                });
            });
        });
    });
    describe('Run', function () {
        it('should pass thrown exception to error callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bs.badActions.throw,
                    location: bs.badLocations.run
                }
            };

            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.run((e)=>{
                    assert(e == undefined);
                    setTimeout(()=>{
                        assert(errors.length == 1);
                        assert.equal(emits.length, 0);
                        assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                        assert.equal(target.spouts[0].getSpoutObject()._next_called, 0);
                        target.shutdown((e)=>{
                            assert(e != null); // error flag, shutdown refused
                            done();
                        });
                    }, 50);
                });
            });
        });
    });
    describe('Pause', function () {
        it('should pass thrown exception to error callback', function (done) {
            let emits = [];
            let onErrorCalled = false;
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_spout.js",
                onEmit: (data, stream_id, callback) => {
                    emits.push({ data, stream_id });
                    callback();
                },
                onError: (e) => {
                    onErrorCalled = true;
                },
                init: {
                    action: bs.badActions.throw,
                    location: bs.badLocations.pause
                },
                timeout: 10
            };
            let errors = [];
            let onError = (e) => { errors.push(e); }
            // onError called by heartbeat or internal spout/bolt error         
            let target = new tl.TopologyLocal(onError);
            let top_config = JSON.parse(JSON.stringify(topology_json));
            top_config.spouts.push(config);
            let initErrors = [];
            target.init("top1", top_config, (e) => {
                if (e) { initErrors.push(e); }
                assert(initErrors.length == 0);
                assert.equal(emits.length, 0);
                target.run((e)=>{
                    assert(e == undefined);
                    target.pause((e)=>{
                        assert(errors.length == 1);
                        assert.equal(target.spouts[0].getSpoutObject()._init_called, 1);
                        target.shutdown((e)=>{
                            assert(e != null); // error flag, shutdown refused
                            done();
                        });
                    });
                });
            });
        });        
    });
});