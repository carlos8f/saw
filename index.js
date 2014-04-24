var fs = require('graceful-fs')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter
  , batcher = require('batcher')
  , rreaddir = require('rreaddir')

function saw (root, options) {
  if (typeof root === 'object') {
    options = root;
    root = null;
  }
  root || (root = process.cwd());
  options || (options = {});
  options.delay || (options.delay = 0);
  options.delayLimit || (options.delayLimit = 100);

  var emitter = new EventEmitter()
    , cache = {}
    , ready = false
    , watchers = {}
    , closed = false

  if (options.delay) {
    var batch = batcher({
      batchSize: options.delayLimit,
      batchTimeMs: options.delay,
      encoder: function (x) { return x; }
    });
    batch
      .on('data', function (data) {
        var debug = require('debug')('saw:bases');
        var bases = [];
        data.forEach(function (dir) {
          if (bases.every(function (base) {
            return !~dir.indexOf(base + path.sep);
          })) {
            if (!~bases.indexOf(dir)) bases.push(dir);
          }
        });
        debug('bases', bases);
        bases.forEach(scan);
      })
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
    return 'file:' + file.fullPath + (file.stat.isDirectory() ? path.sep : '');
  }

  function onChange (dir) {
    var debug = require('debug')('saw:onChange');
    debug('changed', dir);
    if (options.delay) batch.write(dir || root);
    else scan(dir || root);
  }

  function createWatcher (p, parentDir) {
    function onErr (err) {
      if (err.code !== 'ENOENT') emitter.emit('error', err);
    }
    try {
      return fs.watch(p, {persistent: options.persistent})
        .on('change', function () {
          // arguments passed to this function are useless.
          onChange(parentDir);
        })
        .on('error', onErr)
    }
    catch (err) {
      onErr(err);
    }
  }

  function scan (dir) {
    var debug = require('debug')('saw:scan');
    debug('scan', dir, closed && 'CLOSED');
    if (closed) return;
    var keys = [];

    rreaddir(dir, {fs: fs, stat: true}, function (err, files) {
      if (err) return onErr(err);
      debug('files length', files.length);
      files.forEach(function (file) {
        file.path = path.relative(root, file.path);
        file.parentDir = path.dirname(file.path);
        file.fullPath = path.resolve(root, file.path);
        file.fullParentDir = path.resolve(root, file.parentDir);
        var key = cacheKey(file);
        debug('cache key', key);
        keys.push(key);

        if (typeof cache[key] === 'undefined') {
          if (ready) {
            debug('add', file);
            emitter.emit('add', file);
            emitter.emit('all', 'add', file);
          }
          else debug('not ready', file);
          watchers[key] = createWatcher(file.fullPath, file.fullParentDir);
        }
        else if (cache[key].stat.mtime.getTime() !== file.stat.mtime.getTime()) {
          debug('update', file);
          emitter.emit('update', file);
          emitter.emit('all', 'update', file);
        }
        else debug('noop', file);

        cache[key] = file;
      });

      // see if any previously seen files are missing from the tree
      Object.keys(cache).forEach(function (key) {
        var file = cache[key];
        debug('compare', file.fullPath, dir + path.sep);
        if (file.fullPath.indexOf(dir + path.sep) !== 0) return;
        debug('match');

        if (!~keys.indexOf(key)) {
          debug('remove', file);
          emitter.emit('remove', file);
          emitter.emit('all', 'remove', file);
          if (watchers[key]) {
            watchers[key].close();
            delete watchers[key];
          }
          delete cache[key];
        }
      });

      if (!ready && dir === root) {
        ready = true;
        emitter.emit('ready', files);
      }
      emitter.emit('scan', dir, files);
    });
  }

  emitter.close = function () {
    // unwatch all
    Object.keys(watchers).forEach(function (k) {
      watchers[k].close();
    });
    closed = true;
  };

  watchers['file:' + root + path.sep] = createWatcher(root);
  process.nextTick(onChange);
  if (options.poll) setInterval(onChange, options.poll);

  return emitter;
}

module.exports = saw;
