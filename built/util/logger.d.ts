/** Logging interfrace */
export interface Logger {
    /** Gets logging level */
    getLevel(): string;
    /** Gets logging level - as number */
    getLevelNum(): number;
    /** Sets logging level */
    setLevel(level: string): any;
    isDebug(): boolean;
    isLog(): boolean;
    isInfo(): boolean;
    isWarn(): boolean;
    isImportant(): boolean;
    isError(): boolean;
    debug(msg: string, max_len?: number): any;
    info(msg: string, max_len?: number): any;
    log(msg: string, max_len?: number): any;
    important(msg: string, max_len?: number): any;
    warn(msg: string, max_len?: number): any;
    error(msg: string, max_len?: number): any;
    exception(err: Error, max_len?: number): any;
}
export declare function logger(): Logger;
export declare function setLogger(new_logger: Logger): void;
