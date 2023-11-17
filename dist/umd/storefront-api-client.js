/*! shopify/storefront-api-client -- Copyright (c) 2023-present, Shopify Inc. -- license (MIT): https://github.com///github/blob/main/LICENSE */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.ShopifyStorefrontAPIClient = {}));
})(this, (function (exports) { 'use strict';

    const CLIENT$1 = "GraphQL Client";
    const MIN_RETRIES = 0;
    const MAX_RETRIES = 3;

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

    const GQL_API_ERROR = `${CLIENT$1}: An error occurred while fetching from the API. Review 'graphQLErrors' for details.`;
    const UNEXPECTED_CONTENT_TYPE_ERROR = `${CLIENT$1}: Response returned unexpected Content-Type:`;
    const CONTENT_TYPES = {
        json: "application/json",
        multipart: "multipart/mixed",
    };
    const RETRY_WAIT_TIME = 1000;
    const RETRIABLE_STATUS_CODES = [429, 503];
    function createGraphQLClient({ headers, url, fetchApi = fetch, retries = 0, logger, }) {
        validateRetries({ client: CLIENT$1, retries });
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
                            : `${CLIENT$1}: An unknown error has occurred. The API did not return a data object or any errors in its response.`,
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
                throw new Error(`${CLIENT$1}:${maxRetries > 0
                ? ` Attempted maximum number of ${maxRetries} network retries. Last message -`
                : ""} ${getErrorMessage(error)}`);
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
            validateRetries({ client: CLIENT$1, retries: overrideRetries });
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
                        message: getErrorMessage(error),
                    },
                };
            }
        };
    }

    function validateDomainAndGetStoreUrl({ client, storeDomain, }) {
        try {
            if (!storeDomain || typeof storeDomain !== "string") {
                throw new Error();
            }
            const trimmedDomain = storeDomain.trim();
            const protocolUrl = trimmedDomain.startsWith("http")
                ? trimmedDomain
                : `https://${trimmedDomain}`;
            const url = new URL(protocolUrl);
            url.protocol = "https";
            return url.origin;
        }
        catch (_error) {
            throw new Error(`${client}: a valid store domain ("${storeDomain}") must be provided`);
        }
    }
    function validateApiVersion({ client, currentSupportedApiVersions, apiVersion, logger, }) {
        const versionError = `${client}: the provided apiVersion ("${apiVersion}")`;
        const supportedVersion = `Current supported API versions: ${currentSupportedApiVersions.join(", ")}`;
        if (!apiVersion || typeof apiVersion !== "string") {
            throw new Error(`${versionError} is invalid. ${supportedVersion}`);
        }
        const trimmedApiVersion = apiVersion.trim();
        if (!currentSupportedApiVersions.includes(trimmedApiVersion)) {
            if (logger) {
                logger({
                    type: "UNSUPPORTED_API_VERSION",
                    content: {
                        apiVersion,
                        supportedApiVersions: currentSupportedApiVersions,
                    },
                });
            }
            else {
                console.warn(`${versionError} is deprecated or not supported. ${supportedVersion}`);
            }
        }
    }

    function getQuarterMonth(quarter) {
        const month = quarter * 3 - 2;
        return month === 10 ? month : `0${month}`;
    }
    function getPrevousVersion(year, quarter, nQuarter) {
        const versionQuarter = quarter - nQuarter;
        if (versionQuarter <= 0) {
            return `${year - 1}-${getQuarterMonth(versionQuarter + 4)}`;
        }
        return `${year}-${getQuarterMonth(versionQuarter)}`;
    }
    function getCurrentApiVersion() {
        const date = new Date();
        const month = date.getUTCMonth();
        const year = date.getUTCFullYear();
        const quarter = Math.floor(month / 3 + 1);
        return {
            year,
            quarter,
            version: `${year}-${getQuarterMonth(quarter)}`,
        };
    }
    function getCurrentSupportedApiVersions() {
        const { year, quarter, version: currentVersion } = getCurrentApiVersion();
        const nextVersion = quarter === 4
            ? `${year + 1}-01`
            : `${year}-${getQuarterMonth(quarter + 1)}`;
        return [
            getPrevousVersion(year, quarter, 3),
            getPrevousVersion(year, quarter, 2),
            getPrevousVersion(year, quarter, 1),
            currentVersion,
            nextVersion,
            "unstable",
        ];
    }

    const DEFAULT_CONTENT_TYPE = "application/json";
    const DEFAULT_SDK_VARIANT = "storefront-api-client";
    // This is value is replaced with package.json version during rollup build process
    const DEFAULT_CLIENT_VERSION = "0.0.1";
    const PUBLIC_ACCESS_TOKEN_HEADER = "X-Shopify-Storefront-Access-Token";
    const PRIVATE_ACCESS_TOKEN_HEADER = "Shopify-Storefront-Private-Token";
    const SDK_VARIANT_HEADER = "X-SDK-Variant";
    const SDK_VERSION_HEADER = "X-SDK-Version";
    const SDK_VARIANT_SOURCE_HEADER = "X-SDK-Variant-Source";
    const CLIENT = "Storefront API Client";

    function validatePrivateAccessTokenUsage(privateAccessToken) {
        if (privateAccessToken && window) {
            throw new Error(`${CLIENT}: private access tokens and headers should only be used in a server-to-server implementation. Use the public API access token in nonserver environments.`);
        }
    }
    function validateRequiredAccessTokens(publicAccessToken, privateAccessToken) {
        if (!publicAccessToken && !privateAccessToken) {
            throw new Error(`${CLIENT}: a public or private access token must be provided`);
        }
        if (publicAccessToken && privateAccessToken) {
            throw new Error(`${CLIENT}: only provide either a public or private access token`);
        }
    }

    function createStorefrontApiClient({ storeDomain, apiVersion, publicAccessToken, privateAccessToken, clientName, retries = 0, customFetchApi: clientFetchApi, logger, }) {
        const currentSupportedApiVersions = getCurrentSupportedApiVersions();
        const storeUrl = validateDomainAndGetStoreUrl({
            client: CLIENT,
            storeDomain,
        });
        const baseApiVersionValidationParams = {
            client: CLIENT,
            currentSupportedApiVersions,
            logger,
        };
        validateApiVersion({ ...baseApiVersionValidationParams, apiVersion });
        validateRequiredAccessTokens(publicAccessToken, privateAccessToken);
        validatePrivateAccessTokenUsage(privateAccessToken);
        const apiUrlFormatter = generateApiUrlFormatter(storeUrl, apiVersion, baseApiVersionValidationParams);
        const config = {
            storeDomain: storeUrl,
            apiVersion,
            ...(publicAccessToken
                ? { publicAccessToken }
                : {
                    privateAccessToken: privateAccessToken,
                }),
            headers: {
                "Content-Type": DEFAULT_CONTENT_TYPE,
                Accept: DEFAULT_CONTENT_TYPE,
                [SDK_VARIANT_HEADER]: DEFAULT_SDK_VARIANT,
                [SDK_VERSION_HEADER]: DEFAULT_CLIENT_VERSION,
                ...(clientName ? { [SDK_VARIANT_SOURCE_HEADER]: clientName } : {}),
                ...(publicAccessToken
                    ? { [PUBLIC_ACCESS_TOKEN_HEADER]: publicAccessToken }
                    : { [PRIVATE_ACCESS_TOKEN_HEADER]: privateAccessToken }),
            },
            apiUrl: apiUrlFormatter(),
            clientName,
        };
        const graphqlClient = createGraphQLClient({
            headers: config.headers,
            url: config.apiUrl,
            retries,
            fetchApi: clientFetchApi,
            logger,
        });
        const getHeaders = generateGetHeader(config);
        const getApiUrl = generateGetApiUrl(config, apiUrlFormatter);
        const getGQLClientRequestProps = generateGetGQLClientProps({
            getHeaders,
            getApiUrl,
        });
        const fetch = (...props) => {
            const requestProps = getGQLClientRequestProps(...props);
            return graphqlClient.fetch(...requestProps);
        };
        const request = (...props) => {
            const requestProps = getGQLClientRequestProps(...props);
            return graphqlClient.request(...requestProps);
        };
        const client = {
            config,
            getHeaders,
            getApiUrl,
            fetch,
            request,
        };
        return Object.freeze(client);
    }
    function generateApiUrlFormatter(storeUrl, defaultApiVersion, baseApiVersionValidationParams) {
        return (apiVersion) => {
            if (apiVersion) {
                validateApiVersion({
                    ...baseApiVersionValidationParams,
                    apiVersion,
                });
            }
            const urlApiVersion = (apiVersion ?? defaultApiVersion).trim();
            return `${storeUrl}/api/${urlApiVersion}/graphql.json`;
        };
    }
    function generateGetHeader(config) {
        return (customHeaders) => {
            return { ...(customHeaders ?? {}), ...config.headers };
        };
    }
    function generateGetApiUrl(config, apiUrlFormatter) {
        return (propApiVersion) => {
            return propApiVersion ? apiUrlFormatter(propApiVersion) : config.apiUrl;
        };
    }
    function generateGetGQLClientProps({ getHeaders, getApiUrl, }) {
        return (operation, options) => {
            const props = [operation];
            if (options) {
                const { variables, apiVersion: propApiVersion, customHeaders, retries, } = options;
                props.push({
                    variables,
                    headers: customHeaders ? getHeaders(customHeaders) : undefined,
                    url: propApiVersion ? getApiUrl(propApiVersion) : undefined,
                    retries,
                });
            }
            return props;
        };
    }

    exports.createStorefrontApiClient = createStorefrontApiClient;

}));
//# sourceMappingURL=storefront-api-client.js.map
