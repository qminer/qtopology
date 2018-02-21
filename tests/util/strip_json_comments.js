"use strict";

/*global describe, it, before, beforeEach, after, afterEach */

const assert = require("assert");
const qtopology = require("../..");

describe('stripJsonComments', function () {
    it('single-line comment', function () {
        let s = "{\n // abc \n            \"a\": 12 \n }";
        let s_stripped = qtopology.stripJsonComments(s);
        assert.deepEqual(JSON.parse(s_stripped), { a: 12});
    });
    it('open-close comment', function () {
        let s = "{\n /* abc \n      asdasd   */   \"a\": 12 \n }";
        let s_stripped = qtopology.stripJsonComments(s);
        assert.deepEqual(JSON.parse(s_stripped), { a: 12});
    });


    it('mixed comment 1', function () {
        let s = "{\n // /* abc \n         \"a\": 12 \n }";
        let s_stripped = qtopology.stripJsonComments(s);
        assert.deepEqual(JSON.parse(s_stripped), { a: 12});
    });

    it('mixed comment 2', function () {
        let s = "{\n /* abc \n  // abc \n */       \"a\": 12 \n }";
        let s_stripped = qtopology.stripJsonComments(s);
        assert.deepEqual(JSON.parse(s_stripped), { a: 12});
    });
});

