# qtopology

![Build status](https://travis-ci.org/qminer/qtopology.svg?branch=master "Travis CI status")

QTopology is a distributed stream processing layer, written in `node.js`.

It uses the following terminology, originating in [Storm](http://storm.apache.org/) project:

- **Topology** - Organization of nodes into a graph that determines paths where messages must travel.
- **Bolt** - Node in topology that receives input data from other nodes and emits new data into the topology.
- **Spout** - Node in topology that reads data from external sources and emits the data into the topology.

When running in distributed mode, `qtopology` also use the following:

- **Coordinator** - reads global settings, receives worker registrations and send them the initialization data. Also sends shutdown signal.
- **Worker** - registers with coordinator, receives initialization data and instantiates local topology.

## Quick start

Define your spouts and bolts and connect them into topology.

### Topology definition

`````````````````````````json
{
    "general": {
        "name": "Topology name",
        "coordination_port": 12345,
        "heartbeat": 1000
    },
    "workers": [
        { "name": "srv1" }
    ],
    "spouts": [
        {
            "name": "pump1",
            "worker": "srv1",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "my_spout.js",
            "init": {}
        }
    ],
    "bolts": [
        {
            "name": "bolt1",
            "worker": "srv1",
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

### Bolt

```````````````````````javascript
"use strict";

class MyBolt {

    constructor() {
        this._name = null;
        this._onEmit = null;
    }

    init(name, config, callback) {
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

// this type of export is used for in-proc bolts
exports.create = function () { return new MyBolt(); };
```````````````````````

### Spout

```````````````````````javascript
"use strict";

class MySpout {

    constructor() {
        this._name = null;
    }

    init(name, config, callback) {
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

// this type of export is used for in-proc spouts
exports.create = function () { return new MySpout(); };
```````````````````````

### Top-level code

``````````````````````javascript
"use strict";

const async = require("async");
const tn = require("qtopology").local;
const validator = require("qtopology").validation;

// load configuration from file and validate it
let config = require("./topology.json");
validator.validate({ config: config, exitOnError: true });

// ok, create topology
let topology = new tn.TopologyLocal();
topology.init(config, (err) => {
    if (err) { console.log(err); return; }

    // let topology run for 4 seconds
    topology.run();    
    setTimeout(() => {
        topology.shutdown((err) => {
            if (err) { console.log(err); }
            console.log("Finished.");
        });
    }, 4000);
});
``````````````````````
