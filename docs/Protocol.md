# Topology protocol

## Coordinator

When started, it reads and compiles the topology settings.

It also opens specified port for coordination requests.

## Worker

When started, needs to be given:

- address of the coordinator (server and port)
- logical name

It opens connection to the coordinator, awaiting instructions.

After registration with coordinator succeeds, it starts local topology.

## Local topology

This object:

- starts nodes (spouts and bolts)
- sends them commands, e.g. `init`, `run`, `pause`

## Sequence between coordinator, worker and local topology

| Coordinator | Worker | Local topology |
|-------------|--------|-----|
| Sends `introduce` command (when worker connects)| |
| | Sends `register` command (with name of the worker)|
| Sends `init` command (when all workers register)| |
| | &rarr; | Starts processes for bolts and spouts|
| | Sends `init_confirmed` command (after it initializes internal structure)|
| Sends `run` command (when all workers initialize)| |
| | &rarr; | Sends `run` command to bolts and spouts, starts polling spouts for data|
| Sends `pause` command (work is resumed later with `run` command)| |
| | &rarr; | Sends `pause` command to bolts and spouts, stops polling spouts for data|
| Sends `shutdown` command| |
| | &rarr; | Sends `shutdown` command to bolts and spouts, stops polling spouts for data|

## Sequence between local topology and child processes

### Bolts

| Local topology | Child process |
|-------------|--------|
| Starts child process | Starts and uses command-line arguments |
| Sends `init` command | |
| | Initializes and send `init_completed` |
| Sends `data` command | |
| | Processes data and optionally emits `data` command (zero, one or many) |
| Sends `heartbeat` command | |
| | Reacts to heartbeat and optionally emits `data` command (zero, one or many) |
| Sends `shutdown` command| |
| | Must gracefully stop the process |

### Spouts

| Local topology | Child process |
|-------------|--------|
| Starts child process | Starts and uses command-line arguments |
| Sends `init` command | |
| | Initializes and send `init_completed` |
| Sends `next` command | |
| | Either emits exactly one `data` command or `empty` command |
| Sends `heartbeat` command | |
| | Reacts to heartbeat and optionally emits `data` command (zero, one or many) |
| Sends `shutdown` command| |
| | Must gracefully stop the process |

