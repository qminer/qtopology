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
        "name": "Topology name",
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
                { "source": "pump1" }
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
        callback();
    }
}

exports.create = function () { return new MyBolt(); };
```````````````````````

## Create custom spout

Put code for custom spout into `my_spout.js`

```````````````````````javascript
"use strict";

class MySpout {

    constructor() {
        this._name = null;
    }

    init(name, config, context, callback) {
        this._name = name;
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

    run() {
        // enable this spout - by default it should be disabled
    }

    pause() {
        // disable this spout
    }

    next(callback) {
        // return new tuple or null. Third parameter is stream id.
        callback(null, data, null);
    }
}

exports.create = function () { return new MySpout(); };
```````````````````````

## Create top-level code

This sample top-level code will construct the topology, start it and let it run for 20 seconds.

``````````````````````javascript
"use strict";

const qtopology = require("qtopology");
const tn = qtopology.local;
const validator = qtopology.validation;

// load configuration from file
let config = require("./topology.json");

// compile it - injects variables and performs some checks
let compiler = new qtopology.compiler.TopologyCompiler(config);
compiler.compile();
config = compiler.getWholeConfig();

// ok, create topology
let topology = new tn.TopologyLocal();
topology.init(config, (err) => {
    if (err) { console.log(err); return; }

    // let topology run for 20 seconds
    topology.run();
    setTimeout(() => {
        topology.shutdown((err) => {
            if (err) { console.log(err); }
            console.log("Finished.");
        });
    }, 20 * 1000);
});
``````````````````````

## Further steps

To explore the capabilities further, one can:

- Define new bolts and connect them **sequentially** and **parallely**.
- Use **stream ids** of messages for routing and filtering
- Use **standard bolts and spouts** for common tasks such as filtering
- Use **telemetry data** (`stream_id=$telemetry` and `stream_id=$telemetry-total`) of nodes that comes out-of-the-box with the topology
