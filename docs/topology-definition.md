# Topology definition

Topology is defined via `JSON`.

An example:

```````````json
{
    "general": {
        "name": "Topology name",
        "coordination_port": 9289,
        "heartbeat": 3200
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
            "cmd": "spout_inproc.js",
            "args": [],
            "init": {}
        },
        {
            "name": "pump2",
            "worker": "srv1",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "spout_inproc.js",
            "args": [],
            "init": {}
        }
    ],
    "bolts": [
        {
            "name": "bolt1",
            "worker": "srv1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "bolt_inproc.js",
            "args": [],
            "inputs": [{ "source": "pump1" }],
            "init": {}
        },
        {
            "name": "bolt2",
            "worker": "srv1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "bolt_inproc.js",
            "args": [],
            "inputs": [
                { "source": "pump1" },
                { "source": "pump2" }
            ],
            "init": {
                "forward": true
            }
        },
        {
            "name": "bolt3",
            "worker": "srv1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "bolt_inproc.js",
            "args": [],
            "inputs": [{ "source": "bolt2" }],
            "init": {
                "forward": false
            }
        }
    ],
    "variables": {}
}
```````````

Topology can be validated using validator:

``````````javascript
"use strict";

let config = {....};

// Run validator and abort process if topology doesn't meet the schema.
const validator = require("qtopology").validation;
validator.validate({ config: config, exitOnError: true });
``````````
