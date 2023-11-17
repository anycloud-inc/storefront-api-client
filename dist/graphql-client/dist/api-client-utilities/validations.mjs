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

export { validateApiVersion, validateDomainAndGetStoreUrl };
//# sourceMappingURL=validations.mjs.map
