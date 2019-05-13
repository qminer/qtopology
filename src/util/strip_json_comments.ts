/*
    Utility function that strips comments from JSON.
    Though they are not part of JSON standard, they are very handy
    in config files.

    Code taken and adopted from:

    https://github.com/sindresorhus/strip-json-comments
*/

import * as fs from "fs";

const singleComment = 1;
const multiComment = 2;
const stripWithoutWhitespace = () => "";
const stripWithWhitespace = (str, start?, end?) => str.slice(start, end).replace(/\S/g, " ");

/**
 * Reads given file and transforms it into object.
 * It allows non-standard JSON comments.
 */
export function readJsonFileSync(fname: string): any {
    const s = fs.readFileSync(fname, "utf8");
    return JSON.parse(stripJsonComments(s));
}

/**
 * Utility function that removes comments from given JSON. Non-standard feature.
 * @param str - string containing JSON data with comments
 * @param opts - optional options object
 * @param opts.whitespace - should whitespaces also be removed
 */
export function stripJsonComments(str: string, opts?: any): string {
    opts = opts || {};

    const strip = opts.whitespace === false ? stripWithoutWhitespace : stripWithWhitespace;

    let insideString = false;
    let insideComment = 0;
    let offset = 0;
    let ret = "";

    for (let i = 0; i < str.length; i++) {
        const currentChar = str[i];
        const nextChar = str[i + 1];

        if (!insideComment && currentChar === "\"") {
            const escaped = str[i - 1] === "\\" && str[i - 2] !== "\\";
            if (!escaped) {
                insideString = !insideString;
            }
        }

        if (insideString) {
            continue;
        }

        if (!insideComment && currentChar + nextChar === "//") {
            ret += str.slice(offset, i);
            offset = i;
            insideComment = singleComment;
            i++;
        } else if (insideComment === singleComment && currentChar + nextChar === "\r\n") {
            i++;
            insideComment = 0;
            ret += strip(str, offset, i);
            offset = i;
            continue;
        } else if (insideComment === singleComment && currentChar === "\n") {
            insideComment = 0;
            ret += strip(str, offset, i);
            offset = i;
        } else if (!insideComment && currentChar + nextChar === "/*") {
            ret += str.slice(offset, i);
            offset = i;
            insideComment = multiComment;
            i++;
            continue;
        } else if (insideComment === multiComment && currentChar + nextChar === "*/") {
            i++;
            insideComment = 0;
            ret += strip(str, offset, i + 1);
            offset = i + 1;
            continue;
        }
    }

    return ret + (insideComment ? strip(str.substr(offset)) : str.substr(offset));
}
