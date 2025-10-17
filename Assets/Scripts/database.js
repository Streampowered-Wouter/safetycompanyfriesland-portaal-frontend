export function initialize() {
    let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);
    blazorIndexedDb.onupgradeneeded = function () {
        let db = blazorIndexedDb.result;
        db.createObjectStore("Content", { keyPath: "Id" });
    }
}

export function set(collectionName, value) {
    let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);

    blazorIndexedDb.onsuccess = function () {
        let transaction = null;
        try {
            transaction = blazorIndexedDb.result.transaction(collectionName, "readwrite");
        } catch (ex) {
            if (ex.name == 'NotFoundError' &&
                ex.message == "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.")
            {
                indexedDB.deleteDatabase(DATABASE_NAME);
            }
        }

        let collection = transaction.objectStore(collectionName)

        if (typeof value === 'string') {
            value = JSON.parse(value);
        }

        if (!value.Id && value.id) {
            value.Id = value.id;
        }

        if (!value.Route && value.route) {
            value.Route = value.route;
            value.Route.Path = value.Route.path;
        }

        collection.put(value);
    }
}

export function remove(collectionName, contentId) {
    let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);

    blazorIndexedDb.onsuccess = function () {
        let transaction = blazorIndexedDb.result.transaction(collectionName, "readwrite");
        let collection = transaction.objectStore(collectionName)

        collection.delete(contentId)
    }
}

export async function getById(collectionName, contentId) {
    let request = new Promise((resolve) => {
        let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);
        blazorIndexedDb.onsuccess = function () {
            let transaction = null;
            try {
                transaction = blazorIndexedDb.result.transaction(collectionName, "readonly");
            } catch (ex) {
                if (ex.name == 'NotFoundError' &&
                    ex.message == "Failed to execute 'transaction' on 'IDBDatabase': One of the specified object stores was not found.")
                {
                    indexedDB.deleteDatabase(DATABASE_NAME);
                }
            }
            let collection = transaction.objectStore(collectionName);
            let result = collection.get(contentId);

            result.onsuccess = function (e) {
                if (result.result)
                    resolve(JSON.stringify(result.result));
                else
                    resolve(null);
            }
        }
    });

    let result = await request;

    return result;
}

export async function getByPath(collectionName, contentPath) {
    let request = new Promise((resolve) => {
        let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);
        blazorIndexedDb.onsuccess = function () {

            let transaction = blazorIndexedDb.result.transaction(collectionName, "readonly");
            let collection = transaction.objectStore(collectionName);
            var request = collection.openCursor();
            request.onsuccess = function (e) {
                var cursor = e.target.result;
                if (cursor) {
                    if (cursor.value && cursor.value.Route && cursor.value.Route.Path === contentPath) {
                        if (cursor.value)
                            resolve(JSON.stringify(cursor.value));
                        else
                            resolve(null);
                    } else {
                        cursor.continue();
                    }
                } else {
                    resolve(null);
                }
            };
        }
    });

    let result = await request;

    return result;
}

export async function deleteDatabase() {
    let request = new Promise((resolve) => {
        var req = indexedDB.deleteDatabase(DATABASE_NAME);
        req.onsuccess = function () {
            resolve(true);
        }
        req.onerror = function () {
            resolve(false);
        };
        req.onblocked = function () {
            resolve(false);
        };
    });
    
    let result = await request;

    return result;
}

export async function getContentLastChangedDates(collectionName) {
    let request = new Promise((resolve) => {
        let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);
        blazorIndexedDb.onsuccess = function () {
            let transaction = blazorIndexedDb.result.transaction(collectionName, "readonly");
            let collection = transaction.objectStore(collectionName);
            let resultDict = {};
            let cursorRequest = collection.openCursor();
            cursorRequest.onsuccess = function (e) {
                let cursor = e.target.result;
                if (cursor) {
                    let value = cursor.value;
                    if (value && value.id && value.updateDate) {
                        resultDict[value.id] = value.updateDate;
                    }
                    cursor.continue();
                } else {
                    resolve(resultDict);
                }
            };
            cursorRequest.onerror = function () {
                resolve({});
            };
        };
        blazorIndexedDb.onerror = function () {
            resolve({});
        };
    });
    let result = await request;
    return result;
}

export async function cleanupOldTrainingContent(allowedTrainingGuids) {
    let blazorIndexedDb = indexedDB.open(DATABASE_NAME, CURRENT_VERSION);
    blazorIndexedDb.onsuccess = function () {
        let db = blazorIndexedDb.result;
        let transaction = db.transaction("Content", "readwrite");
        let collection = transaction.objectStore("Content");

        // Gather all content
        let allContent = [];
        let cursorRequest = collection.openCursor();
        cursorRequest.onsuccess = function (e) {
            let cursor = e.target.result;
            if (cursor) {
                allContent.push(cursor.value);
                cursor.continue();
            } else {
                // Step 1: Find all trainings
                let trainings = allContent.filter(x => x.contentType === "training");
                let allowedSet = new Set((allowedTrainingGuids || []).map(g => g.toLowerCase()));

                // Step 2: Collect all referenced lespakket and module IDs from allowed trainings
                let referencedLespakketIds = new Set();
                let referencedModuleIds = new Set();

                trainings.forEach(training => {
                    let trainingId = (training.id || training.Id || "").toLowerCase();
                    if (allowedSet.has(trainingId)) {
                        let curriculums = training.properties && training.properties.curriculum
                            ? Array.isArray(training.properties.curriculum)
                                ? training.properties.curriculum
                                : [training.properties.curriculum]
                            : [];
                        curriculums.forEach(lespakketRef => {
                            let lespakketId = (lespakketRef.id || lespakketRef.Id || "").toLowerCase();
                            if (lespakketId) {
                                referencedLespakketIds.add(lespakketId);

                                // Find lespakket content
                                let lespakket = allContent.find(x =>
                                    (x.id || x.Id || "").toLowerCase() === lespakketId &&
                                    x.contentType === "lespakket"
                                );
                                if (lespakket && lespakket.properties && lespakket.properties.modules) {
                                    let modules = Array.isArray(lespakket.properties.modules)
                                        ? lespakket.properties.modules
                                        : [lespakket.properties.modules];
                                    modules.forEach(moduleRef => {
                                        let moduleId = (moduleRef.id || moduleRef.Id || "").toLowerCase();
                                        if (moduleId) {
                                            referencedModuleIds.add(moduleId);
                                        }
                                    });
                                }
                            }
                        });
                    }
                });

                // Step 3: For each training not in allowed list, delete related content
                trainings.forEach(training => {
                    let trainingId = (training.id || training.Id || "").toLowerCase();
                    if (!allowedSet.has(trainingId)) {
                        // Delete the training itself
                        collection.delete(trainingId);

                        // Find lespakket(s) from training.properties.curriculum
                        let curriculums = training.properties && training.properties.curriculum
                            ? Array.isArray(training.properties.curriculum)
                                ? training.properties.curriculum
                                : [training.properties.curriculum]
                            : [];
                        curriculums.forEach(lespakketRef => {
                            let lespakketId = (lespakketRef.id || lespakketRef.Id || "").toLowerCase();
                            if (lespakketId && !referencedLespakketIds.has(lespakketId)) {
                                // Delete lespakket
                                collection.delete(lespakketId);

                                // Find lespakket content
                                let lespakket = allContent.find(x =>
                                    (x.id || x.Id || "").toLowerCase() === lespakketId &&
                                    x.contentType === "lespakket"
                                );
                                if (lespakket && lespakket.properties && lespakket.properties.modules) {
                                    let modules = Array.isArray(lespakket.properties.modules)
                                        ? lespakket.properties.modules
                                        : [lespakket.properties.modules];
                                    modules.forEach(moduleRef => {
                                        let moduleId = (moduleRef.id || moduleRef.Id || "").toLowerCase();
                                        if (moduleId && !referencedModuleIds.has(moduleId)) {
                                            // Delete module
                                            collection.delete(moduleId);

                                            // Delete all content with route.path starting with the module's route.path
                                            let modulePath = moduleRef.route && moduleRef.route.path;
                                            if (modulePath) {
                                                let moduleContent = allContent.filter(x =>
                                                    x.route && x.route.path &&
                                                    x.route.path.startsWith(modulePath)
                                                );
                                                moduleContent.forEach(item => {
                                                    let itemId = (item.id || item.Id || "").toLowerCase();
                                                    if (itemId) {
                                                        collection.delete(itemId);
                                                    }
                                                });
                                            }
                                        }
                                    });
                                }
                            }
                        });
                    }
                });
            }
        };
    };
}

let CURRENT_VERSION = 1;
let DATABASE_NAME = "Safety Company E-learning Portaal";