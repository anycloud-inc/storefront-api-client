'use strict';

var constants = require('./constants.js');

function getErrorMessage(error) {
    return error instanceof Error ? error.message : JSON.stringify(error);
}
function validateRetries({ client, retries, }) {
    if (retries !== undefined &&
        (typeof retries !== "number" ||
            retries < constants.MIN_RETRIES ||
            retries > constants.MAX_RETRIES)) {
        throw new Error(`${client}: The provided "retries" value (${retries}) is invalid - it cannot be less than ${constants.MIN_RETRIES} or greater than ${constants.MAX_RETRIES}`);
    }
}

exports.getErrorMessage = getErrorMessage;
exports.validateRetries = validateRetries;
//# sourceMappingURL=utilities.js.map
