export declare class Utils {
    static readJsonFile(content: string, tuples: any[]): void;
    static readRawFile(content: string, tuples: any[]): void;
    static readCsvFile(content: string, tuples: any[], csv_has_header: boolean, csv_separator: string, csv_fields: string[]): void;
}
export declare class CsvParser {
    private csv_separator;
    private csv_fields;
    private csv_has_header;
    private header_read;
    constructor(config: any);
    process(content: string, tuples: any[]): void;
}
