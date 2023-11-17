import { MIN_RETRIES, MAX_RETRIES } from './constants.mjs';

function getErrorMessage(error) {
    return error instanceof Error ? error.message : JSON.stringify(error);
}
function validateRetries({ client, retries, }) {
    if (retries !== undefined &&
        (typeof retries !== "number" ||
            retries < MIN_RETRIES ||
            retries > MAX_RETRIES)) {
        throw new Error(`${client}: The provided "retries" value (${retries}) is invalid - it cannot be less than ${MIN_RETRIES} or greater than ${MAX_RETRIES}`);
    }
}

export { getErrorMessage, validateRetries };
//# sourceMappingURL=utilities.mjs.map
