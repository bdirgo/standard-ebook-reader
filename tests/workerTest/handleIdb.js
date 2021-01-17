import { openDB, deleteDB, wrap, unwrap } from '../../lib/idb.js'
let db;
let objectStore;

self.onmessage = function(event) {
  const {
      type,
      payload,
  } = event.data;

  switch (type) {
    case "init": {
      db = await openDB(name, version, {
        upgrade(db, oldVersion, newVersion, transaction) {
          // …
        },
        blocked() {
          // …
        },
        blocking() {
          // …
        },
        terminated() {
          // …
        },
      });
      break;
    }
    default: {
      break;
    }
  }
}