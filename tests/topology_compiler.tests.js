"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const tc = require("../src/topology_compiler");


describe('TopologyCompiler', function () {
    describe('Ok configs', function () {
        it('empty arrays', function () {
            let config = {
                general: {},
                workers: [],
                spouts: [],
                bolts: [],
                variables: {}
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
        });
        it('1 worker, 1 spout, 1 bolt', function () {
            let config = {
                general: {},
                workers: [
                    { name: "wrkr1" }
                ],
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }],
                variables: {}
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            assert.deepEqual(tcc.getWorkerNames(), ["wrkr1"]);
            assert.deepEqual(tcc.getConfigForWorker("wrkr1"), {
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }]
            });
            //assert.throws(() => { tcc.compile() }, Error, "Should throw an error");
        });
        it('1 worker, 1 spout, 1 bolt + variables', function () {
            let config = {
                general: {},
                workers: [
                    { name: "wrkr1" }
                ],
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: "/${MY_VAR}/dir1",
                        cmd: "${MY_VAR2}.js",
                        init: {
                            a: "-${MY_VAR2}-"
                        }
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: "/${MY_VAR}/dir1",
                        cmd: "${MY_VAR2}_bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {
                            b: {
                                a: "-${MY_VAR2}-"
                            }
                        }
                    }],
                variables: {
                    MY_VAR: "my_var",
                    MY_VAR2: "my_var2"
                }
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            assert.deepEqual(tcc.getWorkerNames(), ["wrkr1"]);
            assert.deepEqual(tcc.getConfigForWorker("wrkr1"), {
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: "/my_var/dir1",
                        cmd: "my_var2.js",
                        init: {
                            a: "-my_var2-"
                        }
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: "/my_var/dir1",
                        cmd: "my_var2_bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {
                            b: {
                                a: "-my_var2-"
                            }
                        }
                    }]
            });
            //assert.throws(() => { tcc.compile() }, Error, "Should throw an error");
        });
        it('2 workers, 2 spouts, 2 bolts', function () {
            let config = {
                general: {},
                workers: [
                    { name: "wrkr1" },
                    { name: "wrkr2" }
                ],
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    },
                    {
                        name: "spout2",
                        worker: "wrkr2",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout2.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    },
                    {
                        name: "bolt2",
                        worker: "wrkr2",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt2.js",
                        inputs: [{ source: "spout2" }],
                        init: {}
                    }
                ],
                variables: {}
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            assert.deepEqual(tcc.getWorkerNames(), ["wrkr1", "wrkr2"]);
            assert.deepEqual(tcc.getConfigForWorker("wrkr1"), {
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }]
            });

            assert.deepEqual(tcc.getConfigForWorker("wrkr2"), {
                spouts: [
                    {
                        name: "spout2",
                        worker: "wrkr2",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout2.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt2",
                        worker: "wrkr2",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt2.js",
                        inputs: [{ source: "spout2" }],
                        init: {}
                    }]
            });
        });
    });

    describe('Bad configs', function () {

        let create = function () {
            return {
                general: {},
                workers: [
                    { name: "wrkr1" }
                ],
                spouts: [
                    {
                        name: "spout1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        worker: "wrkr1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }],
                variables: {}
            };
        };
        it('1 worker, 1 spout, 1 bolt - bad worker name', function () {
            let config = create();
            config.bolts[0].worker = "wrkrx";
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 worker, 1 spout, 1 bolt - bad input source reference', function () {
            let config = create();
            config.bolts[0].inputs[0].source = "spoutx";
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 worker, 1 spout, 1 bolt - duplicate bolt name', function () {
            let config = create();
            config.bolts.push(JSON.parse(JSON.stringify(config.bolts[0])));
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 worker, 1 spout, 1 bolt - duplicate spout name', function () {
            let config = create();
            config.spouts.push(JSON.parse(JSON.stringify(config.spouts[0])));
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
    });
});

