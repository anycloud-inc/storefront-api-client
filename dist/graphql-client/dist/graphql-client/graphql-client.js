'use strict';

var constants = require('./constants.js');
var utilities = require('./utilities.js');

const GQL_API_ERROR = `${constants.CLIENT}: An error occurred while fetching from the API. Review 'graphQLErrors' for details.`;
const UNEXPECTED_CONTENT_TYPE_ERROR = `${constants.CLIENT}: Response returned unexpected Content-Type:`;
const CONTENT_TYPES = {
    json: "application/json",
    multipart: "multipart/mixed",
};
const RETRY_WAIT_TIME = 1000;
const RETRIABLE_STATUS_CODES = [429, 503];
function createGraphQLClient({ headers, url, fetchApi = fetch, retries = 0, logger, }) {
    utilities.validateRetries({ client: constants.CLIENT, retries });
    const config = {
        headers,
        url,
        retries,
    };
    const clientLogger = generateClientLogger(logger);
    const httpFetch = generateHttpFetch(fetchApi, clientLogger);
    const fetch = generateFetch(httpFetch, config);
    const request = generateRequest(fetch);
    return {
        config,
        fetch,
        request,
    };
}
async function sleep(waitTime) {
    return new Promise((resolve) => setTimeout(resolve, waitTime));
}
async function processJSONResponse(response) {
    const { errors, data, extensions } = await response.json();
    return {
        ...(data ? { data } : {}),
        ...(extensions ? { extensions } : {}),
        ...(errors || !data
            ? {
                errors: {
                    networkStatusCode: response.status,
                    message: errors
                        ? GQL_API_ERROR
                        : `${constants.CLIENT}: An unknown error has occurred. The API did not return a data object or any errors in its response.`,
                    ...(errors ? { graphQLErrors: errors } : {}),
                },
            }
            : {}),
    };
}
function generateClientLogger(logger) {
    return (logContent) => {
        if (logger) {
            logger(logContent);
        }
    };
}
function generateHttpFetch(fetchApi, clientLogger) {
    const httpFetch = async (requestParams, count, maxRetries) => {
        const nextCount = count + 1;
        const maxTries = maxRetries + 1;
        let response;
        try {
            response = await fetchApi(...requestParams);
            clientLogger({
                type: "HTTP-Response",
                content: {
                    requestParams,
                    response,
                },
            });
            if (!response.ok &&
                RETRIABLE_STATUS_CODES.includes(response.status) &&
                nextCount <= maxTries) {
                throw new Error();
            }
            return response;
        }
        catch (error) {
            if (nextCount <= maxTries) {
                await sleep(RETRY_WAIT_TIME);
                clientLogger({
                    type: "HTTP-Retry",
                    content: {
                        requestParams,
                        lastResponse: response,
                        retryAttempt: count,
                        maxRetries,
                    },
                });
                return httpFetch(requestParams, nextCount, maxRetries);
            }
            throw new Error(`${constants.CLIENT}:${maxRetries > 0
                ? ` Attempted maximum number of ${maxRetries} network retries. Last message -`
                : ""} ${utilities.getErrorMessage(error)}`);
        }
    };
    return httpFetch;
}
function generateFetch(httpFetch, { url, headers, retries }) {
    return async (operation, options = {}) => {
        const { variables, headers: overrideHeaders, url: overrideUrl, retries: overrideRetries, } = options;
        const body = JSON.stringify({
            query: operation,
            variables,
        });
        utilities.validateRetries({ client: constants.CLIENT, retries: overrideRetries });
        const fetchParams = [
            overrideUrl ?? url,
            {
                method: "POST",
                headers: {
                    ...headers,
                    ...overrideHeaders,
                },
                body,
            },
        ];
        return httpFetch(fetchParams, 1, overrideRetries ?? retries);
    };
}
function generateRequest(fetch) {
    return async (...props) => {
        try {
            const response = await fetch(...props);
            const { status, statusText } = response;
            const contentType = response.headers.get("content-type") || "";
            if (!response.ok) {
                return {
                    errors: {
                        networkStatusCode: status,
                        message: statusText,
                    },
                };
            }
            if (!contentType.includes(CONTENT_TYPES.json)) {
                return {
                    errors: {
                        networkStatusCode: status,
                        message: `${UNEXPECTED_CONTENT_TYPE_ERROR} ${contentType}`,
                    },
                };
            }
            return processJSONResponse(response);
        }
        catch (error) {
            return {
                errors: {
                    message: utilities.getErrorMessage(error),
                },
            };
        }
    };
}

exports.createGraphQLClient = createGraphQLClient;
exports.generateClientLogger = generateClientLogger;
//# sourceMappingURL=graphql-client.js.map
