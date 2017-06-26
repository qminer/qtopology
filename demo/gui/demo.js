"use strict";

let qtopology = require("../..");

class DemoStorage {

    constructor() {
        this.workers = [];
        this.topologies = [];

        this.workers.push({ name: "worker1", status: "alive", topologies_count: 3 });
        this.workers.push({ name: "worker2", status: "alive", topologies_count: 1 });
        this.workers.push({ name: "worker3", status: "dead", topologies_count: 0 });

        this.topologies.push({
            uuid: "topology.test.1",
            enabled: true,
            status: "running",
            worker: "worker1"
        });
        this.topologies.push({
            uuid: "topology.test.2",
            enabled: true,
            status: "waiting",
            worker: "worker1"
        });
        this.topologies.push({
            uuid: "test.x",
            enabled: false,
            status: "unloaded",
            worker: null
        });
        this.topologies.push({
            uuid: "test.y",
            enabled: false,
            status: "unloaded",
            worker: null
        });
        this.topologies.push({
            uuid: "test.z",
            enabled: true,
            status: "running",
            worker: "worker2"
        });
    }

    getWorkerStatus(callback) {
        callback(null, this.workers);
    }
    getTopologyStatus(callback) {
        callback(null, this.topologies);
    }
    registerTopology(uuid, config, callback) {
        callback(null, {});
    }
    disableTopology(uuid, callback) {
        callback(null, {});
    }
    enableTopology(uuid, callback) {
        callback(null, {});
    }
}


let server = new qtopology.DashboardServer();

server.init(3000, new DemoStorage(), function () {
    server.run();
});
