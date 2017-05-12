# Topology definition

Topology is defined via `JSON`. It follows this structure:

- `general`: general information about the topology
    - `name`: name of the topology
    - `heartbeat`: Defines heartbeat frequency in msec
    - `initialization`: Optional. List of initialization scripts:
        - Single initialization script
            - `working_dir`: working directory where initialization file is located.
            - `cmd`: name of the file where initialization code resides.
            - `init`: initialization object that is sent to initialization code in `init()` method
    - `shutdown`: Optional. List of shutdown scripts:
        - Single shutdown script
            - `working_dir`: working directory where initialization file is located.
            - `cmd`: name of the file where initialization code resides.
- `spouts`: array of spout definitions
    - `name`: spout name
    - `type`: `inproc` (in-process) or `sys` (standard)
    - `working_dir`: working directory where main file is located
    - `cmd`: name of the file that where spout is defined. If spout runs in-process, this file is loaded using `require()`.
    - `init`: initialization object that is sent to spout in `init()` method
- `bolts`: array of bolt definitions
    - `name`: bolt name
    - `type`: `inproc` (in-process) or `sys` (standard)
    - `working_dir`: working directory where main file is located
    - `cmd`: name of the file that where bolt is defined. If bolt runs in-process, this file is loaded using `require()`.
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
        "heartbeat": 3200,
        "initialization": [
            { "working_dir": ".", "cmd": "init.js" }
        ],
        "shutdown": [
            { "working_dir": ".", "cmd": "shutdown.js" }
        ]
    },
    "spouts": [
        {
            "name": "pump1",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "spout_inproc.js",
            "init": {}
        },
        {
            "name": "pump2",
            "type": "inproc",
            "working_dir": ".",
            "cmd": "spout_inproc.js",
            "init": {}
        }
    ],
    "bolts": [
        {
            "name": "bolt1",
            "working_dir": ".",
            "type": "inproc",
            "cmd": "bolt_inproc.js",
            "inputs": [{ "source": "pump1" }],
            "init": {}
        },
        {
            "name": "bolt2",
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
