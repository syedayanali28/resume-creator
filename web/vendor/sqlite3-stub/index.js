"use strict";

const { EventEmitter } = require("node:events");

class Statement extends EventEmitter {
  bind(...args) {
    return this;
  }
  reset(cb) {
    if (cb) queueMicrotask(() => cb(null));
    return this;
  }
  finalize(cb) {
    if (cb) queueMicrotask(() => cb(null));
    return this._db;
  }
  run(...args) {
    const cb = typeof args[args.length - 1] === "function" ? args.pop() : null;
    if (cb) queueMicrotask(() => cb.call(this, null));
    return this;
  }
}

class Database extends EventEmitter {
  constructor(filename, mode, callback) {
    super();
    if (typeof mode === "function") {
      callback = mode;
    }
    if (typeof callback === "function") {
      queueMicrotask(() => callback.call(this, null));
    }
  }
  close(cb) {
    if (cb) queueMicrotask(() => cb(null));
  }
  configure() {}
  run(...args) {
    const cb = typeof args[args.length - 1] === "function" ? args.pop() : null;
    if (cb) queueMicrotask(() => cb.call(this, null));
    return this;
  }
  get(...args) {
    const cb = args[args.length - 1];
    if (typeof cb === "function") queueMicrotask(() => cb(null, undefined));
  }
  all(...args) {
    const cb = args[args.length - 1];
    if (typeof cb === "function") queueMicrotask(() => cb(null, []));
  }
  exec(sql, cb) {
    if (typeof cb === "function") queueMicrotask(() => cb(null));
  }
  prepare(sql, callback) {
    const stmt = new Statement();
    stmt._db = this;
    if (typeof callback === "function") {
      queueMicrotask(() => callback(null, stmt));
      return;
    }
    return stmt;
  }
  serialize(cb) {
    if (cb) queueMicrotask(cb);
  }
  parallelize(cb) {
    if (cb) queueMicrotask(cb);
  }
}

function verbose() {
  return () => {};
}

const cached = {
  Database(filename, a, b) {
    return new Database(filename, a, b);
  },
};

const sqlite3 = (module.exports = {
  Database,
  Statement,
  verbose,
  cached,
  VERSION: "0.0.0-stub",
  SOURCE_ID: "stub",
  VERSION_NUMBER: 0,
  OPEN_READONLY: 1,
  OPEN_READWRITE: 2,
  OPEN_CREATE: 4,
  OPEN_FULLMUTEX: 0,
  OPEN_SHAREDCACHE: 0,
  OPEN_PRIVATECACHE: 0,
  OPEN_URI: 0,
});
