import { createGraphQLClient } from './graphql-client/dist/graphql-client/graphql-client.mjs';
import { validateDomainAndGetStoreUrl, validateApiVersion } from './graphql-client/dist/api-client-utilities/validations.mjs';
import { getCurrentSupportedApiVersions } from './graphql-client/dist/api-client-utilities/api-versions.mjs';
import { DEFAULT_CONTENT_TYPE, SDK_VARIANT_HEADER, DEFAULT_SDK_VARIANT, SDK_VERSION_HEADER, DEFAULT_CLIENT_VERSION, SDK_VARIANT_SOURCE_HEADER, PUBLIC_ACCESS_TOKEN_HEADER, PRIVATE_ACCESS_TOKEN_HEADER, CLIENT } from './constants.mjs';
import { validateRequiredAccessTokens, validatePrivateAccessTokenUsage } from './validations.mjs';

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

export { createStorefrontApiClient };
//# sourceMappingURL=storefront-api-client.mjs.map
