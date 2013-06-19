describe('readDir', function () {
  var readDir = require('../readDir');
  it('reads all files and dirs (relative)', function (done) {
    readDir('./test/fixtures', function (err, files) {
      assert.ifError(err);
      assert.deepEqual(files.sort(), [
        'test/fixtures/jesus',
        'test/fixtures/totally/',
        'test/fixtures/totally/off',
        'test/fixtures/totally/satan',
        'test/fixtures/totally/the/',
        'test/fixtures/totally/the/hook',
        'test/fixtures/whoa'
      ]);
      done();
    });
  });
  it('mark option', function (done) {
    readDir('./test/fixtures', {mark: false}, function (err, files) {
      assert.ifError(err);
      assert.deepEqual(files.sort(), [
        'test/fixtures/jesus',
        'test/fixtures/totally',
        'test/fixtures/totally/off',
        'test/fixtures/totally/satan',
        'test/fixtures/totally/the',
        'test/fixtures/totally/the/hook',
        'test/fixtures/whoa'
      ]);
      done();
    });
  });
  it('reads all files and dirs (absolute)', function (done) {
    var base = path.join(__dirname, 'fixtures');
    readDir(base, function (err, files) {
      assert.ifError(err);
      assert.deepEqual(files.sort(), [
        base + '/jesus',
        base + '/totally/',
        base + '/totally/off',
        base + '/totally/satan',
        base + '/totally/the/',
        base + '/totally/the/hook',
        base + '/whoa'
      ]);
      done();
    });
  });
});
