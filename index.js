var fs = require('graceful-fs')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , batcher = require('batcher')
  , readDir = require('./readDir')

function saw (dir, options) {
  if (typeof dir === 'object') {
    options = dir;
    dir = null;
  }
  dir || (dir = process.cwd());
  options || (options = {});
  options.delay || (options.delay = 0);
  options.delayLimit || (options.delayLimit = 100);

  var emitter = new EventEmitter()
    , cache = {}
    , ready = false
    , scanNum = 0

  if (options.delay) {
    var batch = batcher({
      batchSize: options.delayLimit,
      batchTimeMs: options.delay
    });
    batch
      .on('data', scan)
      .on('error', emitter.emit.bind(emitter, 'error'))
      .resume()
  }

  function onErr (err) {
    emitter.emit('error', err);
  }

  function cacheKey (file) {
    return 'file:' + file.path + (file.stat.isDirectory() ? path.sep : '');
  }

  function onChange () {
    if (options.delay) batch.write(null);
    else scan();
  }

  function createWatcher (p) {
    function onErr (err) {
      if (err.code !== 'ENOENT') emitter.emit('error', err);
    }
    try {
      return fs.watch(p, {persistent: options.persistent})
        .on('change', onChange)
        .on('error', onErr)
    }
    catch (err) {
      onErr(err);
      // not worth watching a file that no longer exists. graceful.
      return false;
    }
  }

  function scan () {
    var num = ++scanNum;
    var keys = [];

    readDir(dir, {stat: true}, function (err, files) {
      if (err) return onErr(err);
      if (num !== scanNum) return; // there is a new scan running, abort
      // copy cache for later comparison
      var lastFiles = Object.keys(cache).map(function (k) {
        return cache[k];
      });
      files.forEach(function (file) {
        var key = cacheKey(file);
        keys.push(key);

        if (typeof cache[key] === 'undefined') {
          emitter.emit('add', file.path, file.stat);
          emitter.emit('all', 'add', file.path, file.stat);
          if (file.stat.isDirectory()) {
            file.watcher = createWatcher(file.path);
          }
        }
        else if (cache[key].stat.mtime.getTime() !== file.stat.mtime.getTime()) {
          emitter.emit('update', file.path, file.stat);
          emitter.emit('all', 'update', file.path, file.stat);
        }
        cache[key] = file;
      });

      // see if any previously seen files are missing from the tree
      lastFiles.forEach(function (file) {
        var key = cacheKey(file);
        if (!~keys.indexOf(key)) {
          emitter.emit('remove', file.path, file.stat);
          emitter.emit('all', 'remove', file.path, file.stat);
          if (file.watcher) file.watcher.close();
          delete cache[key];
        }
      });

      if (!ready) {
        ready = true;
        emitter.emit('ready');
      }
    });
  }

  emitter.close = function () {
    // unwatch all
    emitter.watcher.close();
    Object.keys(cache).forEach(function (k) {
      if (cache[k].watcher) cache[k].watcher.close();
    });
    cache = {};
  };

  emitter.watcher = createWatcher(dir);
  process.nextTick(onChange);

  return emitter;
}

module.exports = saw;
