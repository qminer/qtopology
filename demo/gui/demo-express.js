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

let storage = new qtopology.MemoryStorage();

storage.registerWorker("worker1", () => { });
storage.registerWorker("worker2", () => { });
storage.registerWorker("worker3", () => { });
storage.registerWorker("worker4", () => { });

storage.setWorkerStatus("worker3", "dead", () => { });
storage.setWorkerStatus("worker4", "unloaded", () => { });

storage.registerTopology("topology.test.1", dummy_topology_config, () => { });
storage.registerTopology("topology.test.2", dummy_topology_config, () => { });
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

storage.setTopologyStatus("topology.test.1", "waiting", "", () => { });
storage.setTopologyStatus("topology.test.2", "running", "", () => { });
storage.setTopologyStatus("topology.test.x", "unassigned", "", () => { });
storage.setTopologyStatus("topology.test.y", "error", "Stopped manually", () => { });
storage.setTopologyStatus("topology.test.z", "running", "", () => { });

////////////////////////////////////////////////////////

let app = express();
app.use(bodyParser.json());

app.get('/a', function (req, res) {
    res.send('Hello World!')
})

let server = new qtopology.DashboardServer();
server.initComplex(
    {
        app: app,
        prefix: "qtopology",
        back_title: "Back to main page",
        back_url: "/abc",
        storage: storage,
        title: "Custom dashboard title"
    }, (err) => {    
    if (err) {
        console.log(err);
        process.exit(1);
    }
    let port = 3000;
    app.listen(port, () => {
        console.log("Express running on port " + port);
        console.log(`Open http://localhost:${port}/dashboard`);
    });
});
