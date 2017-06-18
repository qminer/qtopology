# Exported utilities

QTopology exports several utiity classes that are used internally, but can be used entirely on their own.

- [logger](#logger)
- [cmdline](#cmdline)
- [pattern matcher](#pattern-matcher)
- [child process restarter](#childprocess-restarter)

## logger

Utility class and interface for logging output of the library

## cmdline

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

Simple pattern-matching class, used for instance in filtering and routing.

## child process restarter

This class provides automatic restarting of given child process (similar to `forever` module)


