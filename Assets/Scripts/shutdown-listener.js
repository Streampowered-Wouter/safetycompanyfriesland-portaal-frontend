var shutdownEventListenerHandler = null;

export function initialize(interop, callbackName) {
    shutdownEventListenerHandler = function onCloseBrowser(event) {
        interop.invokeMethodAsync(callbackName);
    }

    window.addEventListener("beforeunload", shutdownEventListenerHandler);
}

export async function sendBeacon(url, data) {
    if (!navigator || typeof navigator.sendBeacon !== 'function') return;

    const headers = {
        type: 'application/json',
    };

    const blob = new Blob([JSON.stringify(data)], headers);

    navigator.sendBeacon(url, blob);
}

export function dispose() {
    window.removeEventListener("beforeunload", shutdownEventListenerHandler);
}