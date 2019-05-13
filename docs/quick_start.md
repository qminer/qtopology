# QTopology - Quick start

Define your spouts and bolts and connect them into topology. Bolts and spouts run as `inproc` objects.

## Prepare environment

`````````bash
npm init
npm install qtopology --save
`````````

## Create topology definition

Save this topology into file `topology.json`

`````````````````````````json
{
    "general": {
        "heartbeat": 1000
    },
    "spouts": [
        {
            "name": "pump1",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "my_spout.js",
            "init": {}
        }
    ],
    "bolts": [
        {
            "name": "bolt1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "my_bolt.js",
            "inputs": [
                { "source": "pump1", "stream_id": "stream1" }
            ],
            "init": {}
        }
    ],
    "variables": {}
}

`````````````````````````

## Create custom bolt

Put code for custom bolt into `my_bolt.js`

```````````````````````javascript
"use strict";

class MyBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, context, callback) {
        this._name = name;
        this._onEmit = config.onEmit;
        // use other fields from config to control your execution
        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    receive(data, stream_id, callback) {
        // process incoming data
        // possible emit new data, using this._onEmit
        console.log(data, stream_id);
        callback();
    }
}

exports.create = function () { return new MyBolt(); };
/*
// alternatively, one could have several bolts in single file.
// in that case, "subtype" attribute of the bolt declaration would be 
// sent into create method and we could use it to choose appropriate implementation.
exports.create = function (subtype) {
    if (subtype == "subtype1") return new MyOtherBolt();
    return new MyBolt();
};
*/
```````````````````````

## Create custom spout

Put code for custom spout into `my_spout.js`

```````````````````````javascript
"use strict";

class MySpout {

    constructor() {
        this._name = null;
        this._data = [];
        this._data_index = 0;
    }

    init(name, config, callback) {
        this._name = name;
        // use other fields from config to control your execution

        for (let i = 0; i < 100; i++) {
            this._data.push({ id: i});
        }

        callback();
    }

    heartbeat() {
        // do something if needed
    }

    shutdown(callback) {
        // prepare for gracefull shutdown, e.g. save state
        callback();
    }

    run() {
        // enable this spout - by default it should be disabled
    }

    pause() {
        // disable this spout
    }

    next(callback) {
        // return new tuple or null. Third parameter is stream id.
        if (this._data_index >= this._data.length) {
            callback(null, null, null); // or just callback()
        } else {
            callback(null, this._data[this._data_index++], "stream1");
        }
    }
}

exports.create = function () { return new MySpout(); };

```````````````````````

## Create top-level code

This sample top-level code will load and run the topology.

``````````````````````javascript
"use strict";

require("qtopology")
    .runLocalTopologyFromFile("./topology.json");
``````````````````````

## Async bolts and spouts

If you prefer, you can use promises-based implementation:

`````javascript
class MyAsyncBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    async init(name, config, context) {
        this._name = name;
        this._onEmit = config.onEmit;
    }

    heartbeat() { }
    async shutdown() { }

    async receive(data, stream_id) {
        // we just print the incoming data and pass it on
        console.log(data, stream_id);
        await this._onEmit(data, stream_id);
    }
}
`````
and

`````javascript
class MyAsyncSpout {

    constructor() {
        this._name = null;
        this._data = [];
        this._data_index = 0;
    }

    async init(name, config, context) {
        this._name = name;
        // we will emit dummy generated data
        for (let i = 0; i < 100; i++) {
            this._data.push({ id: i });
        }
    }

    heartbeat() { }
    async shutdown() { }
    run() { }
    pause() { }

    async next() {
        if (this._data_index >= this._data.length) {
            return null;
        } else {
            return {
                data: this._data[this._data_index++],
                stream_id: "stream1"
            };
        }
    }
}
`````

## Further steps

To explore the capabilities further, one can:

- Define new bolts and connect them **sequentially** and **in parallel**.
- Use **stream ids** of messages for routing and filtering
- Use **standard bolts and spouts** for common tasks such as filtering
- Use **telemetry data** (`stream_id=$telemetry`) of nodes that comes out-of-the-box with the topology

## Advanced usage - distributed mode

To set up distributed scenario, one needs to use some implementation of the coordination storage. QTopology by itself provides HTTP and file-based coordination, a separate project provides [MySQL-based storage](https://github.com/qminer/qtopology-mysql) and developers can create their own.

In this section we will use MySQL-based storage as an example, but changes to use other implementations are minimal (i.e. changing the names of the classes).

### Worker instance

Normally, there would be one worker instance per server. The steps to create a worker are:

- create an instance of your storage
- initialize the storage
- create an instance of worker object, passing storage to it
- take care of shutdown event for a graceful

`````````````````````````````````javascript
"use strict";

const qtopology = require("qtopology");
const coor = require("qtopology-mysql");

let storage = new coor.MySqlStorage({
    host: "localhost",
    database: "xtest",
    user: "dummy",
    password: "dummy",
    port: 3306
});

// get worker name from the command line
let cmdln = new qtopology.CmdLineParser();
cmdln.define('n', 'name', 'worker1', 'Logical name of the worker');
let opts = cmdln.process(process.argv);
let w = null;

storage.init((err) => {
    if (err) {
        console.log(err);
        return;
    }
    let w = new qtopology.TopologyWorker(opts.name, storage);
    w.run();
    // for demo purposes, we shut this worker down after 20 seconds
    setTimeout(() => { shutdown(); }, 200000);
})

// take care of shutdown sequence
function shutdown() {
if (!w) return;
    w.shutdown((err) => {
        if (err) { console.log("Error while global shutdown:", err); }
        console.log("Shutdown complete");
        process.exit(0);
    });
    w = null;
}
`````````````````````````````````

### Command-line tool (CLI)

A simple command-line tool for managing the distributed topologies is available. All it needs is an instance of your coordination storage.

``````````````````````````````````javascript
"use strict";
const qtopology = require("qtopology");
const coor = require("qtopology-mysql");

qtopology.logger().setLevel("normal");

let storage = new coor.MySqlStorage({
    host: "localhost",
    database: "xtest",
    user: "dummy",
    password: "dummy",
    port: 3306
});

let cmd = new qtopology.CommandLineHandler(storage);
cmd.run(() => {
    storage.close(() => {
        qtopology.logger().log("Done.");
     })
});
``````````````````````````````````

Usage examples are as folows:

**register**

With this command you register new (or overwrite existing) topology:

``````````````````````````````````bash
node my_cli.js register <uuid> <file>
``````````````````````````````````

**enable**

With this command you enable topology with given uuid:

``````````````````````````````````bash
node my_cli.js enable <uuid>
``````````````````````````````````

**disable**

With this command you disable topology with given uuid:

``````````````````````````````````bash
node my_cli.js disable <uuid>
``````````````````````````````````
