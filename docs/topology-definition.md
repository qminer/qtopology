# Topology definition

Topology is defined via `JSON`. It follows this structure:

- `general`: general information about the topology
    - `heartbeat`: Defines heartbeat frequency in msec
    - `pass_binary_messages`: Optional. If true, the messages are passed in binary form from one node to the other. Otherwise they are serialized into JSON and deserialized in each subsequent node. Default is false. **See notes at the bottom.**
    - `initialization`: Optional. List of initialization scripts:
        - Single initialization script
            - `working_dir`: working directory where initialization file is located.
            - `cmd`: name of the file where initialization code resides.
            - `init`: initialization object that is sent to initialization code in `init()` method
            - `disabled`: optional flag that this step is disabled. This means that it wont be run.
    - `shutdown`: Optional. List of shutdown scripts:
        - Single shutdown script
            - `working_dir`: working directory where initialization file is located.
            - `cmd`: name of the file where initialization code resides.
            - `disabled`: optional flag that this step is disabled. This means that it wont be run.
- `spouts`: array of spout definitions
    - `name`: spout name
    - `type`: `inproc` (in-process) or `sys` (standard)
    - `working_dir`: working directory where main file is located
    - `disabled`: optional flag that this spout is disabled. This means that it wont be instantiated.
    - `cmd`: name of the file that where spout is defined. If spout runs in-process, this file is loaded using `require()`.
    - `subtype`: Optional. String parameter that is passed to factory method for creation of spout. This enables the developers to provide multiple spouts inside single source file.
    - `init`: initialization object that is sent to spout in `init()` method
- `bolts`: array of bolt definitions
    - `name`: bolt name
    - `type`: `inproc` (in-process) or `sys` (standard)
    - `working_dir`: working directory where main file is located
    - `disabled`: optional flag that this bolt is disabled. This means that it wont be instantiated.
    - `cmd`: name of the file that where bolt is defined. If bolt runs in-process, this file is loaded using `require()`.
    - `subtype`: Optional. String parameter that is passed to factory method for creation of spout. This enables the developers to provide multiple bolts inside single source file.
    - `inputs`: array of input nodes (spouts and bolts) for this bolt
        - `name`: logical namo of input node
        - `stream_id`: (optional) id of stream that this bolt will read. Empty means default stream.
        - `disabled`: optional flag that this input is disabled. This means that no data will flow here.
    - `init`: initialization object that is sent to bolt in `init()` method
- `variables`: map of variables that can be reused when defining spout and bolt paths. Similar to environment variables in Unix.

An example:

```````````json
{
    "general": {
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
            "subtype": "subtype1",
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

## Notes

### Passing binary messages or not?

Use this option at your own risk. You have to explicitely enable it.

If messages are passed in binary form, there is a chance that one of the subsequent nodes changes the messages and this change will be visible to all other nodes. There is no isolation between the siblings. Also, there is no guarantied order of execution between siblings and their children.

So, when should we use it? When the following assumptions are true:

- You want performance / you want to pass fields that are binary classes (e.g. `Date` type).
- Data fields of the message never changes. Only new fields are added.
- There is no expectation of the order of execution between peer nodes and their children. Any dependency is purely upstream.

