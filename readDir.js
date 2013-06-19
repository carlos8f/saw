var fs = require('fs')
  , path = require('path')

// recursive readDir
module.exports = function readDir (startDir, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  options || (options = {});

  var ret = []
    , latch = 0

  function addFile (file, stat) {
    if (options.mark && stat.isDirectory()) file += path.sep;
    if (options.stat) {
      ret.push({
        path: file,
        stat: stat
      });
    }
    else {
      ret.push(file);
    }
  }

  (function read (dir) {
    latch++;
    fs.readdir(dir, function (err, files) {
      if (err) return cb(err);
      latch += files.length;
      if (!--latch) cb(null, ret);
      files.forEach(function (file) {
        file = path.join(dir, file);
        fs.stat(file, function (err, stat) {
          if (err) return cb(err);
          if (stat.isDirectory()) {
            addFile(file, stat);
            read(file);
          }
          else {
            addFile(file, stat);
          }
          if (!--latch) cb(null, ret);
        });
      });
    });
  })(startDir);
};
