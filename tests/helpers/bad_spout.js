"use strict";

let badLocations = {
    heartbeat: "heartbeat",
    shutdown: "shutdown",
    run: "run",
    pause: "pause",
    next: "next",
    init: "init",
}
let badActions = {
    throw: "throw",
    callbackException: "callbackException"
}

class BadSpout {
    constructor(subtype) {
        this._init_called = 0;
        this._heartbeat_called = 0;
        this._shutdown_called = 0;
        this._timeout = 0;

        if (subtype == badActions.throw) {
            this.action = badActions.throw;
            this.doAction();
        }
    }

    doAction(callback) {
        if (this.action == badActions.throw) {
            throw new Error();
        } else if (this.action == badActions.callbackException){
            setTimeout(()=> {
                return callback(new Error());
            }, this._timeout);
            return;
        }
        setTimeout(callback, this._timeout);
    }

    init(name, config, context, callback) {
        this._init_called++;
        this.name = name;
        this.onEmit = config.onEmit || (() => { });
        this.action = config.action;
        this.location = config.location;
        this._timeout = config.timeout || 0;

        if (this.location == badLocations.init) {
            this.doAction(callback);
        } else {
            setTimeout(callback, this._timeout);
        }
    }

    heartbeat() {
        this._heartbeat_called++;
        if (this.location == badLocations.heartbeat && this.action != badActions.callbackException) {
            this.doAction();
        }
    }

    shutdown(callback) {
        this._shutdown_called++;
        if (this.location == badLocations.shutdown) {
            this.doAction(callback);
        } else {
            setTimeout(callback, this._timeout);
        }
    }

    run() {
        if (this.location == badLocations.run && this.action == bb.badActions.throw) {
            this.doAction();
        }
    }

    pause() {
        if (this.location == badLocations.pause && this.action == bb.badActions.throw) {
            this.doAction();
        }
    }
    next(callback) {
        if (this.location == badLocations.next) {
            this.doAction(callback);
        } else {
            setTimeout(callback, this._timeout);
        }
    }
}


exports.badLocations = badLocations;
exports.badActions = badActions;

exports.create = function (subtype) {
    return new BadSpout(subtype);
}