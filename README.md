# QTopology

![Build status](https://travis-ci.org/qminer/qtopology.svg?branch=master "Travis CI status")
![npm version](https://badge.fury.io/js/qtopology.svg "NPM version")

NPM package: [https://www.npmjs.com/package/qtopology](https://www.npmjs.com/package/qtopology)

Documentation [https://qminer.github.io/qtopology](https://qminer.github.io/qtopology)

## Installation

`````````````bash
npm install qtopology
`````````````

## Intro

QTopology is a distributed stream processing layer, written in `node.js`.

It uses the following terminology, originating in [Storm](http://storm.apache.org/) project:

- **Topology** - Organization of nodes into a graph that determines paths where messages must travel.
- **Bolt** - Node in topology that receives input data from other nodes and emits new data into the topology.
- **Spout** - Node in topology that reads data from external sources and emits the data into the topology.
- **Stream** - When data flows through the topology, it is optionaly tagged with stream ID. This can be used for routing.

When running in distributed mode, `qtopology` also uses the following:

- **Coordination storage** - must be resilient, receives worker registrations and sends them the initialization data. Also sends shutdown signals. Implementation is custom. `QTopology` provides `REST`-based service out-of-the-box, but the design is similar for other options like `MySQL` storage etc.
- **Worker** - Runs on single server. Registers with coordination storage, receives initialization data and instantiates local topologies in separate subprocesses.
    - **Leader** - one of the active workers is announced leader and it performs leadership tasks such as assigning of topologies to workers, detection of dead or inactive workers.

## Quick start

See [documentation](https://qminer.github.io/qtopology/)
