export function clearSessionStorage(area) {
    if (typeof area === 'string' && area.length > 0) {
        if (!area.endsWith(':')) {
            area = area + ':';
        }

        Object.keys(sessionStorage)
            .filter(cacheKey =>
                cacheKey.startsWith(area))
            .forEach(cacheKey =>
                sessionStorage.removeItem(cacheKey))

    } else {
        sessionStorage.clear();
    }
}