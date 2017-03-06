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

## Sequence between

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

## Sequence

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





