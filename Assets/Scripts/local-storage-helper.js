export function clearLocalStorage(area) {
    if (typeof area === 'string' && area.length > 0) {
        if (!area.endsWith(':')) {
            area = area + ':';
        }

        Object.keys(localStorage)
            .filter(cacheKey =>
                cacheKey.startsWith(area))
            .forEach(cacheKey =>
                localStorage.removeItem(cacheKey))

    } else {
        localStorage.clear();
    }
}