# Standard nodes

QTopology contains some already implemented spouts and bolts that are ready to use out-of-the-box.

To use such bolts and spouts, set it's `type` to `"sys"` and `cmd` to appropriate value - see below for values.

List of standard spouts:

- [File spout](#file-reader-spout)
- [Process spout](#process-spout)
- [Timer spout](#timer-spout)
- [GET spout](#get-spout)
- [REST spout](#rest-spout)
- [RSS spout](#rss-spout)
- [Dir-watcher spout](#dir-spout)
- [Test spout](#test-spout)

List of standard bolts:

- [Attacher bolt](#attacher-bolt)
- [Filter bolt](#filter-bolt)
- [Router bolt](#router-bolt)
- [GET bolt](#get-bolt)
- [POST bolt](#post-bolt)
- [File-append bolt](#file-append-bolt)
- [Counter bolt](#counter-bolt)
- [Date-transform bolt](#date-transform-bolt)
- [Bomb bolt](#bomb-bolt)

## File-reader spout

`cmd="file_reader"`

This spout reads target file and emits messages that are stored inside.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "file_reader",
    "init": {
        "file_name": "/some/file.txt",
        "file_format": "json"
    }
}
```````````````````````````````

Messages can be stored in several formats:

- `raw` - reads text as lines and emits messages with a single field `content` that contains raw text line form the file.
- `json` - each non-empty line of the file contains a JSON serialized object.
- `csv` - the first line contains a header and subsequent lines will contain a comma-separated list of matching values. The emited objects will contain properties with names from header and values from each line.
    - All fields are emited as strings.
    - Separator character by default is comma (","). This can, however, be changed with additional parameter `separator`.
    - We can filter the emited fields inside messages by providing a list of allowed fields as `fields` paarmeter. This will result in messages that have only some of the fields from the CSV file present - this that are in this list. If there is a field in the list but it is not present in the CSV file, it will be ignored.

> At the moment the implementation loads all data into memory first and then emits the messages. This is not suitable for larger files, so use this spout with care.

## Process spout

`cmd="process"`

This spout behaves the `file` spout - the difference is that it executes specified commandline, reads stdout and emits messages.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "process",
    "init": {
        "cmd_line": "my_executable -param1 -x -y -z",
        "file_format": "json"
    }
}
```````````````````````````````

For definition of input parameters and explanation of the output handling, see [file spout](#file-spout).

## Date-transform bolt

`cmd="date_transform"`

This bolt takes incoming messages and transforms predefined fields into `Date` objects, since
this only type is the only one that cannot be properly serialized and deserialized from JSON.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "date_transform",
    "init": {
        "date_transform_fields": ["field1", "field2"],
        "reuse_stream_id": true
    }
}
```````````````````````````````

> Using this bolt only makes sense when messages are passed in binary form.

## Dir spout

`cmd="dir"`

This spout emits a message each time a file is created, changed or deleted inside some
target directory.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "dir",
    "init": {
        "dir_name": "/some/input/dir"
    }
}
```````````````````````````````

This spout will emit these messages:

``````````````````````````````json
{
    "change_type":"rename",
    "file_name":"temp_file.tmp",
    "target_dir": "/some/input/dir",
    "ts":"2017-05-15T15:45:08.695Z"
}
``````````````````````````````

> Change type `rename` is sent when file is created or deleted, while `change` is sent when file content is changed.

## Test spout

`cmd="test"`

This spout emits pre-defined records. The records need to be defined in the configuration, in field `tuples`.

> This spout is primarily meant for testing.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "timer",
    "init": {
        "tuples": [
            { "ts": "2017-03-16T12:34:33.942Z", "a": 12 },
            { "ts": "2017-03-16T12:35:33.947Z", "a": 15 },
            { "ts": "2017-03-16T12:36:33.952Z", "a": 14.3 }
        ]
    }
}
```````````````````````````````

This spout will emit these messages:

``````````````````````````````json
{ "ts": "2017-03-16T12:34:33.942Z", "a": 12 }
{ "ts": "2017-03-16T12:35:33.947Z", "a": 15 }
{ "ts": "2017-03-16T12:36:33.952Z", "a": 14.3 }
``````````````````````````````

## Timer spout

`cmd="timer"`

This spout emits new record on every heartbeat. The record contains title (`title`) and and timestamp (`ts`) fields. Additional constant fields can be defined via configuration - these fields are simply attached to the message.

```````````````````````````````json
{
    "name": "pump1",
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

## REST spout

`cmd="rest"`

This spout opens `HTTP` server on specified port and emits new record on every `POST` request.

Incoming data is expected to be in JSON format. Optionally, fixed stream ID can be assigned to data tuple.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "rest",
    "init": {
        "port": 6789,
        "stream_id": "SomeOptionalStreamId"
    }
}
```````````````````````````````

## Attacher bolt

`cmd="attacher"`

This bolt just attaches fixed data fields to every incoming message and forwards it on to listeners.

```````````````````````````````json
{
    "name": "bolt1",
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

## Console bolt

`cmd="console"`

This bolt just logs every incoming message to `stdout` and forwards it on to listeners.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "console",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {}
}
```````````````````````````````

## Counter bolt

`cmd="counter"`

This bolt counts incoming messages and output single line of code to
log in predefined intervals. The line displays the number of
received messages since last display.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "counter",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "timeout": 5000
    }
}
```````````````````````````````

## Filter bolt

`cmd="filter"`

This bolt filters incoming messages and only forwards the ones that pass its filter.

```````````````````````````````json
{
    "name": "bolt1",
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


## File-append bolt

`cmd="file_append"`

This bolt attaches incoming messages as `JSON` and appends them to output file.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "file_append",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "file_name_template": "./logs/log.txt"
    }
}
```````````````````````````````

This example will log all incoming data into file `log.txt` inside `logs` subdirectory of current directory. The directory must already exist.

### Timestamp

You can instruct the bolt to prepend timestamp (in local timezone using ISO format), by setting option `prepend_timestamp` to `true`. The new line in the log file will look something like this:

```````````
2017-05-14T15:52:07.341 {"ts":"2017-03-16T12:36:33.952Z","a":14.3}
```````````

### File splitting

The log file can be huge, so the bolt provides option to split files after each time interval. Just set option `split_over_time` to `true` and `split_period` to number of milliseconds that you want to use (3600000 means one hour). The bolt will create new file for each interval (as long as there is some data to write). The timestamp of the interval will be injected into the name of the file.

For eaxmple, setting options to

```````````````json
{
    "file_name_template": "./log.txt",
    "split_over_time": true,
    "split_period": 3600000
}
```````````````

will write data into files with names like:

- `log_2017_05_15T12:00:00.txt`
- `log_2017_05_15T13:00:00.txt`
- `log_2017_05_15T14:00:00.txt`
- ....

## Router bolt

`cmd="filter"`

This bolt routes incoming messages to separate stream ids, depending on the filters.
If filters for several routes succeed, the message is sent to all stream ids.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "filter",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "routes": {
            "stream1": {
                "field1": "a"
            },
            "stream2": {
                "field1": "b"
            },
            "stream3": {
                "field1": ["a", "c"]
            }
        }
    }
}
```````````````````````````````

## POST bolt

`cmd="post"`

This bolt sends POST request to specified url (fixed or provided inside data) and forwards the response.
The result of the call will be emitted into topology, with a single property `body` that will contain the body of the response.

### Sending using fixed URL

```````````````````````````````json
{
    "name": "bolt1",
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

## GET bolt

`cmd="get"`

This bolt sends GET request without any request-body to a specified url (fixed or provided inside data) and forwards the response.

The result of the call will be emitted into topology, with a single property `body` that will contain the body of the response.

### GET bolt - Sending using fixed URL

```````````````````````````````json
{
    "name": "bolt1",
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

### GET bolt - Sending using dynamic URL

```````````````````````````````json
{
    "name": "bolt1",
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

## GET spout

`cmd="get"`

This spout sends GET request without any request-body to a specified url (fixed or provided inside data) in regualr time intervals and forwards the response.

The result of the call will be emitted into the topology after each time interval (the `repeat` parameter), with a single property `body` that will contain the body of the response.

```````````````````````````````json
{
    "name": "spout1",
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

## RSS spout

`cmd="rss"`

This spout retrieves content of specified RSS feed in regular time intervals and forwards the parsed response.

The result of the call will be emitted into the topology after each time interval (the `repeat` parameter).

```````````````````````````````json
{
    "name": "spout1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "rss",
    "init": {
        "url": "http://my.source.com/rss",
        "repeat": 60000,
        "stream_id": "SomeStreamId"
    }
}
```````````````````````````````

## Bomb bolt

This bolt is used for testing the disaster-recorvery of the topology.
It causes an exception that propagates to the root of the process after predefined time interval.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "bomb",
    "inputs": [],
    "init": {
        "explode_after": 10000
    }
}
```````````````````````````````

This bolt will cause an exception after 10 seconds after it's `init` method was called.

Bolt can have inputs and it will just forward the data on to listeners, preserving the `stream_id`.
