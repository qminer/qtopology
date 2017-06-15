
/**
 * Function that overrides a base object. `createNew` defaults to false.
 * If `createNew` is true, a new object will be created, otherwise the
 * base object will be extended.
 */

export function override(baseObject: any, overrideObject: any, createNew?: boolean) {
    if (!baseObject) {
        baseObject = {};
    }
    if (createNew) {
        baseObject = JSON.parse(JSON.stringify(baseObject));
    }
    Object.keys(overrideObject).forEach(function (key) {
        if (isObjectAndNotArray(baseObject[key]) && isObjectAndNotArray(overrideObject[key])) {
            override(baseObject[key], overrideObject[key], false);
        }
        else {
            baseObject[key] = overrideObject[key];
        }
    });
    return baseObject;
}


function isObjectAndNotArray(object) {
    return (typeof object === 'object' && !Array.isArray(object));
}
