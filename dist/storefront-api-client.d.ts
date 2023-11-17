import { CustomFetchApi, ApiClientLogger, ApiClient, ApiClientLogContentTypes, Headers } from '@shopify/graphql-client';

type StorefrontApiClientLogContentTypes = ApiClientLogContentTypes;
type StorefrontApiClientConfig = {
    storeDomain: string;
    apiVersion: string;
    headers: Headers;
    apiUrl: string;
    retries?: number;
    clientName?: string;
} & ({
    publicAccessToken?: never;
    privateAccessToken: string;
} | {
    publicAccessToken: string;
    privateAccessToken?: never;
});
type StorefrontApiClientOptions = Omit<StorefrontApiClientConfig, "headers" | "apiUrl"> & {
    customFetchApi?: CustomFetchApi;
    logger?: ApiClientLogger<StorefrontApiClientLogContentTypes>;
};
type StorefrontApiClient = ApiClient<Readonly<StorefrontApiClientConfig>>;

declare function createStorefrontApiClient({ storeDomain, apiVersion, publicAccessToken, privateAccessToken, clientName, retries, customFetchApi: clientFetchApi, logger, }: StorefrontApiClientOptions): StorefrontApiClient;

export { createStorefrontApiClient };
