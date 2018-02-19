"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const tl = require("../../built/distributed/topology_leader");

describe('TopologyLeader', function () {
    this.timeout(20000);
    it('constructable', function () {
        let target = new tl.TopologyLeader("name1", {});
    });
    it('run - leader established', function (done) {
        let setWorkerLStatus_called = false;
        let mock_storage = {
            getWorkerStatus: (cb) => {
                cb(null, [{ name: "name1", status: "alive", lstatus: "leader", last_ping: Date.now() }]);
            },
            getTopologyStatus: (cb) => {
                cb(null, []);
            }
        };
        let target = new tl.TopologyLeader("name1", mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.ok(!err);
            assert.equal(setWorkerLStatus_called, false);
            done();
        });
    });
    it('run - leader pending', function (done) {
        let target_name = "name1";
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getWorkerStatus: (cb) => {
                cb(null, [{ name: target_name, status: "alive", lstatus: "pending", last_ping: Date.now() }]);
            },
            getTopologyStatus: (cb) => {
                cb(null, []);
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null,
                    [{ name: target_name, status: "alive", lstatus: "normal" }]
                );
            },
            setWorkerStatus: (name, status, cb)=> {
                assert(name, target_name);
                cb();
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.equal(announceLeaderCandidacy_name, target_name);
            done();
        });
    });
    it('run - no leader', function (done) {
        let target_name = "name1";
        let counter = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getWorkerStatus: (cb) => {
                cb(null, [{ name: target_name, status: "alive", lstatus: (counter++ == 0 ? "leader" : "normal"), last_ping: Date.now() }]);
            },
            getTopologyStatus: (cb) => {
                cb(null, []);
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.ok(!err);
            target.singleLoopStep((err) => {
                assert.ok(!err);
                assert.ok(counter >= 2);
                assert.equal(announceLeaderCandidacy_name, target_name);
                done();
            });
        });
    });
    it('run - no leader, 1 worker, 0 topologies', function (done) {
        let target_name = "name1";
        let counter = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getWorkerStatus: (cb) => {
                counter++;
                cb(null, [{ name: target_name, status: "alive", lstatus: (announceLeaderCandidacy_name ? "leader" : "normal"), last_ping: Date.now() }]);
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getTopologyStatus: (cb) => {
                cb(null, []);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.ok(counter >= 1);
            assert.equal(announceLeaderCandidacy_name, target_name);
            done();
        });
    });
    it('run - no leader, 1 worker, 1 disabled topology', function (done) {
        let target_name = "name1";
        let counter = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getWorkerStatus: (cb) => {
                counter++;
                cb(null, [{ name: target_name, status: "alive", lstatus: (announceLeaderCandidacy_name ? "leader" : "normal"), last_ping: Date.now() }]);
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getTopologyStatus: (cb) => {
                cb(null, [
                    { name: "", status: "stopped", worker: null, weight: 1, affinity: [], enabled: false }
                ]);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.ok(counter >= 1);
            assert.equal(announceLeaderCandidacy_name, target_name);
            done();
        });
    });
    it('run - no leader, 1 worker, 1 enabled topology', function (done) {
        let target_name = "name1";
        let worker_name = target_name;
        let counter = 0;
        let announceLeaderCandidacy_name = null;
        let topology_record = {
            uuid: "uuid1", status: "unassigned", worker: null,
            weight: 1, affinity: [], enabled: true
        };
        let mock_storage = {
            getWorkerStatus: (cb) => {
                counter++;
                cb(null, [{ name: target_name, status: "alive", lstatus: (announceLeaderCandidacy_name ? "leader" : "normal"), last_ping: Date.now() }]);
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getTopologyStatus: (cb) => {
                cb(null, [topology_record]);
            },
            assignTopology: (uuid, wrkr, cb) => {
                assert.equal(uuid, topology_record.uuid);
                topology_record.worker = wrkr;
                topology_record.status = "waiting";
                cb();
            },
            sendMessageToWorker: (wrkr, cmd, content, valid_msec, cb) => {
                assert.equal(wrkr, worker_name);
                assert.equal(cmd, "start_topologies");
                assert.deepEqual(content, { uuids: [topology_record.uuid] });
                cb();
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.singleLoopStep((err) => {
            assert.ok(!err);
            target.singleLoopStep((err) => {
                assert.ok(!err);
                assert.ok(counter >= 1);
                assert.equal(announceLeaderCandidacy_name, target_name);
                assert.equal(topology_record.worker, worker_name);
                done();
            });
        });
    });
});
