import * as colors from "colors/safe";

/** Logging interfrace */
export interface Logger {
    /** Gets logging level */
    getLevel(): string;
    /** Gets logging level - as number */
    getLevelNum(): number;
    /** Sets logging level */
    setLevel(level: string);

    isDebug(): boolean;
    isLog(): boolean;
    isInfo(): boolean;
    isWarn(): boolean;
    isImportant(): boolean;
    isError(): boolean;

    debug(msg: string, max_len?: number);
    info(msg: string, max_len?: number);
    log(msg: string, max_len?: number);
    important(msg: string, max_len?: number);
    warn(msg: string, max_len?: number);
    error(msg: string, max_len?: number);
    exception(err: Error, max_len?: number);
}

// log levels
const DEBUG = 0;
const INFO = 1;
const NORMAL = 1;
const WARN = 2;
const ERROR = 3;
const NONE = 4;

const default_length = 1000;

function makeErrString(msg: string, max_len?: number) {
    max_len = max_len || default_length;
    let res = "" + msg;
    if (res.length < max_len)
        return res;
    return res.substr(0, max_len);
}

/** Simple logger into console */
class ConsoleLogger implements Logger {

     level: string;
     curr_level: number;

    /** Constructor */
    constructor() {
        this.setLevel("debug");
    }

    /** Gets logging level */
    getLevel(): string {
        return this.level;
    }
    /** Gets logging level */
    getLevelNum(): number {
        return this.curr_level;
    }

    /** Maps string level to umber */
    private mapLevel(level: string): number {
        level = level.toLowerCase();
        if (level == "debug") {
            return DEBUG;
        } else if (level == "log") {
            return INFO;
        } else if (level == "info") {
            return INFO;
        } else if (level == "normal") {
            return NORMAL;
        } else if (level == "warn") {
            return WARN;
        } else if (level == "error") {
            return ERROR;
        } else if (level == "none") {
            return NONE;
        }
        return INFO;
    }
    /** Sets logging level */
    setLevel(level: string) {
        level = level.toLowerCase();
        this.curr_level = this.mapLevel(level);
        this.level = level;
    }

    /** Returns true if debug level logging is enabled. */
    isDebug(): boolean {
        return this.curr_level <= DEBUG;
    }

    /** Returns true if normal level logging is enabled. */
    isLog(): boolean {
        return this.curr_level <= NORMAL;
    }

    /** Returns true if info level logging is enabled. */
    isInfo(): boolean {
        return this.isLog();
    }

    /** Returns true if warning level logging is enabled. */
    isWarn(): boolean {
        return this.curr_level <= WARN;
    }

    /** Returns true if important level logging is enabled. */
    isImportant(): boolean {
        return this.curr_level <= WARN;
    }

    /** Returns true if error level logging is enabled. */
    isError(): boolean {
        return this.curr_level <= ERROR;
    }

    /** Print normal text*/
    private logInner(msg: string, max_len?: number) {
        console.log(makeErrString(msg, max_len));
    }

    /** Print grayed text*/
    debug(msg: string, max_len?: number) {
        if (this.isDebug()) {
            this.logInner(colors.gray(makeErrString(msg, max_len)));
        }
    }
    /** Print normal text*/
    info(msg: string, max_len?: number) {
        if (this.isInfo()) {
            this.logInner(msg, max_len);
        }
    }
    /** Print normal text*/
    log(msg: string, max_len?: number) {
        if (this.isLog()) {
            this.logInner(makeErrString(msg, max_len));
        }
    }
    /** Print yellow text*/
    warn(msg: string, max_len?: number) {
        if (this.isWarn()) {
            this.logInner(colors.yellow(makeErrString(msg, max_len)));
        }
    }
    /** Print cyan text*/
    important(msg: string, max_len?: number) {
        if (this.isImportant()) {
            this.logInner(colors.cyan(makeErrString(msg, max_len)));
        }
    }
    /** Print red text*/
    error(msg: string, max_len?: number) {
        if (this.isError()) {
            this.logInner(colors.red(makeErrString(msg, max_len)));
        }
    }
    /** Print red text*/
    exception(err: Error, max_len?: number) {
        if (this.isError()) {
            this.logInner(colors.red(makeErrString(err.message + " " + err.stack, max_len)));
        }
    }
}

let singleton: Logger = new ConsoleLogger();

export function logger(): Logger {
    return singleton;
}

export function setLogger(new_logger: Logger) {
    singleton = new_logger;
}

