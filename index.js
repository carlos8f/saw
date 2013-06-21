var fs = require('graceful-fs')
  , sep = require('path').sep
  , relative = require('path').relative
  , EventEmitter = require('events').EventEmitter
  , batcher = require('batcher')
  , readdirp = require('readdirp')

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

  if (options.delay) {
    var batch = batcher({
      batchSize: options.delayLimit,
      batchTimeMs: options.delay,
      encoder: function (x) { return x; }
    });
    batch
      .on('data', function (data) {
        var bases = [];
        data.forEach(function (dir) {
          if (bases.every(function (base) {
            return !~dir.indexOf(base + sep);
          })) {
            if (!~bases.indexOf(dir)) bases.push(dir);
          }
        });
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
    return 'file:' + file.fullPath + (file.stat.isDirectory() ? sep : '');
  }

  function onChange (dir) {
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
    var keys = [];

    readdirp({root: dir}, function (errors, res) {
      if (errors) return onErr(errors);
      var files = res.directories.concat(res.files);
      files.forEach(function (file) {
        file.path = relative(root, file.fullPath);
        file.parentDir = relative(root, file.fullParentDir);
        var key = cacheKey(file);
        keys.push(key);

        if (typeof cache[key] === 'undefined') {
          if (ready) {
            emitter.emit('add', file);
            emitter.emit('all', 'add', file);
          }
          watchers[key] = createWatcher(file.fullPath, file.fullParentDir);
        }
        else if (cache[key].stat.mtime.getTime() !== file.stat.mtime.getTime()) {
          emitter.emit('update', file);
          emitter.emit('all', 'update', file);
        }

        cache[key] = file;
      });

      // see if any previously seen files are missing from the tree
      Object.keys(cache).forEach(function (key) {
        var file = cache[key];
        if (file.fullPath.indexOf(dir + sep) !== 0) return;

        if (!~keys.indexOf(key)) {
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
  };

  watchers['file:' + root + sep] = createWatcher(root);
  process.nextTick(onChange);

  return emitter;
}

module.exports = saw;
