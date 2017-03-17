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

## POST bolt - `cmd="post"`

This bolt sends POST request to specified url (fixed or provided inside data) and forwards the response.

The result of the call will be emitted into topology, with a single property `body` that will contain the body of the response.

### Sending using fixed URL

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "post",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "url": "http://my.server.com/api"
    }
}
```````````````````````````````

This way the bolt will send complete, unmodified incoming request to specified URL.

### Sending using dynamic URL

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "post",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": { }
}
```````````````````````````````

This way the bolt will send the `body` property of the incomming message to the URL, specified by the `url` property:

`````````````````````````````````json
{
    "url": "http://my.server.com/api2",
    "body": {
        "a": true,
        "b": 12
    }
}
`````````````````````````````````

## GET bolt - `cmd="get"`

This bolt sends GET request without any request-body to a specified url (fixed or provided inside data) and forwards the response.

The result of the call will be emitted into topology, with a single property `body` that will contain the body of the response.

### Sending using fixed URL

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "get",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "url": "http://my.server.com/api"
    }
}
```````````````````````````````

### Sending using dynamic URL

```````````````````````````````json
{
    "name": "bolt1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "post",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": { }
}
```````````````````````````````

This way the bolt will send the `GET` request to the URL, specified by the `url` property:

`````````````````````````````````json
{
    "url": "http://my.server.com/api2"
}
`````````````````````````````````

## GET spout - `cmd="get"`

This spout sends GET request without any request-body to a specified url (fixed or provided inside data) in regualr time intervals and forwards the response.

The result of the call will be emitted into the topology after each time interval (the `repeat` parameter), with a single property `body` that will contain the body of the response.

```````````````````````````````json
{
    "name": "spout1",
    "worker": "srv1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "get",
    "init": {
        "url": "http://my.server.com/api",
        "repeat": 60000,
        "stream_id": "SomeStreamId"
    }
}
```````````````````````````````
