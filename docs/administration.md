# Administration of distributed workers and topologies

Administration of coordination storage that controls distributed processing can be done via command-line or web-based interface.

Both these interfaces are available out-of-the-box, but need specific storage implementation to run on.

## CLI

 QTopology CLI usage:

- `node myscript.js register <uuid> <file_name>` - registers new topology
- `node myscript.js enable <topology_uuid>` - enables topology
- `node myscript.js disable <topology_uuid>` - disables topology
- `node myscript.js stop-topology <topology_uuid>` - stops and disables topology
- `node myscript.js clear-topology-error <topology_uuid>` - clears error flag for topology
- `node myscript.js shut-down-worker <worker_name>` - sends shutdown signal to specified worker

CLI tool has to be attached to specific implementation, like in the following example:

`````````javascript
"use strict";

const qtopology = require("qtopology");
const coor = require("my-custom-storage-implementation");

// instantiate custom storage implementation
let coordinator = new coor.MyCustomCoordinator();

// run CLI tool on it
let cmd = new qtopology.CommandLineHandler(coordinator);
cmd.run(() => {
    coordinator.close(() => {
        qtopology.logger().log("Done.");
     })
});

`````````
## GUI

A web application with 

Web GUI tool has to be attached to specific implementation, like in the following example:

```````````javascript
"use strict";

let qtopology = require("qtopology");
const coor = require("my-custom-storage-implementation");

// instantiate custom storage implementation
let coordinator = new coor.MyCustomCoordinator();

// run CLI tool on it
let server = new qtopology.DashboardServer();
server.init(3000, coordinator, function () {
    server.run();
});

```````````
