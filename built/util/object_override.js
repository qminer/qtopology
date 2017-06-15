"use strict";
/**
 * Function that overrides a base object. `createNew` defaults to false.
 * If `createNew` is true, a new object will be created, otherwise the
 * base object will be extended.
 */
Object.defineProperty(exports, "__esModule", { value: true });
function overrideObject(baseObject, overrideObject, createNew) {
    if (!baseObject) {
        baseObject = {};
    }
    if (createNew) {
        baseObject = JSON.parse(JSON.stringify(baseObject));
    }
    Object.keys(overrideObject).forEach(function (key) {
        if (isObjectAndNotArray(baseObject[key]) && isObjectAndNotArray(overrideObject[key])) {
            overrideObject(baseObject[key], overrideObject[key], false);
        }
        else {
            baseObject[key] = overrideObject[key];
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