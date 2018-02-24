"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const lb = require("../../built/util/load_balance");

describe('LoadBalancer', function () {
    describe('constructor', function () {
        it('empty list', function () {
            let data = [];
            assert.throws(() => { let target = new lb.LoadBalancer(data); }, Error, "Should throw an error");
        });
        it('non-empty list', function () {
            let data = [
                { name: "wrkr1", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
        });
    });
    describe('1 worker', function () {
        it('non-empty list', function () {
            let data = [
                { name: "wrkr1", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
        });
    });
    describe('2 workers', function () {
        it('same initial load', function () {
            let data = [
                { name: "wrkr1", weight: 1 },
                { name: "wrkr2", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
        });
        it('different initial load - wrkr1 is higher', function () {
            let data = [
                { name: "wrkr1", weight: 4 },
                { name: "wrkr2", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
        });
        it('different initial load - wrkr2 is higher', function () {
            let data = [
                { name: "wrkr1", weight: 1 },
                { name: "wrkr2", weight: 4 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
        });
    });
    describe('3 workers', function () {
        it('same initial load', function () {
            let data = [
                { name: "wrkr1", weight: 1 },
                { name: "wrkr2", weight: 1 },
                { name: "wrkr3", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
        });
        it('different initial load - wrkr1 is highest', function () {
            let data = [
                { name: "wrkr1", weight: 4 },
                { name: "wrkr2", weight: 1 },
                { name: "wrkr3", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
        });
        it('different initial load - wrkr2 is highest', function () {
            let data = [
                { name: "wrkr1", weight: 1 },
                { name: "wrkr2", weight: 4 },
                { name: "wrkr3", weight: 1 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
        });
        it('different initial load - wrkr3 is highest', function () {
            let data = [
                { name: "wrkr1", weight: 1 },
                { name: "wrkr2", weight: 1 },
                { name: "wrkr3", weight: 4 }
            ];
            let target = new lb.LoadBalancer(data);
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
        });
    });
});
describe('LoadBalancerEx', function () {
    describe('Simple tests without affinity', function () {
        describe('constructor', function () {
            it('empty list', function () {
                let data = [];
                assert.throws(() => { let target = new lb.LoadBalancerEx(data); }, Error, "Should throw an error");
            });
            it('non-empty list', function () {
                let data = [
                    { name: "wrkr1", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
            });
        });
        describe('1 worker', function () {
            it('non-empty list', function () {
                let data = [
                    { name: "wrkr1", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
            });
        });
        describe('2 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            });
            it('different initial load - wrkr1 is higher', function () {
                let data = [
                    { name: "wrkr1", weight: 4 },
                    { name: "wrkr2", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            });
            it('different initial load - wrkr2 is higher', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 4 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
            });
        });
        describe('3 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 1 },
                    { name: "wrkr3", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            });
            it('different initial load - wrkr1 is highest', function () {
                let data = [
                    { name: "wrkr1", weight: 4 },
                    { name: "wrkr2", weight: 1 },
                    { name: "wrkr3", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            });
            it('different initial load - wrkr2 is highest', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 4 },
                    { name: "wrkr3", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            });
            it('different initial load - wrkr3 is highest', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 1 },
                    { name: "wrkr3", weight: 4 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(), "wrkr3", "Incorrect worker proposed");
            });
        });
    });
    describe('Tests with affinity, equal load', function () {
        describe('2 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
            });
            it('different initial load - wrkr1 is higher', function () {
                let data = [
                    { name: "wrkr1", weight: 3 },
                    { name: "wrkr2", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
            });
            it('different initial load - wrkr2 is higher', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 1 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
            });
        });
        describe('3 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 0 },
                    { name: "wrkr3", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
            });
            it('different initial load - wrkr1 is highest', function () {
                let data = [
                    { name: "wrkr1", weight: 4 },
                    { name: "wrkr2", weight: 0 },
                    { name: "wrkr3", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
            });
            it('different initial load - wrkr2 is highest', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 1 },
                    { name: "wrkr3", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"]), "wrkr3", "Incorrect worker proposed");
            });
        });
    });
    describe('Tests without affinity, unequal load', function () {
        describe('2 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(null, 2), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 2), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
            });
            it('uneven initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(null, 2), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 2), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(null, 1), "wrkr1", "Incorrect worker proposed");
            });
        });
    });
    describe('Tests with affinity, unequal load', function () {
        describe('2 workers', function () {
            it('same initial load', function () {
                let data = [
                    { name: "wrkr1", weight: 0 },
                    { name: "wrkr2", weight: 0 }
                ];
                let target = new lb.LoadBalancerEx(data);
                assert.equal(target.next(["wrkr1"], 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 4), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 2), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 7), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr2", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 5), "wrkr1", "Incorrect worker proposed");
                assert.equal(target.next(["wrkr1"], 1), "wrkr2", "Incorrect worker proposed");
            });
        });
    });
    describe.only('Rebalancing', function () {
        describe('2 workers', function () {

            function performChanges(workers, topologies, changes) {
                for (let change of changes){
                    let t = topologies.filter(x =>x.uuid == change.uuid)[0];
                    let w1 = workers.filter(x => x.name == change.worker_old)[0];
                    let w2 = workers.filter(x => x.name == change.worker_new)[0];
                    t.worker = w2.name;
                    w1.weight -= t.weight;
                    w2.weight += t.weight;
                }
            }

            it('same initial load, no weights, no affinity', function () {
                let data = [
                    { name: "wrkr1", weight: 1 },
                    { name: "wrkr2", weight: 1 }
                ];
                let topologies = [
                    { uuid: "a", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "b", worker: "wrkr2", weight: 1, affinity: [] }
                ];
                let target = new lb.LoadBalancerEx(data);
                let res = target.rebalance(topologies);
                assert.equal(res.score, 0);
                assert.equal(res.changes.length, 0);
                // another rebalance produces no changes
                performChanges(data, topologies, res.changes);
                res = target.rebalance(topologies);
                assert.equal(res.changes.length, 0);
            });
            it('different initial load, no weights, no affinity', function () {
                let data = [
                    { name: "wrkr1", weight: 2 },
                    { name: "wrkr2", weight: 0 }
                ];
                let topologies = [
                    { uuid: "a", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "b", worker: "wrkr1", weight: 1, affinity: [] }
                ];
                let target = new lb.LoadBalancerEx(data);
                let res = target.rebalance(topologies);
                assert.equal(res.changes.length, 1);
                assert.deepEqual(res.changes[0], { uuid: "b", worker_old: "wrkr1", worker_new: "wrkr2" });
                assert.equal(res.score, 51);
                // another rebalance produces no changes
                performChanges(data, topologies, res.changes);
                res = target.rebalance(topologies);
                assert.equal(res.changes.length, 0);
            });
            it('different initial load, with weights, no affinity', function () {
                let data = [
                    { name: "wrkr1", weight: 7 },
                    { name: "wrkr2", weight: 0 }
                ];
                let topologies = [
                    { uuid: "a", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "b", worker: "wrkr1", weight: 6, affinity: [] }
                ];
                let target = new lb.LoadBalancerEx(data);
                let res = target.rebalance(topologies);
                assert.equal(res.changes.length, 1);
                assert.deepEqual(res.changes[0], { uuid: "a", worker_old: "wrkr1", worker_new: "wrkr2" });
                assert.equal(res.score, (101 + 1 / 6) / 2);
                // another rebalance produces no changes
                performChanges(data, topologies, res.changes);
                res = target.rebalance(topologies);
                assert.equal(res.changes.length, 0);
            });
            it('different initial load, no weights, with affinity', function () {
                let data = [
                    { name: "wrkr1", weight: 2 },
                    { name: "wrkr2", weight: 0 }
                ];
                let topologies = [
                    { uuid: "a", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "b", worker: "wrkr1", weight: 1, affinity: ["wrkr1"] }
                ];
                let target = new lb.LoadBalancerEx(data);
                let res = target.rebalance(topologies);
                assert.equal(res.changes.length, 1);
                assert.deepEqual(res.changes[0], { uuid: "a", worker_old: "wrkr1", worker_new: "wrkr2" });
                assert.equal(res.score, 51);
                // another rebalance produces no changes
                performChanges(data, topologies, res.changes);
                res = target.rebalance(topologies);
                assert.equal(res.changes.length, 0);
            });
            it('same initial load, many topologies, no weights, no affinity', function () {
                let data = [
                    { name: "wrkr1", weight: 7 },
                    { name: "wrkr2", weight: 8 }
                ];
                let topologies = [
                    { uuid: "t1", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t2", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t3", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t4", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t5", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t6", worker: "wrkr1", weight: 1, affinity: [] },
                    { uuid: "t7", worker: "wrkr1", weight: 1, affinity: [] },

                    { uuid: "t21", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t22", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t23", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t24", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t25", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t26", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t27", worker: "wrkr2", weight: 1, affinity: [] },
                    { uuid: "t28", worker: "wrkr2", weight: 1, affinity: [] }
                ];
                let target = new lb.LoadBalancerEx(data);
                let res = target.rebalance(topologies);
                //assert.equal(res.score, 0);
                assert.equal(res.changes.length, 0);
                // another rebalance produces no changes
                performChanges(data, topologies, res.changes);
                res = target.rebalance(topologies);
                assert.equal(res.changes.length, 0);
            });
        });
    });
});
