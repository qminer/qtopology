# Standard nodes

QTopology contains some already implemented spouts and bolts that are ready to use out-of-the-box.

To use such bolts and spouts, set it's `type` to `"sys"` and `cmd` to appropriate value - see below for values.

## Timer spout - `cmd="timer"`

This spout emits new record on every heartbeat. The record contains title (`title`) and and timestamp (`ts`) fields. Additional constant fields can be defined via configuration - these fields are simply attached to the message.

```````````````````````````````json
{
    "name": "pump1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "timer",
    "init": {
        "title": "some title",
        "extra_fields": {
            "field1": "a"
        }
    }
}
```````````````````````````````

This spout will emit message like this:

``````````````````````````````json
{
    "title": "some title",
    "ts": "2017-03-16T12:34:33.942Z",
    "field1": "a"
}
``````````````````````````````

## Attacher bolt - `cmd="attacher"`

This bolt just attaches fixed data fields to every incoming message and forwards it on to listeners.

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "attacher",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "extra_fields": {
            "field1": "a"
        }
    }
}
```````````````````````````````

This bolt will, upon receiving a new message like this one:

``````````````````````````````json
{ "previous_data": "some text" }
``````````````````````````````

Emit a new message like this:

``````````````````````````````json
{ "previous_data": "some text", "field1": "a" }
``````````````````````````````

## Console bolt - `cmd="console"`

This bolt just logs every incoming message to `stdout` and forwards it on to listeners.

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "console",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {}
}
```````````````````````````````

## Filter bolt - `cmd="filter"`

This bolt filters incoming messages and only forwards the ones that pass its filter.

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "filter",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "filter": {
            "my_field1": "target_value1",
            "my_field2": ["target_value2", "target_value3"],
            "my_field3": {
                "$like": "regex expression"
            }
        }
    }
}
```````````````````````````````
