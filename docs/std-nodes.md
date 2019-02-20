# Standard nodes

QTopology contains some already implemented spouts and bolts that are ready to use out-of-the-box.

To use such bolts and spouts, set it's `type` to `"sys"` and `cmd` to appropriate value - see below for values.

List of standard spouts:

- [Dir-watcher spout](#dir-spout)
- [File spout](#file-reader-spout)
- [GET spout](#get-spout)
- [Process spout continuous](#process-spout-continuous)
- [Process spout](#process-spout)
- [REST spout](#rest-spout)
- [RSS spout](#rss-spout)
- [Test spout](#test-spout)
- [Timer spout](#timer-spout)

List of standard bolts:

- [Accumulator bolt](#accumulator-bolt)
- [Attacher bolt](#attacher-bolt)
- [Bomb bolt](#bomb-bolt)
- [CSV file-append bolt](#csv-file-append-bolt)
- [Console bolt](#console-bolt)
- [Counter bolt](#counter-bolt)
- [Date-transform bolt](#date-transform-bolt)
- [Date-to-numeric bolt](#date-to-numeric-bolt)
- [File-append bolt extended](#file-append-bolt-extended)
- [File-append bolt](#file-append-bolt)
- [Filter bolt](#filter-bolt)
- [Forward bolt](#forward-bolt)
- [GET bolt](#get-bolt)
- [POST bolt](#post-bolt)
- [Process bolt](#process-bolt)
- [Router bolt](#router-bolt)
- [Transform bolt](#transform-bolt)
- [Type-transform bolt](#type-transform-bolt)

Base classes that can be extended with custom logic:

- [Task-bolt base](#task-bolt-base)

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
- `csv` - the first line can contain a header and subsequent lines will contain a comma-separated list of matching values. The emitted objects will contain properties with names from header and values from each line.
    - All fields are emitted as strings.
    - Separator character by default is comma (","). This can, however, be changed with additional parameter `csv_separator`.
    - Header line is optional. We can define a list of allowed fields with `csv_fields` parameter. If this setting is not present, the first line is assumed to be the header line that defines the fields of the emitted messages.

Optional settings:

- `csv_separator` - used for CSV format
- `csv_fields` - used for CSV format
- `own_exit` - set to `true` if you wish to exit the process after the file has been read entirely
- `own_exit_delay` - used only when `own_exit` is `true`, the number of msec when the process exits after the file is read entirely. Default is 10,000 msec.

## Process spout

`cmd="process"`

This spout behaves like the `file` spout - the difference is that it executes specified command-line, reads stdout and emits messages.

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

> NOTE: This spout waits for the child process to finish, before it emits the data. This is not suitable for large outputs or long-running processes. See "Process spout continuous" for a version that reads thedata continuously.

The child process can be run repeatedly by setting the `run_interval` settings to the number of milliseconds that we want the process to run.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "process",
    "init": {
        "cmd_line": "my_executable -param1 -x -y -z",
        "run_interval": 60000,
        "file_format": "json"
    }
}
```````````````````````````````

The above example will run the child process each minute and collect the results.

## Process spout continuous

`cmd="process-continuous"`

This spout behaves like the `process` spout - the difference is that it spawns child process, specified by the command-line, and reads its stdout as it is written (and emits the messages).
The two most important config parameters are `cmd_line` - the command to be executed and `cwd` -
the current working directory.

### Error handling

If `emit_error_on_exit` flag (false by default) is set to true, the spout will emit an exception when the child process exits. Setting
`emit_stderr_errors` to true (false by default) will emit any data read from stderr as an exception. Setting `emit_parse_errors` to true (default) will emit parse exceptions, otherwise they will be silently ignored if set to false.

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "process-continuous",
    "init": {
        "cmd_line": "my_executable -param1 -x -y -z",
        "cwd": "./",
        "emit_parse_errors" : true,
        "emit_stderr_errors": false,
        "emit_error_on_exit" : false,
        "file_format": "json"
    }
}
```````````````````````````````

For definition of input parameters and explanation of the output handling, see [file spout](#file-spout).

## Process bolt

`cmd="process"`

This bolt spawns a child process and communicates with it using `stdin` and `stdout`.
Incoming messages are sent to the process as a JSON-serialized strings (single lines) via `stdin` and whenever a line is written to `stdout`, it is assumed to be JSON serialized object. The text is parsed and sent down the topology.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "process",
    "init": {
        "cmd_line": "my_executable -param1 -x -y -z"
    }
}
```````````````````````````````

Optionally, a `stream_id` for the outgoing messages can be specified.

## Date-transform bolt

`cmd="date_transform"`

This bolt takes incoming messages and transforms predefined fields into `Date` objects, since this is the only one that cannot be properly serialized and deserialized from JSON.

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

> **NOTE:** This bolt is obsolete, use `type_transform` bolt in the future.

## Date-to-numeric bolt

`cmd="date2numeric_transform"`

This bolt takes incoming messages and transforms predefined fields from `Date` objects into their
numeric value (Unix timestamp).

```````````````````````````````json
{
    "name": "pump1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "date2numeric_transform",
    "init": {
        "date_transform_fields": ["field1", "field2"],
        "reuse_stream_id": true
    }
}
```````````````````````````````

## Type-transform bolt

`cmd="type_transform"`

This bolt takes incoming messages and transforms predefined fields 
into `Date` objects, numerics or booleans. It is a successor of `date_transform` bolt.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "type_transform",
    "inputs": [{ "source": "pump" }],
    "init": {
        "date_transform_fields": ["field1", "field2"],
        "date_n_transform_fields": ["field1n", "field2n"],
        "numeric_transform_fields": ["field3"],
        "bool_transform_fields": ["field4"],
        "reuse_stream_id": true
    }
}
```````````````````````````````

The following settings can be used in `init` section:
- `date_transform_fields` - list of fields that will be transformed into `Date` objects
- `date_n_transform_fields` - list of fields that will be parsed as dates and transformed into Unix timestamps
- `numeric_transform_fields` - these fields will be transformed into numeric values directly
- `bool_transform_fields` - these fields will be transformed into boolean values
- `reuse_stream_id` - flag if incoming stream id should be reused. Otherwise it is null.

> Using this bolt only makes sense when messages are passed in binary form.

## Accumulator bolt

`cmd="accumulator"`

This bolt takes incoming messages in GDR format and emits periodic statistics.

GDR record format is:

```json
{
    "ts": "2018-05-20T12:34:56",
    "tags": {
        "field1": "val1",
        "field2": "val2"
    },
    "values": {
        "metric1": 433,
        "metric2": 676.343
    }
}
```

The bolt that would emit statistics once per minute can be defined as:

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "accumulator",
    "inputs": [{ "source": "pump" }],
    "init": {
        "granularity": 60000
    }
}
```````````````````````````````

The result would be something like:

```````````````````````````````json
{
    "ts": 12340000,
    "name": "amount.field1=val1.field2=val2",
    "stats": { "min": 123, "max": 123, "avg": 123, "count": 1 }
}
```````````````````````````````

Other options:

- `emit_zero_counts` - By default the bolt emits only stats for tag combination that have been observed in the given interval. To have it emit zero counts for all tag combinations that have been observed in the past, set flag `emit_zero_counts` to `true`.
- `ignore_tags` - list of tag names (string) to ignore and not calculate metrics on.
- `partition_tags` - list of tag names (string) that are mandatory and will always be present in metric statistics. No statistics will be tracked for tag partitions without these metrics.
- `emit_gdr` - (default=false) this option makes the bolt emit its data in GDR format. The result would be something like:

```````````````````````````````json
{
    "ts": 12340000,
    "tags": {
        "$name": "amount.field1=val1.field2=val2",
        "$metric": "amount",
        "field1": "val1",
        "field2": "val2"
    },
    "values": { "min": 123, "max": 123, "avg": 123, "count": 1 }
}
```````````````````````````````


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
    "cmd": "test",
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

### Delaying the messages

Optionally, one can use parameters `delay_start` (delay before the first tuple is emitted) and `delay_between` (delay between two consecutive tuples) to control when tuples are emitted. The parameter values are in miliseconds.

## Timer spout

`cmd="timer"`

This spout emits new record on every heartbeat. The record contains title (`title`) and timestamp (`ts`) fields. Additional constant fields can be defined via configuration - these fields are simply attached to the message.

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

## Transform bolt

`cmd="transform"`

This bolt transforms incoming data object according to `output_template` and forwards it on to listeners.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "transform",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "output_template": {
            "ts": "ts",
            "tags": {
                "country": "country",
                "browser": "user.browser"
            },
            "values": {
                "amount": "amount",
                "duration": "duration"
            }
        }
    }
}
```````````````````````````````

> The structure of output object is the same as template.

> The values of output data are retrieved from the source object, by using property names. Nested properties are referenced by `parent.child.child...` notation.

This bolt will, upon receiving a new message like this one:

``````````````````````````````json
{
    "ts": "2017-10-01",
    "country": "SI",
    "user": { "browser": "Chrome" },
    "amount": 123.45,
    "duration": 432
}
``````````````````````````````

Emit a new message like this:

``````````````````````````````json
{
    "ts": "2017-10-01",
    "tags": { "country": "SI", "browser": "Chrome" },
    "values": { "amount": 123.45, "duration": 432 }
}
``````````````````````````````

Multiple emits are supported. Just pass an array of templates as input of initialization

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "transform",
    "inputs": [{ "source": "pump1" }],
    "init": {
        "output_template": [
            { "ts": "ts" },
            { "a": "ts", "b": "name" }
        ]
    }
}
```````````````````````````````

This bolt will, upon receiving a new message like this one:

``````````````````````````````json
{ "ts": "2017-10-01", "name": "SI" }
``````````````````````````````

Emit 2 new messages like this:

``````````````````````````````json
{ "ts": "2017-10-01" }
{ "a": "2017-10-01", "b": "SI" }
``````````````````````````````

### QEWD syntax

If needed one can use qewd syntax (uses mustache-like syntax `{{}}`) and its library. Just set option `use_qewd` to `true`:

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "transform",
    "inputs": [{ "source": "pump1" }],
    "init": {
        "use_qewd": true,
        "output_template": {
            "ts": "{{ts}}",
            "tags": { "composite": "{{country}}-{{user.browser}}" },
            "values": { "amount": "{{amount}}" }
        }
    }
}
```````````````````````````````

This bolt will, upon receiving a new message like this one:

``````````````````````````````json
{
    "ts": "2017-10-01",
    "country": "SI",
    "user": { "browser": "Chrome", },
    "amount": 123.45,
    "duration": 432
}
``````````````````````````````

Emit a new message like this:

``````````````````````````````json
{
    "ts": "2017-10-01",
    "tags": { "composite": "SI-Chrome" },
    "values": { "amount": 123.45 }
}
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

## Forward bolt

`cmd="forward"`

This bolt forwards all incoming messages to all listeners. Useful for collecting many inputs and for broadcasting to many listeners.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "filter",
    "inputs": [
        { "source": "pump1" },
        { "source": "pump2" }
    ],
    "init": {}
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

```````````json
2017-05-14T15:52:07.341 {"ts":"2017-03-16T12:36:33.952Z","a":14.3}
```````````

### File splitting

The log file can be huge, so the bolt provides option to split files after each time interval. Just set option `split_over_time` to `true` and `split_period` to number of milliseconds that you want to use (3600000 means one hour). The bolt will create new file for each interval (as long as there is some data to write). The timestamp of the interval will be injected into the name of the file.

For example, setting options to

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

#### Splitting by field value

If you want to send data to different file depending on the value of single field, you can set `split_by_field` settings

For example, setting options to

```````````````json
{
    "file_name_template": "./log.txt",
    "split_over_time": true,
    "split_period": 3600000,
    "split_by_field": "server"
}
```````````````

and processing the data such as

``````json
{ "server": "server1" }
{ "server": "server2" }
{ "server": "server3" }
``````

will write data into files with names like:

- `log_2017_05_15T12:00:00_server1.txt`
- `log_2017_05_15T12:00:00_server2.txt`
- `log_2017_05_15T12:00:00_server3.txt`
- `log_2017_05_15T13:00:00_server1.txt`
- `log_2017_05_15T13:00:00_server2.txt`
- `log_2017_05_15T13:00:00_server3.txt`
- ....

> Values of this field must be filename-friendly!

### Delete existing file

You can instruct the bolt to delete existing file at startup by setting option `delete_existing` to `true`. The initialization options in the config file will look something like this:

```````````json
{
    "file_name_template": "./log.txt",
    "delete_existing": true
}
```````````

> This option only works when `split_over_time` is set to `false` or skipped.

### Compressing older files

You can instruct the bolt to compress older files by setting option `compress` to `true`. The initialization options in the config file will look something like this:

```````````json
{
    "file_name_template": "./log.txt",
    "split_over_time": true,
    "split_period": 5000,
    "compress": true
}
```````````

This will cause the files to be zipped like this:

- `log_2017_05_15T12:00:00.txt_0.gz`
- `log_2017_05_15T13:00:00.txt_0.gz`
- `log_2017_05_15T14:00:00.txt`

Only the current file (the one that we are still writing into) will not be compressed. The latest file will be compressed upon shutdown.

> This option only works when `split_over_time` is set to `true`.

> If there already exists a gzipped file with the same name (e.g. `log_2017_05_15T13:00:00.txt_0.gz`), a new file with an increased postfix will be created (e.g. `log_2017_05_15T13:00:00.txt_1.gz`).

## File-append bolt extended

`cmd="file_append_ex"`

This bolt is in essence very similar to the `file_append` bolt type, but with the following differences:

- It always splits files with time - init parameter `split_period` is required.
- "Current time" is read from the data, from specified field (instead of current system time) - init parameter `timestamp_field` is required.
- It always splits files on given data field - init parameter `split_by_field` is required.
- It always compresses the files
- It never prepends timestamp

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "file_append_ex",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "file_name_template": "./log.txt",
        "split_period": 60000,
        "split_by_field": "server",
        "timestamp_field": "ts"
    }
}
```````````````````````````````

## CSV file-append bolt

`cmd=file_append_csv`

This bolt attaches incoming messages as `JSON` and appends them to output file in CSV format.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "file_append_csv",
    "inputs": [
        { "source": "pump1" }
    ],
    "init": {
        "file_name": "./logs/log.txt",
        "delete_existing": true,
        "delimiter": ",",
        "fields": ["ts", "tags.name", "values.value1"],
        "header": "ts,name,value"
    }
}
```````````````````````````````

This example will log all incoming data into file `log.txt` inside `logs` subdirectory of current directory. The directory must already exist.

The output will be written in CSV format. The parameters are the following:

- `file_name` - Name of the output file.
- `delete_existing` - Should output file be deleted if it already exists. Optional, default is `false`.
- `delimiter` - Delimiter string between values. Optional, default is ",".
- `fields` - List of CSV fields. Optional. The names in settings denote path to actual values in the data. If this field is not present, the sorted list of the top-level properties of the first received record are used as fields. 
- `header` - Header line. Optional. If skipped, no header line will be printed.

## Router bolt

`cmd="router"`

This bolt routes incoming messages to separate stream ids, depending on the route filters.
If filters for several routes succeed, the message is sent to all stream ids.

```````````````````````````````json
{
    "name": "bolt1",
    "working_dir": ".",
    "type": "sys",
    "cmd": "router",
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

## Task-bolt base

This bolt-base is used for bolts that need to execute some functionality on predefioned intervals (similar to CRON jobs). Developer needs to overwrite `runInternal` method to execute the custom functionality, other features aretaken care of by the base class - e.g. parsing of settings, calling the custom code in predefined intervals, shutdown handling etc.

Custom code:

```````````````````````````````javascript
const qt = require("qtopology");

class CustomTaskBolt extends qt.TaskBoltBase {

    constructor() {
        super();
        this.custom_text = null;
    }

    init(name, config, context, callback) {
        let self = this;
        super.init(name, config, context, (err) => {
            if (err) return callback(err);
            self.custom_text = config.text;
            callback();
        })
    }

    runInternal(callback) {
        let self = this;
        console.log("Custom output from task bolt (1): " + self.custom_text);
        callback();
    }
}

/////////////////////////////////////////////////////////
exports.create = function () {
    return new CustomTaskBolt();
};
```````````````````````````````

Bolt configuration inside the topology:

```json
{
    "name": "task_bolt",
    "working_dir": ".",
    "type": "inproc",
    "cmd": "custom_task.js",
    "inputs": [],
    "init": {
        "repeat_after": 5000,
        "text": "Some custom text from config"
    }
}
```
