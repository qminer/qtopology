"use strict";

let qtopology = require("../..");
let express = require("express");
let bodyParser = require("body-parser");

let dummy_topology_config = {
    general: { heartbeat: 1000 },
    spouts: [],
    bolts: [],
    variables: {}
};

let coordinator = new qtopology.MemoryCoordinator();

coordinator.registerWorker("worker1", () => { });
coordinator.registerWorker("worker2", () => { });
coordinator.registerWorker("worker3", () => { });
coordinator.registerWorker("worker4", () => { });

coordinator.setWorkerStatus("worker3", "dead", () => { });
coordinator.setWorkerStatus("worker4", "unloaded", () => { });

coordinator.registerTopology("topology.test.1", dummy_topology_config, () => { });
coordinator.registerTopology("topology.test.2", dummy_topology_config, () => { });
coordinator.registerTopology("topology.test.x", dummy_topology_config, () => { });
coordinator.registerTopology("topology.test.y", dummy_topology_config, () => { });
coordinator.registerTopology("topology.test.z", dummy_topology_config, () => { });

coordinator.enableTopology("topology.test.1", () => { });
coordinator.enableTopology("topology.test.2", () => { });
coordinator.disableTopology("topology.test.x", () => { });
coordinator.disableTopology("topology.test.y", () => { });
coordinator.enableTopology("topology.test.z", () => { });

coordinator.assignTopology("topology.test.1", "worker1", () => { });
coordinator.assignTopology("topology.test.2", "worker2", () => { });
coordinator.assignTopology("topology.test.z", "worker1", () => { });

coordinator.setTopologyStatus("topology.test.1", "waiting", "", () => { });
coordinator.setTopologyStatus("topology.test.2", "running", "", () => { });
coordinator.setTopologyStatus("topology.test.x", "unassigned", "", () => { });
coordinator.setTopologyStatus("topology.test.y", "error", "Stopped manually", () => { });
coordinator.setTopologyStatus("topology.test.z", "running", "", () => { });

////////////////////////////////////////////////////////

let app = express();
//app.use(bodyParser.json());
app.use(bodyParser.text({ type: "*/*" }));
app.use(bodyParser.urlencoded({ extended: true  }));

app.get('/a', function (req, res) {
    res.send('Hello World!')
})

let server = new qtopology.DashboardServer();
//server.initForExpress(app, "qtopology", coordinator, (err) => {
server.initComplex(
    {
        app: app,
        prefix: "qtopology",
        back_title: "Back to main page",
        back_url: "/abc",
        storage: coordinator,
        title: "Custom dashboard title"
    }, (err) => {    
    if (err) {
        console.log(err);
        process.exit(1);
    }
    app.listen(3000, () => {
        console.log("Express running on port " + 3000);
    });
});
