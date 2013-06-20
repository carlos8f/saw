describe('basic test', function () {
  var testDir = '/tmp/saw-test-' + idgen()
    , s
    , onAll = sinon.spy()
    , onAdd = sinon.spy()
    , onUpdate = sinon.spy()
    , onRemove = sinon.spy()
    , onError = sinon.spy()

  function wait (cb) {
    setTimeout(cb, 1000);
  }

  function isDir (stat) {
    return stat.isDirectory();
  }

  function isFile (stat) {
    return !stat.isDirectory();
  }

  beforeEach(function() {
    onAdd.reset();
    onUpdate.reset();
    onRemove.reset();
  });
  before(function (done) {
    mkdirp(testDir, function (err) {
      if (err) return done(err);
      fs.realpath(testDir, function (err, resolvedPath) {
        if (err) return done(err);
        testDir = resolvedPath;
        done();
      });
    });
  });
  before(function (done) {
    s = saw(testDir).on('ready', function (files) {
      assert.equal(files.length, 0);
      done();
    });
    s.on('all', onAll);
    s.on('add', onAdd);
    s.on('update', onUpdate);
    s.on('remove', onRemove);
    s.on('error', onError);
  });
  after(function (done) {
    rimraf(testDir, done);
  });
  it('listens for file', function (done) {
    fs.writeFile(testDir + '/beans', 'beans', assert.ifError);
    wait(function () {
      assertCalledOnce(onAdd);
      assertCalledWithMatch(onAdd, testDir + '/beans', isFile);
      assertNotCalled(onUpdate);
      assertNotCalled(onRemove);
      done();
    });
  });
  it('listens for new dirs', function (done) {
    mkdirp(testDir + '/rice/beans');
    wait(function () {
      assertCalledTwice(onAdd);
      assertCalledWithMatch(onAdd, testDir + '/rice', isDir);
      assertCalledWithMatch(onAdd, testDir + '/rice/beans', isDir);
      assertNotCalled(onUpdate);
      assertNotCalled(onRemove);
      done();
    });
  });
  it('listens for new file in sub dir', function (done) {
    fs.writeFile(testDir + '/rice/beans/meat', 'meat is neat', assert.ifError);
    wait(function () {
      assertCalledOnce(onAdd);
      assertCalledWithMatch(onAdd, testDir + '/rice/beans/meat', isFile);
      assertCalledOnce(onUpdate);
      assertCalledWithMatch(onUpdate, testDir + '/rice/beans', isDir);
      assertNotCalled(onRemove);
      done();
    });
  });
  it('listens for another new file', function (done) {
    fs.writeFile(testDir + '/rice/taters', 'tater treats', assert.ifError);
    wait(function () {
      assertCalledOnce(onAdd);
      assertCalledWithMatch(onAdd, testDir + '/rice/taters', isFile);
      assertCalledOnce(onUpdate);
      assertCalledWithMatch(onUpdate, testDir + '/rice', isDir);
      assertNotCalled(onRemove);
      done();
    });
  });
  it('detects rimraf', function (done) {
    rimraf(testDir + '/rice', assert.ifError);
    wait(function () {
      assert.equal(onRemove.callCount, 4);
      assertCalledWithMatch(onRemove, testDir + '/rice', isDir);
      assertCalledWithMatch(onRemove, testDir + '/rice/beans', isDir);
      assertCalledWithMatch(onRemove, testDir + '/rice/beans/meat', isFile);
      assertCalledWithMatch(onRemove, testDir + '/rice/taters', isFile);
      assertNotCalled(onAdd);
      assertNotCalled(onUpdate);
      done();
    });
  });
  it('detects single remove', function (done) {
    fs.unlink(testDir + '/beans', assert.ifError);
    wait(function () {
      assertCalledOnce(onRemove);
      assertCalledWithMatch(onRemove, testDir + '/beans', isFile);
      assertNotCalled(onAdd);
      assertNotCalled(onUpdate);
      done();
    });
  });
  it('another mkdirp', function (done) {
    done();
  });
  it('detects remove of empty dir');
  it('detects update');
  it('detects add after remove');
  it('multiple saws'); // assert 'ready' files is populated
  it('unwatch', function (done) {
    s.close();
    done();
  });
});
