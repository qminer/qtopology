"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** Utility class with static methods for parsing */
class Utils {
    /** Reads and parses JSON data, one object per line. */
    static readJsonFile(content, tuples, pushError = true) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0)
                continue;
            try {
                let json = JSON.parse(line);
                tuples.push(json);
            }
            catch (e) {
                if (pushError) {
                    tuples.push(e);
                }
            }
        }
    }
    /** Reads raw text data, one line at the time. */
    static readRawFile(content, tuples) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            tuples.push({ content: line });
        }
    }
}
exports.Utils = Utils;
/** Utility class for parsing CSV. Reads settings int constructor */
class CsvParser {
    constructor(config) {
        this.csv_separator = config.csv_separator || ",";
        this.csv_fields = config.csv_fields;
        this.csv_has_header = (config.csv_fields == null);
        this.header_read = false;
    }
    /** Main method of this class - processes multi-line CSV input */
    process(content, tuples) {
        let lines = content.split("\n");
        // if CSV input contains header, use it.
        // otherwise, the first line already contains data
        if (!this.header_read && this.csv_has_header) {
            // read first list and parse fields names
            let header = lines[0].replace("\r", "");
            this.csv_fields = header.split(this.csv_separator);
            lines = lines.slice(1);
            this.header_read = true;
        }
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            let values = line.split(this.csv_separator);
            let result = {};
            for (let i = 0; i < this.csv_fields.length; i++) {
                result[this.csv_fields[i]] = values[i];
            }
            tuples.push(result);
        }
    }
}
exports.CsvParser = CsvParser;
//# sourceMappingURL=parsing_utils.js.map