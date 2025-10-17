var localStorageEventListenerHandler = null;

export function initialize(interop, callbackName) {
    localStorageEventListenerHandler = function (args) {
        interop.invokeMethodAsync(callbackName,
            args.key,
            args.oldValue,
            args.newValue,
        );
    }

    window.addEventListener("storage", localStorageEventListenerHandler);

    window.Connection.Handler(navigator.onLine);
}

export function dispose() {
    if (!localStorageEventListenerHandler) return;

    window.removeEventListener("storage", localStorageEventListenerHandler);
}