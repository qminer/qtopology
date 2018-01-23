"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const tc = require("../built/topology_compiler");

describe('TopologyCompiler', function () {
    describe('Ok configs', function () {
        it('empty arrays', function () {
            let config = {
                general: { heartbeat: 1000 },
                spouts: [],
                bolts: [],
                variables: {}
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
        });
        it('variable injection', function () {
            let config = {
                general: { heartbeat: 1000 },
                spouts: [],
                bolts: [],
                variables: {
                    "X": "file",
                    "Y": "dir${X}",
                    "Z": "dir${Y}",
                }
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            let compiled_config = tcc.getWholeConfig();
            assert.deepEqual(compiled_config.variables, {
                "X": "file",
                "Y": "dirfile",
                "Z": "dirdirfile",
            });
        });
        it('1 spout, 1 bolt', function () {
            let config = {
                general: { heartbeat: 1000 },
                spouts: [
                    {
                        name: "spout1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }
                ],
                variables: {}
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            assert.deepEqual(tcc.getWholeConfig(), {
                general: { heartbeat: 1000 },
                spouts: [
                    {
                        name: "spout1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }
                ],
                variables: {}
            });
        });
        it('1 spout, 1 bolt + variables', function () {
            let config = {
                general: {
                    heartbeat: 1000,
                    initialization: [
                        {
                            working_dir: "/${MY_VAR}/dir1",
                            cmd: "a",
                            init: {
                                a: "--${MY_VAR}--",
                                b: "--${MY_VAR2}--"
                            }
                        }],
                    shutdown: [
                        {
                            working_dir: "/${MY_VAR}/dir1",
                            cmd: "a",
                            init: {
                                c: "--${MY_VAR}--"
                            }
                        }]
                },
                spouts: [
                    {
                        name: "spout1",
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
                        type: "inproc",
                        working_dir: "/${MY_VAR}/dir1",
                        cmd: "${MY_VAR2}_bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {
                            b: {
                                a: "-${MY_VAR2}-"
                            }
                        }
                    }
                ],
                variables: {
                    MY_VAR: "my_var",
                    MY_VAR2: "my_var2"
                }
            };
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
            let output_config = tcc.getWholeConfig();
            assert.deepEqual(output_config.general.initialization[0].init, {
                a: "--my_var--",
                b: "--my_var2--"
            });
            assert.deepEqual(tcc.getWholeConfig(), {
                general: {
                    heartbeat: 1000,
                    initialization: [
                        {
                            working_dir: "/my_var/dir1",
                            cmd: "a",
                            init: {
                                a: "--my_var--",
                                b: "--my_var2--"
                            }
                        }],
                    shutdown: [
                        {
                            working_dir: "/my_var/dir1",
                            cmd: "a",
                            init: {
                                c: "--my_var--"
                            }
                        }]
                },
                spouts: [
                    {
                        name: "spout1",
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
                        type: "inproc",
                        working_dir: "/my_var/dir1",
                        cmd: "my_var2_bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {
                            b: {
                                a: "-my_var2-"
                            }
                        }
                    }
                ],
                variables: {
                    MY_VAR: "my_var",
                    MY_VAR2: "my_var2"
                }
            });
        });
        describe("injectable disabled", function () {
            it('1 spout, injectable disabled', function () {
                let config = {
                    general: { heartbeat: 1000 },
                    spouts: [
                        {
                            name: "spout1",
                            type: "inproc",
                            working_dir: ".",
                            disabled: "${XYZ}",
                            cmd: "spout.js",
                            init: {}
                        }
                    ],
                    bolts: [],
                    variables: {
                        XYZ: "true"
                    }
                };
                let tcc = new tc.TopologyCompiler(config);
                tcc.compile();
                assert.deepEqual(tcc.getWholeConfig(), {
                    general: { heartbeat: 1000 },
                    spouts: [
                        {
                            name: "spout1",
                            type: "inproc",
                            working_dir: ".",
                            disabled: true,
                            cmd: "spout.js",
                            init: {}
                        }
                    ],
                    bolts: [],
                    variables: {
                        XYZ: "true"
                    }
                });
            });
            it('1 bolt', function () {
                let config = {
                    general: { heartbeat: 1000 },
                    spouts: [],
                    bolts: [
                        {
                            name: "bolt1",
                            type: "inproc",
                            working_dir: ".",
                            cmd: "bolt.js",
                            disabled: "${XYZ}",
                            inputs: [],
                            init: {}
                        }
                    ],
                    variables: {
                        XYZ: "true"
                    }
                };
                let tcc = new tc.TopologyCompiler(config);
                tcc.compile();
                assert.deepEqual(tcc.getWholeConfig(), {
                    general: { heartbeat: 1000 },
                    spouts: [],
                    bolts: [
                        {
                            name: "bolt1",
                            type: "inproc",
                            working_dir: ".",
                            disabled: true,
                            cmd: "bolt.js",
                            inputs: [],
                            init: {}
                        }
                    ],
                    variables: {
                        XYZ: "true"
                    }
                });
            });
            it.only('1 spout, 1 bolt, disabled bolt', function () {
                let config = {
                    general: { heartbeat: 1000 },
                    spouts: [
                        {
                            name: "spout1",
                            type: "inproc",
                            working_dir: ".",
                            cmd: "spout.js",
                            init: {}
                        }
                    ],
                    bolts: [
                        {
                            name: "bolt1",
                            type: "inproc",
                            working_dir: ".",
                            cmd: "bolt.js",
                            inputs: [{ source: "spout1", disabled: "${XYZ}" }],
                            init: {}
                        }
                    ],
                    variables: {
                        XYZ: "true"
                    }
                };
                let tcc = new tc.TopologyCompiler(config);
                tcc.compile();
                assert.deepEqual(tcc.getWholeConfig(), {
                    general: { heartbeat: 1000 },
                    spouts: [
                        {
                            name: "spout1",
                            type: "inproc",
                            working_dir: ".",
                            cmd: "spout.js",
                            init: {}
                        }
                    ],
                    bolts: [
                        {
                            name: "bolt1",
                            type: "inproc",
                            working_dir: ".",
                            cmd: "bolt.js",
                            inputs: [{ source: "spout1", disabled: true }],
                            init: {}
                        }
                    ],
                    variables: {
                        XYZ: "true"
                    }
                });
            });

            it('init + shutdown + variables', function () {
                let config = {
                    general: {
                        heartbeat: 1000,
                        initialization: [
                            {
                                working_dir: "/${MY_VAR}/dir1",
                                cmd: "a",
                                disabled: "${MY_VAR}",
                                init: {}
                            }],
                        shutdown: [
                            {
                                working_dir: "/${MY_VAR}/dir1",
                                cmd: "a",
                                disabled: "${MY_VAR2}",
                                init: {}
                            }]
                    },
                    spouts: [],
                    bolts: [],
                    variables: {
                        MY_VAR: "true",
                        MY_VAR2: "false"
                    }
                };
                let tcc = new tc.TopologyCompiler(config);
                tcc.compile();
                assert.deepEqual(tcc.getWholeConfig(), {
                    general: {
                        heartbeat: 1000,
                        initialization: [
                            {
                                working_dir: "/true/dir1",
                                cmd: "a",
                                disabled: true,
                                init: {}
                            }],
                        shutdown: [
                            {
                                working_dir: "/true/dir1",
                                cmd: "a",
                                disabled: false,
                                init: {}
                            }]
                    },
                    spouts: [],
                    bolts: [],
                    variables: {
                        MY_VAR: "true",
                        MY_VAR2: "false"
                    }
                });
            });
        });
    });

    describe('Bad configs', function () {

        let create = function () {
            return {
                general: { heartbeat: 1000 },
                spouts: [
                    {
                        name: "spout1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "spout.js",
                        init: {}
                    }
                ],
                bolts: [
                    {
                        name: "bolt1",
                        type: "inproc",
                        working_dir: ".",
                        cmd: "bolt.js",
                        inputs: [{ source: "spout1" }],
                        init: {}
                    }],
                variables: {}
            };
        };
        it('1 spout, 1 bolt - valid schema', function () {
            let config = create();
            let tcc = new tc.TopologyCompiler(config);
            tcc.compile();
        });
        it('1 spout, 1 bolt - bad input source reference', function () {
            let config = create();
            config.bolts[0].inputs[0].source = "spoutx";
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 spout, 1 bolt - miss-spelled "stream_id", "stream" instead', function () {
            let config = create();
            config.bolts[0].inputs[0].stream = "some_stream";
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 spout, 1 bolt - duplicate bolt name', function () {
            let config = create();
            config.bolts.push(JSON.parse(JSON.stringify(config.bolts[0])));
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
        it('1 spout, 1 bolt - duplicate spout name', function () {
            let config = create();
            config.spouts.push(JSON.parse(JSON.stringify(config.spouts[0])));
            let tcc = new tc.TopologyCompiler(config);
            assert.throws(() => { tcc.compile(); }, Error, "Should throw an error");
        });
    });
});

