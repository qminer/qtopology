# Topology protocol

The following components comprise the distributed setting for `qtopology`:

![Worker statuses](imgs/components.svg)

## Worker statuses

![Worker statuses](imgs/worker_statuses.svg)

## Topology statuses

![Topology statuses](imgs/topology_statuses.svg)

## Coordinator

When started, it reads and compiles the topology settings.

It also opens specified port for coordination requests.

## Worker

When started, needs to be given:

- method of coordination
- logical name

It opens connection to the coordinator, awaiting instructions. When registration with coordinator succeeds, it starts local topology.

## Local topology

This object:

- starts nodes (spouts and bolts)
- sends them commands, e.g. `init`, `run`, `pause`, `shutdown`

## Sequence between coordinator, worker and local topology

The worker first performs the initialization sequence and the runs two sequences in parallel, infinite loops:

- Leadership sequence
- Normal active-worker sequence

### Initial sequence

| Coordination storage | Worker |
|-------------|--------|
|  | Register worker | 
| Puts worker in worker list  |  | 

![Topology statuses](imgs/sequence_register.svg)

### Leadership sequence

| Coordination storage | Worker
|-------------|--------|
|  | Checks if leadership is established |
| Returns leadership status |  |
|  | If leadership is ok, do nothing more |
|  | Send leadership candidacy |
| Register candidacy |  |
|  | Check candidacy |
| Send `true` if candidacy sucessfull |  |
|  | If not elected leader, do nothing more |
|  | Get worker statuses |
| Return worker statuses after marking those with overdue pings as `dead` | |
| | For all `dead` workers unassign their topologies |
| Update statuses for these topologies | |
| | Pronounce `dead` workers as `unloaded` |
| Store new worker statuses | |
| | Get topology statuses |
| Get topology statuses after setting overdue `waiting` status to `unassigned` and setting topologies of `dead` worker to `unassigned`  | |
| | Assign `unassigned` and `stopped` topologies to new workers by setting the to status `waiting` |
| Store new statuses for these topologies | |
| Store messages for workers to load topologies | |

![Topology statuses](imgs/sequence_leader.svg)

### Active-worker sequence

| Coordination storage | Worker |
|-------------|--------|
|  | Get messages for this worker |
| Returns messages for this worker |  |
|  | Handle message such as "start topology" or "shutdown" |
| Update topology status if start successful |  |
|  |  |


![Topology statuses](imgs/sequence_worker.svg)

## Sequence between local topology and child processes

### Bolts

| Local topology | Child process |
|-------------|--------|
| Starts child process | Starts and uses command-line arguments |
| Sends `init` command | |
| | Initializes and send `init_completed` |
| Sends `data` command | |
| | Processes data and optionally emits `data` command (zero, one or many). When finished with this data item, emits `ack` event. |
| Sends `heartbeat` command | |
| | Reacts to heartbeat and optionally emits `data` command (zero, one or many) |
| Sends `shutdown` command| |
| | Must gracefully stop the process. |

### Spouts

| Local topology | Child process |
|-------------|--------|
| Starts child process | Starts and uses command-line arguments |
| Sends `init` command | |
| | Initializes and send `init_completed` |
| Sends `next` command | |
| | Either emits exactly one `data` command or `empty` command |
| When tuple is processed, sends `spout_ack` command | |
| | Optionally handles `spout_ack` command |
| Sends `heartbeat` command | |
| | Reacts to heartbeat and optionally emits `data` command (zero, one or many) |
| Sends `shutdown` command| |
| | Must gracefully stop the process |

