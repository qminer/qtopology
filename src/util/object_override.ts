
/**
 * Function that overrides a base object. `createNew` defaults to false.
 * If `createNew` is true, a new object will be created, otherwise the
 * base object will be extended.
 */

export function overrideObject(baseObject: any, additional_data: any, createNew?: boolean) {
    if (!baseObject) {
        baseObject = {};
    }
    if (createNew) {
        baseObject = JSON.parse(JSON.stringify(baseObject));
    }
    Object.keys(additional_data).forEach(function (key) {
        if (isObjectAndNotArray(baseObject[key]) && isObjectAndNotArray(additional_data[key])) {
            overrideObject(baseObject[key], additional_data[key], false);
        } else {
            baseObject[key] = additional_data[key];
        }
    });
    return baseObject;
}

/** Helper function */
function isObjectAndNotArray(object) {
    return (typeof object === 'object' && !Array.isArray(object));
}
