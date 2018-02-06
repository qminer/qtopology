"use strict";

let fs = require("fs");
let qtopology = require("../..");

let dummy_topology_config = {
    general: { heartbeat: 1000 },
    spouts: [],
    bolts: [],
    variables: {}
};
let dummy_topology_config2 = JSON.parse(fs.readFileSync("topology.1.json", { encoding: "utf8" }));
let dummy_topology_config3 = JSON.parse(fs.readFileSync("topology.2.json", { encoding: "utf8" }));

let storage = new qtopology.MemoryStorage();

storage.registerWorker("worker1", () => { });
storage.registerWorker("worker2", () => { });
storage.registerWorker("worker3", () => { });
storage.registerWorker("worker4", () => { });

storage.announceLeaderCandidacy("worker1", () => {
    storage.checkLeaderCandidacy("worker1", () => { });
});
storage.setWorkerStatus("worker3", "dead", () => { });
storage.setWorkerStatus("worker4", "unloaded", () => { });

storage.registerTopology("topology.test.1", dummy_topology_config2, () => { });
storage.registerTopology("topology.test.2", dummy_topology_config3, () => { });
storage.registerTopology("topology.test.x", dummy_topology_config, () => { });
storage.registerTopology("topology.test.y", dummy_topology_config, () => { });
storage.registerTopology("topology.test.z", dummy_topology_config, () => { });

storage.enableTopology("topology.test.1", () => { });
storage.enableTopology("topology.test.2", () => { });
storage.disableTopology("topology.test.x", () => { });
storage.disableTopology("topology.test.y", () => { });
storage.enableTopology("topology.test.z", () => { });

storage.assignTopology("topology.test.1", "worker1", () => { });
storage.assignTopology("topology.test.2", "worker2", () => { });
storage.assignTopology("topology.test.z", "worker1", () => { });

storage.setTopologyStatus("topology.test.1", "worker1", "waiting", "", () => { });
storage.setTopologyStatus("topology.test.2", "worker2", "running", "", () => { });
storage.setTopologyPid("topology.test.2", 3212, () => { });
storage.setTopologyStatus("topology.test.x", "", "unassigned", "", () => { });
storage.setTopologyStatus("topology.test.y", "", "error", "Stopped manually", () => { });
storage.setTopologyStatus("topology.test.z", "worker1", "running", "", () => { });
storage.setTopologyPid("topology.test.z", 16343, () => { });

let server = new qtopology.DashboardServer();

server.initComplex(
    {
        port: 3000,
        back_title: "Back to main page",
        back_url: "/abc",
        storage: storage,
        title: "Custom dashboard title",
        custom_props: [
            { key: "Custom property 1", value: true },
            { key: "Custom property 2", value: "Some value" },
            { key: "Custom property 3", value: 542312 }
        ]
    },
    function () {
        server.run();
    });
