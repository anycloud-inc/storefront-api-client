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

export { getCurrentApiVersion, getCurrentSupportedApiVersions };
//# sourceMappingURL=api-versions.mjs.map
