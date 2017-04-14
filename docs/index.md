# qtopology

![Build status](https://travis-ci.org/qminer/qtopology.svg?branch=master "Travis CI status")
![npm version](https://badge.fury.io/js/qtopology.svg "NPM version")

NPM package: [https://www.npmjs.com/package/qtopology](https://www.npmjs.com/package/qtopology)

### Installation

`````````````bash
npm install qtopology
`````````````

## Intro

QTopology is a distributed stream processing layer, written in `node.js`.

It uses the following terminology, originating in [Storm](http://storm.apache.org/) project:

- **Topology** - Organization of nodes into a graph that determines paths where messages must travel.
- **Bolt** - Node in topology that receives input data from other nodes and emits new data into the topology.
- **Spout** - Node in topology that reads data from external sources and emits the data into the topology.
- **Stream** - When data flows through the topology, it is optionaly tagged with stream ID. This can be used for routing.

When running in distributed mode, `qtopology` also uses the following:

- **Coordination storage** - must be resilient, receives worker registrations and sends them the initialization data. Also sends shutdown signals. Implementation is custom. `QTopology` provides `REST`-based service out-of-the-box, but the design is similar for other options like `MySQL` storage etc.
- **Worker** - Runs on single server. Registers with coordination storage, receives initialization data and instantiates local topologies in separate subprocesses.
    - **Leader** - one of the active workers is announced leader and it performs leadership tasks such as assigning of topologies to workers, detection of dead or inactive workers.

## Quick start

Define your spouts and bolts and connect them into topology. Bolts and spouts can run as `inproc` (in-process) or `subproc` (in its own process).

### Topology definition

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

## Further reading

- [Topology definition](topology-definition.md)
- [Standard nodes](std-nodes.md)
- [How to write bolts and spouts](how-to-write-bolts-and-spouts.md)
- [Internal protocols](protocols.md)
