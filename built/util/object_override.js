"use strict";
/**
 * Function that overrides a base object. `createNew` defaults to false.
 * If `createNew` is true, a new object will be created, otherwise the
 * base object will be extended.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function overrideObject(baseObject, additional_data, createNew) {
    if (!baseObject) {
        baseObject = {};
    }
    if (createNew) {
        baseObject = JSON.parse(JSON.stringify(baseObject));
    }
    Object.keys(additional_data).forEach(function (key) {
        if (isObjectAndNotArray(baseObject[key]) && isObjectAndNotArray(additional_data[key])) {
            overrideObject(baseObject[key], additional_data[key], false);
        }
        else {
            baseObject[key] = additional_data[key];
        }
    });
    return baseObject;
}
exports.overrideObject = overrideObject;
/** Helper function */
function isObjectAndNotArray(object) {
    return (typeof object === 'object' && !Array.isArray(object));
}
//# sourceMappingURL=object_override.js.map