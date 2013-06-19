var fs = require('fs')
  , path = require('path')
  , EventEmitter = require('events').EventEmitter

function saw (dir) {
  var emitter = new EventEmitter();
  if (!dir) dir = process.cwd();
  var cache = {};
  var ready = false;
  (function scan () {
    function done () {
      if (!ready) {
        ready = true;
        emitter.emit('ready');
      }
    }
    function onErr (err) {
      emitter.emit('error', err);
    }

    var latch = 0;
    (function catalog (file) {
      var c = cache['file:' + file]
        , isNew

      if (typeof c === 'undefined') {
        isNew = true;
        c = cache['file:' + file] = {
          mtime: null,
          contents: null,
          isDir: null
        };
      }

      // recursive readDir
      function readDir (cb) {
        (function read (dir) {
          fs.readDir(dir, function (err, files) {
            if (err) return onErr(err);
            files = files.map(function (f) {
              return path.join(file, f);
            });
            
          });
        })(file);
      }

      latch++;
      fs.stat(file, function (err, stat) {
        if (err) return onErr(err);
        c.mtime = stat.mtime.getTime();
        if (stat.isDirectory()) {
          c.isDir = true;
          if (isNew) {
            emitter.emit('add', file, c.isDir);
            // watch this dir
            fs.watch(file, scan);
          }
          readDir(function (err, files) {
            if (err) return onErr(err);
            
            console.log('files', file, files);
            (function remove (c) {
              if (c.contents) {
                console.log('prev', file, c.contents);
                // detect remove
                c.contents.forEach(function (file) {
                  var sub = cache['file:' + file];
                  if (sub) remove(sub);
                  if (!~files.indexOf(file)) {
                    var r = cache['file:' + file];
                    emitter.emit('remove', file, r.isDir);
                  }
                });
              }
            })(c);
            c.contents = files;
            files.forEach(catalog);
            if (!--latch) done();
          });
        }
        else {
          c.isDir = false;
          if (isNew) {
            emitter.emit('add', file, c.isDir);
          }
          if (!--latch) done();
        }
      });
    })(dir);
  })();

  return emitter;
}

module.exports = saw;
