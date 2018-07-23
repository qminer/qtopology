import * as intf from "../../topology_interfaces";
import * as mem from "../memory/memory_storage";
export declare class FileStorage extends mem.MemoryStorage {
    private dir_name;
    private file_patterns;
    private file_patterns_regex;
    constructor(dir_name: string, file_pattern: string | string[]);
    getProperties(callback: intf.SimpleResultCallback<intf.StorageProperty[]>): void;
    private createRegexpForPattern;
}
