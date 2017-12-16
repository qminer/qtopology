/** Utility class with static methods for parsing */
export declare class Utils {
    /** Reads and parses JSON data, one object per line. */
    static readJsonFile(content: string, tuples: any[], pushError?: boolean): void;
    /** Reads raw text data, one line at the time. */
    static readRawFile(content: string, tuples: any[]): void;
}
/** Utility class for parsing CSV. Reads settings int constructor */
export declare class CsvParser {
    private csv_separator;
    private csv_fields;
    private csv_has_header;
    private header_read;
    constructor(config: any);
    /** Main method of this class - processes multi-line CSV input */
    process(content: string, tuples: any[]): void;
}
