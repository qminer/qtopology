# Exported utilities

QTopology exports several utility classes that are used internally, but can be used entirely on their own.

- [logger](#logger)
- [cmdline](#cmdline)
- [pattern matcher](#pattern-matcher)
- [child process restarter](#childprocess-restarter)
- [minimal HTTP server](#minimal-http-server)

## logger

Utility class and interface for logging output of the library.

## cmdline

### parseCommandLine function

Parses input array of strings (e.g. argv) and returns an object with colected values.

- It supports `-` and `--` prefixes for names.
- Names without values are set to true.
- Unnamed values are returned in a property `_`.

```````````````javascript
let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
let res = qtopology.parseCommandLine(data);
```````````````

The result is the following:

```````````````javacsript
{
    a: "1",
    b: "2",
    c: true,
    _: ["some_value1", "some_value2"]
}
```````````````

### parseCommandLineEx function

The same as `parseCommandLine` with additional parameter that describes mapping:


```````````````javascript
let data = ["--a", "1", "-b", "2", "some_value1", "some_value2", "-c"];
let res = qtopology.parseCommandLineEx(data, { a: "action", c: "config" });
```````````````

The result is the following:

```````````````javacsript
{
    a: "1",
    action: "1",
    b: "2",
    c: true,
    config: true,
    _: ["some_value1", "some_value2"]
}
```````````````

This way you can 

### CmdLineParser object

Utility class for parsing command-line parameters.

```````````````````javascript
let qtopology = require("qtopology");
let cmdl = new qtopology.CmdLineParser();
cmdl.define("n", "name", "default_name", "This parameter sets the name");
let res = cmdl.process(some_string_arry);
```````````````````

This code processes input array of string (most often this would be `process.argv`) and it would output an object with property `name`.

For instance, if command line would be any of the following:

`````````````
node main.js -n my_name
node main.js --name my_name
`````````````

The result would be 

``````````javascript
{
    name: "my_name"
}
``````````


## pattern matcher

Simple pattern-matching class, used for instance in filtering and routing:

````````````````````````````````````javascript
let data = { a: 4, b: "8ba" };
let data2 = { a: 4, b: "8b" };
let filter = { b: { $like: "$[0-5]b" } };
let target = new pm.PaternMatcher(filter);
target.isMatch(data); // returns false
target.isMatch(data2); // returns true
````````````````````````````````````

## child process restarter

This class provides automatic restarting of given child process (similar to `forever` module). See demo for an example.

It comes in 3 flavors, one calls `spawn` and the other calls`fork`. The former one can call any executable and the latter one just need path to the javascript file.

### Spawn

This one can call any executable:

````````````````````````````javascript
const qtopology = require("qtopology");
let obj = new qtopology.ChildProcRestarterFork("child.js", []);
obj.start();
````````````````````````````

### Fork

This one just executes given `javascript` file, no need to specify node as execution application:

````````````````````````````javascript
const qtopology = require("qtopology");
let obj = new qtopology.ChildProcRestarterSpawn("node", ["child.js"]);
obj.start();
````````````````````````````

### General

This class exposes the most options and is called by the other two:

````````````````````````````javascript
const qtopology = require("qtopology");
let obj = new qtopology.ChildProcRestarter({
    cmd : "node",
    args: ["child.js"],
    use_fork: false,
    stop_score: 5
});
obj.start();
````````````````````````````

## Minimal HTTP server

This utility class represents minimal HTTP server that serves simple REST requests as well as GET requests for static content. There is no:

- server-side rendering
- complex routing
- route parameter parsing
