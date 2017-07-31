"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const colors = require("colors/safe");
// log levels
const DEBUG = 0;
const INFO = 1;
const NORMAL = 1;
const WARN = 2;
const ERROR = 3;
const default_length = 1000;
function makeErrString(msg, max_len) {
    max_len = max_len || default_length;
    let res = "" + msg;
    if (res.length < max_len)
        return res;
    return res.substr(0, max_len);
}
/** Simple logger into console */
class ConsoleLogger {
    /** Constructor */
    constructor() {
        this.setLevel("debug");
    }
    /** Gets logging level */
    getLevel() {
        return this.level;
    }
    /** Gets logging level */
    getLevelNum() {
        return this.curr_level;
    }
    /** Maps string level to umber */
    mapLevel(level) {
        level = level.toLowerCase();
        if (level == "debug") {
            return DEBUG;
        }
        else if (level == "log") {
            return INFO;
        }
        else if (level == "info") {
            return INFO;
        }
        else if (level == "normal") {
            return NORMAL;
        }
        else if (level == "warn") {
            return WARN;
        }
        else if (level == "error") {
            return ERROR;
        }
        return INFO;
    }
    /** Sets logging level */
    setLevel(level) {
        level = level.toLowerCase();
        this.curr_level = this.mapLevel(level);
        this.level = level;
    }
    /** Returns true if debug level logging is enabled. */
    isDebug() {
        return this.curr_level <= DEBUG;
    }
    /** Returns true if normal level logging is enabled. */
    isLog() {
        return this.curr_level <= NORMAL;
    }
    /** Returns true if info level logging is enabled. */
    isInfo() {
        return this.isLog();
    }
    /** Returns true if warning level logging is enabled. */
    isWarn() {
        return this.curr_level <= WARN;
    }
    /** Returns true if important level logging is enabled. */
    isImportant() {
        return this.curr_level <= WARN;
    }
    /** Returns true if error level logging is enabled. */
    isError() {
        return this.curr_level <= ERROR;
    }
    /** Print normal text*/
    logInner(msg, max_len) {
        console.log(makeErrString(msg, max_len));
    }
    /** Print grayed text*/
    debug(msg, max_len) {
        if (this.isDebug()) {
            this.logInner(colors.gray(makeErrString(msg, max_len)));
        }
    }
    /** Print normal text*/
    info(msg, max_len) {
        if (this.isInfo()) {
            this.logInner(msg, max_len);
        }
    }
    /** Print normal text*/
    log(msg, max_len) {
        if (this.isLog()) {
            this.logInner(makeErrString(msg, max_len));
        }
    }
    /** Print yellow text*/
    warn(msg, max_len) {
        if (this.isWarn()) {
            this.logInner(colors.yellow(makeErrString(msg, max_len)));
        }
    }
    /** Print cyan text*/
    important(msg, max_len) {
        if (this.isImportant()) {
            this.logInner(colors.cyan(makeErrString(msg, max_len)));
        }
    }
    /** Print red text*/
    error(msg, max_len) {
        if (this.isError()) {
            this.logInner(colors.red(makeErrString(msg, max_len)));
        }
    }
    /** Print red text*/
    exception(err, max_len) {
        if (this.isError()) {
            this.logInner(colors.red(makeErrString(err.message + " " + err.stack, max_len)));
        }
    }
}
let singleton = new ConsoleLogger();
function logger() {
    return singleton;
}
exports.logger = logger;
function setLogger(new_logger) {
    singleton = new_logger;
}
exports.setLogger = setLogger;
//# sourceMappingURL=logger.js.map