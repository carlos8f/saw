var path = require('path')
  , fs = require('fs')
  , EventEmitter = require('events').EventEmitter
  , glob = require('glob')
  , LRU = require('lru-cache')
  , minimatch = require('minimatch')

function saw (pattern, options) {
  if (pattern && pattern.constructor === Object) {
    options = pattern;
    pattern = null;
  }
  options || (options = {});
  if (Array.isArray(pattern)) pattern = '{' + (pattern.join(',')) + '}';
  else if (!pattern) pattern = '.';

  try {
    var stat = fs.statSync(pattern);
    if (stat && stat.isDirectory()) {
      options.cwd || (options.cwd = path.resolve(pattern));
      pattern = pattern.replace(path.sep, '/');
      pattern = '{' + pattern + ',' + pattern + '/**/*}';
    }
  }
  catch (e) {}

  var emitter = new EventEmitter();
  emitter.cwd = options.cwd || path.resolve(process.cwd());
  emitter.ready = false;
  emitter.scanning = false;
  emitter.cache = LRU(options.cache || {});
  emitter.scan = scan;
  emitter.closed = false;

  function onErr (err) {
    if (err.code === 'ENOENT') return;
    emitter.emit('error', err);
  }

  function cacheKey (file) {
    return 'file:' + file.fullPath + (file.stat.isDirectory() ? path.sep : '');
  }

  function createWatcher (p) {
    function onErr (err) {
      if (err.code !== 'ENOENT') emitter.emit('error', err);
    }
    try {
      return fs.watch(p, {persistent: options.persistent})
        .on('change', scan)
        .on('error', onErr)
    }
    catch (err) {
      onErr(err);
    }
  }

  function scan () {
    if (emitter.scanning) {
      if (!emitter.ready) emitter.once('ready', scan);
      else emitter.once('scan', scan);
      return false;
    }
    if (emitter.closed) return false;
    emitter.scanning = true;
    var keys = [];
    var latch = 1;

    function cleanup () {
      var files = [];
      emitter.cache.forEach(function (file, key) {
        if (file.deleted) return;
        if (!~keys.indexOf(key)) {
          file.watcher.close();
          file.deleted = true;
          emitter.emit('remove', file);
          emitter.emit('all', 'remove', file);
          var dirPath = path.dirname(file.fullPath);
          if (dirPath !== emitter.cwd && minimatch(dirPath, pattern)) {
            latch++;
            fs.stat(dirPath, function (err, stat) {
              if (err) {
                onErr(err);
                if (!--latch) end();
                return;
              }
              onStat(dirPath, stat, true);
              if (!--latch) end();
            });
          }
          emitter.cache.set(key, file);
        }
        if (file.fullPath !== options.cwd) files.push(file);
      });
      return files;
    }

    function end () {
      var files = cleanup();
      if (!latch) {
        emitter.scanning = false;
        emitter.emit('scan', files);
        if (!latch && !emitter.ready) {
          emitter.ready = true;
          emitter.emit('ready', files);
        }
      }
    }

    function onStat (p, stat, forceUpdate) {
      var file = {
        path: path.relative(emitter.cwd, p),
        fullPath: path.resolve(p),
        stat: stat
      };
      var key = cacheKey(file);
      if (!forceUpdate && ~keys.indexOf(key)) return;
      keys.push(key);
      var cached = emitter.cache.get(key);
      var op = 'noop';
      if (forceUpdate || (cached && cached.stat.isFile() && cached.stat.mtime.getTime() !== file.stat.mtime.getTime())) {
        if (!cached || cached.deleted) file.watcher = createWatcher(file.fullPath);
        else file.watcher = cached.watcher;
        op = 'update';
      }
      else if (!cached || cached.deleted) {
        op = 'add';
        file.watcher = createWatcher(file.fullPath);
      }
      if (op !== 'noop') {
        emitter.cache.set(key, file);
        if (emitter.ready && file.fullPath !== emitter.cwd) {
          emitter.emit(op, file);
          emitter.emit('all', op, file);
          if (file.stat.isFile()) {
            var dirPath = path.dirname(file.fullPath);
            if (dirPath !== emitter.cwd && minimatch(dirPath, pattern)) {
              latch++;
              fs.stat(dirPath, function (err, stat) {
                if (err) {
                  onErr(err);
                  if (!--latch) end();
                  return;
                }
                onStat(dirPath, stat, true);
                if (!--latch) end();
              });
            }
          }
        }
      }
    }

    var search = glob(pattern, {stat: true, cwd: emitter.cwd, dot: options.dot})
      .on('error', onErr)
      .on('stat', onStat)
      .on('end', function () {
        if (!--latch) end();
      });
  }

  emitter.close = function () {
    // unwatch all
    emitter.cache.forEach(function (file, key) {
      if (file.deleted) return;
      file.watcher.close();
      file.deleted = true;
      emitter.cache.set(key, file);
    });
    emitter.closed = true;
  };

  setImmediate(scan);

  return emitter;
}

module.exports = saw;
