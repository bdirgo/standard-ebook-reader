let db;
let objectStore;

self.onmessage = function(event) {
    const {
        type,
        payload,
    } = event.data
  switch (type) {
    case "init":
      {
        let req = indexedDB.open("vips", 1);
        req.onupgradeneeded = function(e) {
          let db = e.target.result;
          objectStore = db.createObjectStore("name", { autoIncrement: true });
          self.postMessage("Successfully upgraded db");
        };
        req.onsuccess = function(e) {
          db = req.result;
        };
        req.onerror = function(e) {
          self.postMessage({type:"error", payload:new ErrorEvent(e)});
        };
      }
      break;

    case "readAll":
      {
        readAll();
      }
      break;

    case "add":
      {
        add(payload);
      }
      break;
  }
};

function add(payload) {
    let request = db
        .transaction(["name"], "readwrite")
        .objectStore("name")
        .add({ name: `${payload}` });

    request.onsuccess = function(event) {
        self.postMessage("Successfully added user in db");
    };

    request.onerror = function(event) {
        self.postMessage("something went wrong here");
    };
}

function readAll() {
    let objectStore = db.transaction("name").objectStore("name");
    let users = [];

    objectStore.openCursor().onsuccess = function(event) {
        let cursor = event.target.result;

        if (cursor) {
            users.push(cursor.value.name);
            cursor.continue();
        } else {
            self.postMessage("Every users: " + users.join(", "));
        }
    };
}