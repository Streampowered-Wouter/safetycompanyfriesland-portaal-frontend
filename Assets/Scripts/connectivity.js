window.Connection = {
    Handler: null,
    Initialize: function (interop) {
        window.Connection.Handler = function () {
            interop.invokeMethodAsync("Connection.StatusChanged", navigator.onLine);
        }

        window.addEventListener("online", window.Connection.Handler);
        window.addEventListener("offline", window.Connection.Handler);

        window.Connection.Handler(navigator.onLine);
    },
    Dispose: function () {
        if (!handler) return;

        window.removeEventListener("online", window.Connection.Handler);
        window.removeEventListener("offline", window.Connection.Handler);
    }
};