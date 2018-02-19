"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const cmdl = require("../../built/distributed/cli/command_line");
const log = require("../../built/util/logger");

log.logger().setLevel("error");

describe('CommandLineHandler', function () {
    it('constructable 1', function () {
        let target = new cmdl.CommandLineHandler({}, []);
    });
    it('constructable - no cmdline', function () {
        let target = new cmdl.CommandLineHandler({});
    });
    it('empty command-line', function (done) {
        let target = new cmdl.CommandLineHandler({}, []);
        target.run((err) => {
            assert.ok(err, "Error expected");
            done();
        });
    });
    it('register', function (done) {
        let tuuid = "some-topology-uuid";
        let method_called = false;
        let dummy_storage = {
            registerTopology: (uuid, config, cb) => {
                assert.equal(uuid, tuuid);
                method_called = true;
                cb();
            }
        };
        let target = new cmdl.CommandLineHandler(
            dummy_storage,
            ["register", tuuid, "./tests/distributed/dummy_topology.json"]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
    it('enable', function (done) {
        let tuuid = "some-topology-uuid";
        let method_called = false;
        let dummy_storage = {
            enableTopology: (uuid, cb) => {
                assert.equal(uuid, tuuid);
                method_called = true;
                cb();
            }
        };
        let target = new cmdl.CommandLineHandler(dummy_storage, ["enable", tuuid]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
    it('disable', function (done) {
        let tuuid = "some-topology-uuid";
        let method_called = false;
        let dummy_storage = {
            disableTopology: (uuid, cb) => {
                assert.equal(uuid, tuuid);
                method_called = true;
                cb();
            }
        };
        let target = new cmdl.CommandLineHandler(dummy_storage, ["disable", tuuid]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
    it('stop-topology', function (done) {
        let tuuid = "some-topology-uuid";
        let method_called = false;
        let dummy_storage = {
            stopTopology: (uuid, cb) => {
                assert.equal(uuid, tuuid);
                method_called = true;
                cb();
            }
        };
        let target = new cmdl.CommandLineHandler(dummy_storage, ["stop-topology", tuuid]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
    it('clear-topology-error', function (done) {
        let tuuid = "some-topology-uuid";
        let method_called = false;
        let dummy_storage = {
            getTopologyInfo: (uuid, cb) => {
                assert.equal(uuid, tuuid);
                method_called = true;
                cb(null, { status: "error" });
            },
            getWorkerStatus: (cb) => {
                cb(null, []);
            },
            setTopologyStatus:
                (uuid, worker, status, error, cb) => {
                    cb();
                }
        };
        let target = new cmdl.CommandLineHandler(dummy_storage, ["clear-topology-error", tuuid]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
    it('shut-down-worker', function (done) {
        let tname = "some-worker-name";
        let method_called = false;
        let dummy_storage = {
            sendMessageToWorker: (worker, cmd, content, valid_msec, cb) => {
                assert.equal(worker, tname);
                assert.equal(cmd, "shutdown");
                assert.deepEqual(content, {});
                method_called = true;
                cb();
            }
        };
        let target = new cmdl.CommandLineHandler(dummy_storage, ["shut-down-worker", tname]);
        target.run((err) => {
            assert.ok(method_called);
            done();
        });
    });
});
