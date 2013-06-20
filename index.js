var fs = require('graceful-fs')
  , sep = require('path').sep
  , EventEmitter = require('events').EventEmitter
  , batcher = require('batcher')
  , readdirp = require('readdirp')

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
    , watchers = {}

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
    if (Array.isArray(err)) {
      err.forEach(onErr);
      return;
    }
    if (err.code === 'ENOENT') return;
    emitter.emit('error', err);
  }

  function cacheKey (file) {
    return 'file:' + file.fullPath + (file.stat.isDirectory() ? sep : '');
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
    }
  }

  function scan () {
    var keys = [];

    readdirp({root: dir}, function (errors, res) {
      if (errors) return onErr(errors);
      var files = res.directories.concat(res.files);
      files.forEach(function (file) {
        var key = cacheKey(file);
        keys.push(key);

        if (typeof cache[key] === 'undefined') {
          if (ready) {
            emitter.emit('add', file.fullPath, file.stat);
            emitter.emit('all', 'add', file.fullPath, file.stat);
          }
          watchers[key] = createWatcher(file.fullPath);
        }
        else if (cache[key].stat.mtime.getTime() !== file.stat.mtime.getTime()) {
          emitter.emit('update', file.fullPath, file.stat);
          emitter.emit('all', 'update', file.fullPath, file.stat);
        }

        cache[key] = file;
      });

      // see if any previously seen files are missing from the tree
      Object.keys(cache).forEach(function (key) {
        var file = cache[key];

        if (!~keys.indexOf(key)) {
          emitter.emit('remove', file.fullPath, file.stat);
          emitter.emit('all', 'remove', file.fullPath, file.stat);
          if (watchers[key]) {
            watchers[key].close();
            delete watchers[key];
          }
          delete cache[key];
        }
      });

      if (!ready) {
        ready = true;
        emitter.emit('ready', files);
      }
    });
  }

  emitter.close = function () {
    // unwatch all
    Object.keys(watchers).forEach(function (k) {
      watchers[k].close();
    });
  };

  watchers['file:' + dir + sep] = createWatcher(dir);
  process.nextTick(onChange);

  return emitter;
}

module.exports = saw;
