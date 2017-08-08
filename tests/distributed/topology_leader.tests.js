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
        let getLeadershipStatus_called = false;
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called = true;
                cb(null, { leadership: "ok" });
            }
        };
        let target = new tl.TopologyLeader("name1", mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(getLeadershipStatus_called);
                done();
            });
        }, 1000);
    });
    it('run - leader pending', function (done) {
        let target_name = "name1";
        let getLeadershipStatus_called = false;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called = true;
                cb(null, { leadership: "pending" });
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null, []);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(getLeadershipStatus_called);
                assert.equal(announceLeaderCandidacy_name, target_name);
                done();
            });
        }, 1000);
    });
    it('run - no leader', function (done) {
        let target_name = "name1";
        let getLeadershipStatus_called = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called++;
                cb(null, { leadership: (getLeadershipStatus_called <= 1 ? "ok" : "vacant") });
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null, []);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(getLeadershipStatus_called >= 1);
                assert.equal(announceLeaderCandidacy_name, target_name);
                done();
            });
        }, 1000);
    });
    it('run - no leader, 1 worker, 0 topologies', function (done) {
        let target_name = "name1";
        let getLeadershipStatus_called = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called++;
                cb(null, { leadership: (getLeadershipStatus_called <= 1 ? "ok" : "vacant") });
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null, [{ name: "w1", status: "alive" }]);
            },
            getTopologyStatus: (cb) => {
                cb(null, []);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(getLeadershipStatus_called >= 1);
                assert.equal(announceLeaderCandidacy_name, target_name);
                done();
            });
        }, 1000);
    });
    it('run - no leader, 1 worker, 1 disabled topology', function (done) {
        let target_name = "name1";
        let getLeadershipStatus_called = 0;
        let announceLeaderCandidacy_name = null;
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called++;
                cb(null, { leadership: (getLeadershipStatus_called <= 1 ? "ok" : "vacant") });
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null, [{ name: "w1", status: "alive" }]);
            },
            getTopologyStatus: (cb) => {
                cb(null, [
                    { name: "", status: "stopped", worker: null, weight: 1, affinity: [], enabled: false }
                ]);
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(getLeadershipStatus_called >= 1);
                assert.equal(announceLeaderCandidacy_name, target_name);
                done();
            });
        }, 1000);
    });
    it('run - no leader, 1 worker, 1 enabled topology', function (done) {
        let target_name = "name1";
        let worker_name = target_name; //"wrkr1";
        let getLeadershipStatus_called = 0;
        let announceLeaderCandidacy_name = null;
        let topology_record = {
            uuid: "uuid1", status: "unassigned", worker: null,
            weight: 1, affinity: [], enabled: true
        };
        let mock_storage = {
            getLeadershipStatus: (cb) => {
                getLeadershipStatus_called++;
                cb(null, { leadership: (getLeadershipStatus_called <= 1 ? "ok" : "vacant") });
            },
            announceLeaderCandidacy: (name, cb) => {
                announceLeaderCandidacy_name = name;
                cb();
            },
            checkLeaderCandidacy: (name, cb) => {
                cb(null, { isLeader: true });
            },
            getWorkerStatus: (cb) => {
                cb(null, [{ name: worker_name, status: "alive", lstatus: "leader" }]);
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
            sendMessageToWorker: (wrkr, cmd, content, cb) => {
                assert.equal(wrkr, worker_name);
                assert.equal(cmd, "start");
                assert.deepEqual(content, {uuid: topology_record.uuid});
                cb();
            }
        };
        let target = new tl.TopologyLeader(target_name, mock_storage, 100);
        target.run();
        setTimeout(() => {
            target.shutdown((err) => {
                assert.ok(!err);
                assert.ok(getLeadershipStatus_called >= 1);
                assert.equal(announceLeaderCandidacy_name, target_name);
                assert.equal(topology_record.worker, worker_name);
                done();
            });
        }, 1000);
    });
});
