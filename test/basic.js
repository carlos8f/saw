describe('basic test', function () {
  var testDir = '/tmp/saw-test-' + idgen()
    , s

  before(function (done) {
    mkdirp(testDir, done);
  });
  before(function (done) {
    s = saw(testDir).on('ready', done);
  });
  /*
  after(function (done) {
    rimraf(testDir, done);
  });
*/
  it('listens for file', function (done) {
    s.once('add', function (p, isDir) {
      assert.equal(p, testDir + '/beans');
      assert(!isDir);
      done();
    });
    fs.writeFile(testDir + '/beans', 'beans', assert.ifError);
  });
  it('listens for new dirs', function (done) {
    var list = [];
    function listener (p, isDir) {
      list.push(p);
      assert(isDir);
      if (list.length === 2) {
        s.removeListener('add', listener);
        assert.deepEqual(list.sort(), [
          testDir + '/rice',
          testDir + '/rice/beans'
        ]);
        done();
      }
    }
    s.on('add', listener);
    mkdirp(testDir + '/rice/beans');
  });
  it('listens for new file in sub dir', function (done) {
    s.once('add', function (p, isDir) {
      assert.equal(p, testDir + '/rice/beans/meat');
      assert(!isDir);
      done();
    });
    fs.writeFile(testDir + '/rice/beans/meat', 'meat is neat', assert.ifError);
  });
  it('listens for another new file', function (done) {
    s.once('add', function (p, isDir) {
      assert.equal(p, testDir + '/rice/taters');
      assert(!isDir);
      done();
    });
    fs.writeFile(testDir + '/rice/taters', 'tater treats', assert.ifError);
  });
  it('detects remove', function (done) {
    var list = [];
    function listener () {
      var args = [].slice.call(arguments);
      list.push(args);
      console.log(list.length);
      if (list.length === 3) {
        console.log(list);
        s.removeListener('remove', listener);
        assert.deepEqual(list.sort(), [
          [testDir + '/rice', true],
          [testDir + '/rice/beans', true],
          [testDir + '/rice/beans/meat', false],
          [testDir + '/rice/taters', false]
        ]);
        done();
      }
    }
    s.on('remove', listener);
    rimraf(testDir + '/rice', assert.ifError);
  });
});
