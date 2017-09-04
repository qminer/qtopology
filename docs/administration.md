# Administration of distributed workers and topologies

Administration of coordination storage that controls distributed processing can be done via command-line or web-based interface.

Both these interfaces are available out-of-the-box, but need specific storage implementation to run on.

## CLI

 QTopology CLI usage:

- `node myscript.js help` - displays a list of available commands
- `node myscript.js register <uuid> <file_name>` - registers new topology
- `node myscript.js enable <topology_uuid>` - enables topology
- `node myscript.js disable <topology_uuid>` - disables topology
- `node myscript.js stop-topology <topology_uuid>` - stops and disables topology
- `node myscript.js clear-topology-error <topology_uuid>` - clears error flag for topology
- `node myscript.js shut-down-worker <worker_name>` - sends shutdown signal to specified worker
- `node myscript.js workers` - display a list of all workers
- `node myscript.js list` - display a list of all registered topologies
- `node myscript.js details <topology_uuid>` - display details about given topology
- `node myscript.js export <topology_uuid> <output_file>` - export topology definition to destination file


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

## REPL

It is also possible to start REPL mode of CLI tool - it accepts exactly the same commands as the CLI-mode above (without the `node myscript.js` prefix):

`````````javascript
"use strict";

const qtopology = require("qtopology");
const coor = require("my-custom-storage-implementation");

// instantiate custom storage implementation
let coordinator = new coor.MyCustomCoordinator();

// run CLI tool on it in REPL mode
qtopology.runRepl(coordinator);
`````````

An example that is provided in the demo directory:

````````````
$ node demo-repl.js

Welcome to QTopology REPL.
Type 'help' to display the list of commands

repl > list
topology.test.1 (enabled: enabled) (status: waiting) (worker: worker1)
topology.test.2 (enabled: enabled) (status: running) (worker: worker2)
topology.test.x (enabled: disabled) (status: unassigned) (worker: null)
topology.test.y (enabled: disabled) (status: error) (worker: null)
topology.test.z (enabled: enabled) (status: running) (worker: worker1)

repl >
````````````

## GUI

A web application that displays all current information about workers and topologies.
It also provides means to perform some actions like enabling/disabling topologies and shutting down workers.

### Stand-alone web server

Web GUI tool has to be attached to specific implementation, like in the following example:

```````````javascript
"use strict";

const qtopology = require("qtopology");
const coor = require("my-custom-storage-implementation");

// instantiate custom storage implementation
let coordinator = new coor.MyCustomCoordinator();

// start web server
let server = new qtopology.DashboardServer();
server.init(3000, coordinator,  () => {
    server.run();
});

```````````

### Attaching to an Express server

The same web pages can be served inside existing Express web application,
under some predefined sub-path, e.g. `/qtopology/`.

```````````javascript
"use strict";

const qtopology = require("qtopology");
const express = require("express");
const coor = require("my-custom-storage-implementation");

// instantiate custom storage implementation
let coordinator = new coor.MyCustomCoordinator();

// start Express web server
let app = express();
app.use(bodyParser.text({type:"*/*"}));

// start dashboard server with express server
let server = new qtopology.DashboardServer();
server.initForExpress(app, "qtopology", coordinator,  () => {
    if (err) {
        console.log(err);
        process.exit(1);
    }
    // ok, paths injected into Express application
    // start serving requests
    app.listen(3000, () => {
        console.log("Express server running...");
    })
});

```````````

Open web address `http://localhost:3000/qtopology/` in your browser.

> Express application needs to use text or JSON body-parser. See code above.
