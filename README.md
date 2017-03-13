# qtopology

![Build status](https://travis-ci.org/bergloman/qtopology.svg?branch=master "Travis CI status")

QTopology is a distributed stream processing layer, written in `node.js`.

It uses the following terminology, originating in [Storm](http://storm.apache.org/) project:

- **Topology** - Organization of nodes into a graph that determines paths where messages must travel.
- **Bolt** - Node in topology that receives input data from other nodes and emits new data into the topology.
- **Spout** - Node in topology that reads data from external sources and emits the data into the topology.

When running in distributed mode, `qtopology` also use the following:

- **Coordinator** - reads global settings, receives worker registrations and send them the initialization data. Also sends shutdown signal.
- **Worker** - registers with coordinator, receives initialization data and instantiates local topology.
