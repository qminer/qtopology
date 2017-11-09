"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const log = require("../../built/util/logger");
log.logger().setLevel("none");
const tlp = require("../../built/distributed/topology_local_proxy");
const bb = require("../helpers/bad_bolt.js");
const bs = require("../helpers/bad_spout.js");
const intf = require("../../built/topology_interfaces");

let topology_json = {
    "general": {
        "uuid": "top1",
        "heartbeat": 10000,
        "wrapper": {
            "log_level": "none",
            "ping_timeout": 20000,
            "ping_interval": 3000
        },
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
const EventEmitter = require('events');

class MockChild extends EventEmitter {
    constructor() {
        super();
        this.sends = [];
        this.pid = 1;
        this.killed = false;
    }
    kill() { this.killed = true; }
    send(obj) { this.sends.push(obj); }
}

let child_process = {
    fork: () => { return new MockChild(); }
}

// Cb returns a "callback" cb that remembers the last argument
// when called. An exception to this is an argument "getLastException"
// that is used to return the last stored argument: cb("getLastException").
let Cb = function () {
    let lastExcepion = null;
    return function (e) {
        if (e != "getLastException") {
            lastExcepion = e;
        }
        return lastExcepion;
    }
};

describe('local proxy', function () {
    describe('Construction', function () {
        it('should be constructable', function (done) {
            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback, child_process
            );
            done();
        });
    });
    describe('Initialization', function () {
        it('should initialize', function (done) {
            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback, child_process
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", { general: {} }, (e) => {
                // this will be called when { cmd: intf.ChildMsgCode.response_init } is received
                target.child.emit("exit"); // this will clear up ping interval
                done();
            });
            target.child.emit("message", { cmd: intf.ChildMsgCode.response_init, data: { err: null } });
        });
    });
    describe('Integration: ping', function () {
        it('should result in child exiting after not receiving a ping from the parent', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                },
                inputs: []
            };
            top_config.bolts.push(config);
            top_config.general.wrapper.ping_interval = 10;
            top_config.general.wrapper.ping_timeout = 30;

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.equal(e, null); // should succeed
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.notEqual(e, null);
                    assert(target.hasExited());
                    assert.equal(target.exitCode(), intf.ChildExitCode.parent_ping_timeout);
                    done();
                }, 150);
            });
        });
        it('should result in killing the child after not receiving a ping response', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );

            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.equal(e, null); // should succeed
                target.pingInterval = 1;
                target.maxPingFails = 1;
                target.setPingInterval();
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.notEqual(e, null); // max unanswered pings exception
                    assert(target.hasExited()); // we killed it
                    assert(target.child.killed);
                    assert.equal(target.exitCode(), null);
                    done();
                }, 150);
            });
        });
    });
    describe('Integration: initialization', function () {
        it('should handle bad config', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                } // BAD CONFIG: missing inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.notEqual(e, null);
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.notEqual(e, null);
                    // console.error(e);
                    assert(target.hasExited());
                    assert.equal(target.exitCode(), intf.ChildExitCode.init_error);
                    done();
                }, 150); // needs more time due to 100 ms delay between sending response and exiting
            });
        });
        it('should handle bolts that throw while initializing', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: bb.badActions.throw,
                    location: bb.badLocations.init
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.notEqual(e, null);
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.notEqual(e, null);
                    // console.error(e);
                    assert(target.hasExited());
                    assert.equal(target.exitCode(), intf.ChildExitCode.init_error);
                    done();
                }, 150); // needs more time due to 100 ms delay between sending response and exiting
            });
        });
        it('should handle bolts that pass exceptions while initializing', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: bb.badActions.callbackException,
                    location: bb.badLocations.init
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.notEqual(e, null);
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.notEqual(e, null);
                    // console.error(e);
                    assert(target.hasExited());
                    assert.equal(target.exitCode(), intf.ChildExitCode.init_error);
                    done();
                }, 150); // needs more time due to 100 ms delay between sending response and exiting
            });
        });
        it('should handle calling init a second time but before init is done', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.equal(e, null); // should succeed
                setTimeout(() => {
                    // exception thrown in bolt init should get to here
                    let e = child_exit_callback('getLastException');
                    assert.equal(e, null);
                    // console.error(e);
                    target.shutdown((e) => {
                        setTimeout(() => {
                            assert(target.hasExited());
                            assert.equal(target.exitCode(), intf.ChildExitCode.exit_ok);
                            done();
                        }, 150); // needs more time due to 100 ms delay between sending response and exiting
                    })
                }, 50);
            });
            target.init("top1", top_config, (e) => {
                assert.notEqual(e, null); // shold be blocked
            });
        });
        it('should handle calling init a second time after init is done', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.equal(e, null); // should succeed
                setTimeout(() => {
                    target.init("top1", top_config, (e) => {
                        assert.notEqual(e, null); // should not succeed
                        target.shutdown((e) => {
                            setTimeout(() => {
                                assert(target.hasExited());
                                assert.equal(target.exitCode(), intf.ChildExitCode.exit_ok);
                                let e = child_exit_callback('getLastException');
                                assert.equal(e, null); // no child error
                                done();
                            }, 150); // needs more time due to 100 ms delay between sending response and exiting
                        });
                    });
                }, 50);
            });
        });
        it('should kill the child process', function (done) {
            let top_config = JSON.parse(JSON.stringify(topology_json));
            let config = {
                name: "test1",
                working_dir: "./tests/helpers",
                cmd: "bad_bolt.js",
                init: {
                    action: "",
                    location: ""
                },
                inputs: []
            };
            top_config.bolts.push(config);

            let child_exit_callback = Cb();
            let target = new tlp.TopologyLocalProxy(
                child_exit_callback
            );
            // sends intf.ParentMsgCode.init
            target.init("top1", top_config, (e) => {
                assert.equal(e, null);
                setTimeout(() => {
                    target.kill(() => {
                        assert(target.hasExited());
                        assert.equal(target.exitCode(), null);
                        let e = child_exit_callback('getLastException');
                        assert.equal(e, null);
                        assert(target.child.killed);
                        done();
                    });
                }, 50); // needs more time due to 100 ms delay between sending response and exiting
            });
        });
    });
});