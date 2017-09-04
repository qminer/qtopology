"use strict";
/////////////////////////////////////////////////////////////////////////
// Different callbacks
Object.defineProperty(exports, "__esModule", { value: true });
var ParentMsgCode;
(function (ParentMsgCode) {
    ParentMsgCode[ParentMsgCode["init"] = 0] = "init";
    ParentMsgCode[ParentMsgCode["run"] = 1] = "run";
    ParentMsgCode[ParentMsgCode["pause"] = 2] = "pause";
    ParentMsgCode[ParentMsgCode["shutdown"] = 3] = "shutdown";
})(ParentMsgCode = exports.ParentMsgCode || (exports.ParentMsgCode = {}));
var ChildMsgCode;
(function (ChildMsgCode) {
    ChildMsgCode[ChildMsgCode["response_init"] = 0] = "response_init";
    ChildMsgCode[ChildMsgCode["response_run"] = 1] = "response_run";
    ChildMsgCode[ChildMsgCode["response_pause"] = 2] = "response_pause";
    ChildMsgCode[ChildMsgCode["response_shutdown"] = 3] = "response_shutdown";
})(ChildMsgCode = exports.ChildMsgCode || (exports.ChildMsgCode = {}));
////////////////////////////////////////////////////////////////////////
// Coordination-storage interface and its satelites
/**
 * Constants for using distributed functionality.
 */
exports.Consts = {
    LeadershipStatus: {
        vacant: "vacant",
        pending: "pending",
        ok: "ok"
    },
    WorkerStatus: {
        alive: "alive",
        closing: "closing",
        dead: "dead",
        unloaded: "unloaded"
    },
    WorkerLStatus: {
        leader: "leader",
        candidate: "candidate",
        normal: "normal"
    },
    TopologyStatus: {
        running: "running",
        waiting: "waiting",
        error: "error",
        unassigned: "unassigned"
    }
};
//# sourceMappingURL=topology_interfaces.js.map