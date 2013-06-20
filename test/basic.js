describe('basic test', function () {
  var testDir = '/tmp/saw-test-' + idgen()
    , s

  before(function (done) {
    mkdirp(testDir, done);
  });
  before(function (done) {
    s = saw(testDir).on('ready', done);
  });
  after(function (done) {
    rimraf(testDir, done);
  });
  it('listens for file', function (done) {
    s.once('add', function (p, stat) {
      assert.equal(p, testDir + '/beans');
      assert(!stat.isDirectory());
      done();
    });
    fs.writeFile(testDir + '/beans', 'beans', assert.ifError);
  });
  it('listens for new dirs', function (done) {
    var list = [];
    function listener (p, stat) {
      list.push(p);
      assert(stat.isDirectory());
    }
    s.on('add', listener);
    mkdirp(testDir + '/rice/beans');
    setTimeout(function () {
      s.removeListener('add', listener);
      assert.deepEqual(list.sort(), [
        testDir + '/rice',
        testDir + '/rice/beans'
      ]);
      done();
    }, 1000);
  });
  it('listens for new file in sub dir', function (done) {
    s.once('add', function (p, stat) {
      assert.equal(p, testDir + '/rice/beans/meat');
      assert(!stat.isDirectory());
      done();
    });
    fs.writeFile(testDir + '/rice/beans/meat', 'meat is neat', assert.ifError);
  });
  it('listens for another new file', function (done) {
    s.once('add', function (p, stat) {
      assert.equal(p, testDir + '/rice/taters');
      assert(!stat.isDirectory());
      done();
    });
    fs.writeFile(testDir + '/rice/taters', 'tater treats', assert.ifError);
  });
  it('detects remove', function (done) {
    var list = [];
    function listener (p, stat) {
      var args = [].slice.call(arguments);
      list.push([p, stat.isDirectory()]);
    }
    s.on('remove', listener);
    rimraf(testDir + '/rice', assert.ifError);
    setTimeout(function () {
      s.removeListener('remove', listener);
      console.log(list.sort());
      assert.deepEqual(list.sort(), [
        [testDir + '/rice', true],
        [testDir + '/rice/beans', true],
        [testDir + '/rice/beans/meat', false],
        [testDir + '/rice/taters', false]
      ]);
      done();
    }, 1000);
  });
  it('detects update');
  it('detects add after remove');

});
