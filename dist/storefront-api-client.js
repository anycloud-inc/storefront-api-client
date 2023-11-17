'use strict';

var graphqlClient = require('./graphql-client/dist/graphql-client/graphql-client.js');
var validations = require('./graphql-client/dist/api-client-utilities/validations.js');
var apiVersions = require('./graphql-client/dist/api-client-utilities/api-versions.js');
var constants = require('./constants.js');
var validations$1 = require('./validations.js');

function createStorefrontApiClient({ storeDomain, apiVersion, publicAccessToken, privateAccessToken, clientName, retries = 0, customFetchApi: clientFetchApi, logger, }) {
    const currentSupportedApiVersions = apiVersions.getCurrentSupportedApiVersions();
    const storeUrl = validations.validateDomainAndGetStoreUrl({
        client: constants.CLIENT,
        storeDomain,
    });
    const baseApiVersionValidationParams = {
        client: constants.CLIENT,
        currentSupportedApiVersions,
        logger,
    };
    validations.validateApiVersion({ ...baseApiVersionValidationParams, apiVersion });
    validations$1.validateRequiredAccessTokens(publicAccessToken, privateAccessToken);
    validations$1.validatePrivateAccessTokenUsage(privateAccessToken);
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
            "Content-Type": constants.DEFAULT_CONTENT_TYPE,
            Accept: constants.DEFAULT_CONTENT_TYPE,
            [constants.SDK_VARIANT_HEADER]: constants.DEFAULT_SDK_VARIANT,
            [constants.SDK_VERSION_HEADER]: constants.DEFAULT_CLIENT_VERSION,
            ...(clientName ? { [constants.SDK_VARIANT_SOURCE_HEADER]: clientName } : {}),
            ...(publicAccessToken
                ? { [constants.PUBLIC_ACCESS_TOKEN_HEADER]: publicAccessToken }
                : { [constants.PRIVATE_ACCESS_TOKEN_HEADER]: privateAccessToken }),
        },
        apiUrl: apiUrlFormatter(),
        clientName,
    };
    const graphqlClient$1 = graphqlClient.createGraphQLClient({
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
        return graphqlClient$1.fetch(...requestProps);
    };
    const request = (...props) => {
        const requestProps = getGQLClientRequestProps(...props);
        return graphqlClient$1.request(...requestProps);
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
            validations.validateApiVersion({
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
//# sourceMappingURL=storefront-api-client.js.map
