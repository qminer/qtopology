# How to write in-proc bolts and spouts

In-process bolts and spouts have the advantage of the quickest communication. The down-side is that in the case of error or unhandeled exceptions, they can bring down the entire `qtopology` engine.

## Bolts

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

# Spouts

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
