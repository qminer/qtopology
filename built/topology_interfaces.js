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
// export interface CoordinationStorageBrowser {
//     init(storage: CoordinationStorage, callback: SimpleCallback);
//     getFile(name: string, callback: SimpleResultCallback<string>);
//     getWorkerStatus(callback: SimpleResultCallback<string>);
//     getTopologyStatus(callback: SimpleResultCallback<string>);
//     postRegisterTopology(config: any, overwrite: boolean, callback: SimpleCallback);
//     postDisableTopology(uuid: string, callback: SimpleCallback);
//     postEnableTopology(uuid: string, callback: SimpleCallback);
//     postDeleteTopology(uuid: string, callback: SimpleCallback);
// }
//# sourceMappingURL=topology_interfaces.js.map