"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Utils {
    static readJsonFile(content, tuples) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim();
            if (line.length == 0)
                continue;
            tuples.push(JSON.parse(line));
        }
    }
    static readRawFile(content, tuples) {
        let lines = content.split("\n");
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            tuples.push({ content: line });
        }
    }
    static readCsvFile(content, tuples, csv_has_header, csv_separator, csv_fields) {
        let lines = content.split("\n");
        // if CSV file contains header, use it.
        // otherwise, the first line already contains data
        if (csv_has_header) {
            // read first list and parse fields names
            let header = lines[0].replace("\r", "");
            csv_fields = header.split(csv_separator);
            lines = lines.slice(1);
        }
        for (let line of lines) {
            line = line.trim().replace("\r", "");
            if (line.length == 0)
                continue;
            let values = line.split(csv_separator);
            let result = {};
            for (let i = 0; i < csv_fields.length; i++) {
                result[csv_fields[i]] = values[i];
            }
            tuples.push(result);
        }
    }
}
exports.Utils = Utils;
class CsvParser {
    constructor(config) {
        this.csv_separator = config.separator || ",";
        this.csv_fields = config.fields;
        this.csv_has_header = config.csv_has_header;
        this.header_read = false;
    }
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