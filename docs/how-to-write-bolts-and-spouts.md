# How to write bolts and spouts

Depending on the execution we have to options for running bolts and spouts - **in-process** and **sub-process**

**In-process** bolts and spouts have the advantage of the quickest communication. The down-side is that in the case of error or unhandeled exceptions, they can bring down the entire `qtopology` engine.

The engine expects the same implementation regardless of the way it executes (inprocess or subprocess). There is just aminor difference at how the code is included into the topology/engine.

## Implementations

### Bolts

To create a bolt, create a `.js` file with single exported parameterless function named `create()`.

`````````javascript
exports.create = function() { return new MyBolt(); }
````````````

The function must return an object that satisfies the following interface:

``````````javascript
class MyBolt {
    // parameterless constructor
    constructor() {}
    // configuration will contain onEmit property - callback for emitting new tuples
    // It expects 2 parameters - (data, callback)
    init(name, config, callback) { }
    // heartbeat signal
    heartbeat() { }
    // this call should gracefully stop the object, saving its state if needed
    shutdown(callback) { }
    // enable this object
    run() { }
    // disable this object
    pause() { }
    // this is how new incoming data is received by the object
    send(data, callback) { }
}
```````````

Callback in `send()` method should not be called until all emitted tuples have been
acknowledged via callback (`onEmit()` function, received in config).

### Spouts

To create a spout, create a `.js` file with single exported parameterless function named `create()`.

`````````javascript
exports.create = function() { return new MySpout(); }
````````````

The function must return an object that satisfies the following interface:

``````````javascript
class MySpout {
    // parameterless constructor
    constructor() {}
    // initialization with custom configuration
    init(name, config, callback) { }
    // heartbeat signal
    heartbeat() { }
    // this call should gracefully stop the object, saving its state if needed
    shutdown(callback) { }
    // enable this object
    run() { }
    // disable this object
    pause() { }
    // called to fetch next tuple from spout
    next(callback) { }
}
```````````


> Method `next()` should return single data tuple or null if no data is available.

## When using nodes inprocess

### Bolts

To create an inprocess bolt or spout, create a `.js` file with single exported parameterless function named `create()`.

`````````javascript
"use strict";
exports.create = function() { return new MyBolt(); }
````````````

and define the bolt in the topology like this:

`````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "inproc",
    "cmd": "bolt_inproc.js",
    "inputs": [{ "source": "pump1" }],
    "init": {}
}
```````````

### Spouts

`````````javascript
"use strict";
exports.create = function() { return new MySpout(); }
````````````

and define the spout in the topology like this:

`````````json
{
    "name": "pump1",
    "worker": "srv1",
    "type": "inproc",
    "working_dir": ".",
    "cmd": "spout_file.js",
    "init": {}
}
```````````

## When using nodes as subprocess

Create a file that instantiates your nodet and establishes connection to topology (parent process);

### Bolt

`````````javascript
"use strict";

// topology context
const tn = require("qtopology").child;

// create an instance of your bolt
let bolt = new MyBolt();
// assign it to topology context
let context = new tn.TopologyContextBolt(bolt);
// start the context - this establishes communication with parent process
context.start();
````````````

Configuration is the same as for the inproc version, except the `type` field. It should be set to `subproc`.

### Spout

`````````javascript
"use strict";

// topology context
const tn = require("qtopology").child;

// create an instance of your spout
let spout = new MySpout();
// assign it to topology context
let context = new tn.TopologyContextSpout(spout);
// start the context - this establishes communication with parent process
context.start();
````````````

Configuration is the same as for the inproc version, except the `type` field. It should be set to `subproc`.
