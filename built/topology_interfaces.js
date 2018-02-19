"use strict";
/////////////////////////////////////////////////////////////////////////
// Different callbacks
Object.defineProperty(exports, "__esModule", { value: true });
var ParentMsgCode;
(function (ParentMsgCode) {
    ParentMsgCode[ParentMsgCode["init"] = 0] = "init";
    ParentMsgCode[ParentMsgCode["run"] = 1] = "run";
    ParentMsgCode[ParentMsgCode["pause"] = 2] = "pause";
    ParentMsgCode[ParentMsgCode["ping"] = 3] = "ping";
    ParentMsgCode[ParentMsgCode["shutdown"] = 4] = "shutdown";
})(ParentMsgCode = exports.ParentMsgCode || (exports.ParentMsgCode = {}));
var ChildMsgCode;
(function (ChildMsgCode) {
    ChildMsgCode[ChildMsgCode["response_init"] = 0] = "response_init";
    ChildMsgCode[ChildMsgCode["response_run"] = 1] = "response_run";
    ChildMsgCode[ChildMsgCode["response_pause"] = 2] = "response_pause";
    ChildMsgCode[ChildMsgCode["response_ping"] = 3] = "response_ping";
    ChildMsgCode[ChildMsgCode["response_shutdown"] = 4] = "response_shutdown";
    ChildMsgCode[ChildMsgCode["error"] = 5] = "error";
})(ChildMsgCode = exports.ChildMsgCode || (exports.ChildMsgCode = {}));
var ChildExitCode;
(function (ChildExitCode) {
    ChildExitCode[ChildExitCode["exit_ok"] = 0] = "exit_ok";
    ChildExitCode[ChildExitCode["parent_disconnect"] = 1] = "parent_disconnect";
    ChildExitCode[ChildExitCode["parent_ping_timeout"] = 2] = "parent_ping_timeout";
    ChildExitCode[ChildExitCode["init_error"] = 10] = "init_error";
    ChildExitCode[ChildExitCode["pause_error"] = 20] = "pause_error";
    ChildExitCode[ChildExitCode["run_error"] = 25] = "run_error";
    ChildExitCode[ChildExitCode["shutdown_notinit_error"] = 30] = "shutdown_notinit_error";
    ChildExitCode[ChildExitCode["shutdown_internal_error"] = 40] = "shutdown_internal_error";
    ChildExitCode[ChildExitCode["shutdown_unlikely_error"] = 41] = "shutdown_unlikely_error";
    ChildExitCode[ChildExitCode["internal_error"] = 110] = "internal_error";
    ChildExitCode[ChildExitCode["unhandeled_error"] = 999] = "unhandeled_error";
})(ChildExitCode = exports.ChildExitCode || (exports.ChildExitCode = {}));
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
        disabled: "disabled",
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
    },
    LeaderMessages: {
        rebalance: "rebalance",
        set_enabled: "set_enabled",
        set_disabled: "set_disabled",
        start_topology: "start_topology",
        start_topologies: "start_topologies",
        stop_topology: "stop_topology",
        stop_topologies: "stop_topologies",
        kill_topology: "kill_topology",
        shutdown: "shutdown"
    }
};
//# sourceMappingURL=topology_interfaces.js.map