"use strict";

const fs = require("fs");
const EventEmitter = require('events');
const wrkr = require("../../src/distributed/topology_worker");


class MockCoordinator extends EventEmitter {

    registerWorker(uuid) {
        console.log("registering worker", uuid);
    }

    reportTopology(uuid, status, desc) {
        console.log("reportTopology ", uuid, status, desc);
    }

    reportWorker(uuid, status, desc) {
        console.log("reportWorker ", uuid, status, desc);
    }
}

let mock_coordinator = new MockCoordinator();


let topology_def = fs.readFileSync("./topology.json", "utf8");
topology_def = JSON.parse(topology_def);

let options = {
    name: "wrkr1",
    coordinator: mock_coordinator
};

let w = new wrkr.TopologyWorker(options);
//w.start();

setTimeout(function () {
    console.log("Emitting start event");
    mock_coordinator.emit("start", { uuid: "top1", config: topology_def });
}, 1200);

setTimeout(function () {
    mock_coordinator.emit("shutdown", {});
}, 4200);
