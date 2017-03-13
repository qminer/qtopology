# Topology definition

Topology is defined via `JSON`. It follows this structure:

- `general`: geenral information about the topology
    - `name`: name of the topology
    - `coordination_port`: Port where coordinator listens to worker registrations
    - `heartbeat`: Defines heartbeat frequency in msec
- `workers`: array of worker definitions (with logical names, not physical addresses)
    - `name`: worker name
- `spouts`: array of spout definitions
    - `name`: spout name
    - `worker`: worker name where this spout will be running
    - `type`: `inproc` (in-process) or `subproc` (sub-process) mode of execution for this spout
    - `working_dir`: working directory where main file is located
    - `cmd`: name of the file that where spout is defined. If spout runs in-process, this file is loaded using `require()`. In sub-process scenario this file is used for `fork()` call
    - `init`: initialization object that is sent to spout in `init()` method
- `bolts`: array of bolt definitions
    - `name`: bolt name
    - `worker`: worker name where this bolt will be running
    - `type`: `inproc` (in-process) or `subproc` (sub-process) mode of execution for this bolt
    - `working_dir`: working directory where main file is located
    - `cmd`: name of the file that where bolt is defined. If bolt runs in-process, this file is loaded using `require()`. In sub-process scenario this file is used for `fork()` call
    - `inputs`: array of input nodes (spouts and bolts) for this bolt
        - `name`: logical namo of input node
        - `stream_id`: (optional) id of stream that this bolt will read. Empty means default stream.
    - `init`: initialization object that is sent to bolt in `init()` method
- `variables`: map of variables that can be reused when defining spout and bolt paths. Similar to environment variables in Unix.

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
            "init": {}
        },
        {
            "name": "pump2",
            "worker": "srv1",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "spout_inproc.js",
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
            "inputs": [{ "source": "pump1" }],
            "init": {}
        },
        {
            "name": "bolt2",
            "worker": "srv1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "bolt_inproc.js",
            "inputs": [
                { "source": "pump1" },
                { "source": "pump2", "stream_id": "stream1" }
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
            "inputs": [{ "source": "bolt2" }],
            "init": {
                "forward": false
            }
        }
    ],
    "variables": {}
}
```````````

Topology can be validated using built-in validator:

``````````javascript
"use strict";

let config = {....};

// Run validator and abort process if topology doesn't meet the schema.
const validator = require("qtopology").validation;
validator.validate({ config: config, exitOnError: true });
``````````
