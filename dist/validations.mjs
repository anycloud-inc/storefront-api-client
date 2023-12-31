import { CLIENT } from './constants.mjs';

function validatePrivateAccessTokenUsage(privateAccessToken) {
    // if (privateAccessToken) {
    //     throw new Error(`${CLIENT}: private access tokens and headers should only be used in a server-to-server implementation. Use the public API access token in nonserver environments.`);
    // }
}
function validateRequiredAccessTokens(publicAccessToken, privateAccessToken) {
    if (!publicAccessToken && !privateAccessToken) {
        throw new Error(`${CLIENT}: a public or private access token must be provided`);
    }
    if (publicAccessToken && privateAccessToken) {
        throw new Error(`${CLIENT}: only provide either a public or private access token`);
    }
}

export { validatePrivateAccessTokenUsage, validateRequiredAccessTokens };
//# sourceMappingURL=validations.mjs.map
