saw
===

no-frills file tree watching library

[![build status](https://secure.travis-ci.org/carlos8f/saw.png)](http://travis-ci.org/carlos8f/saw)

Watch for changes in a file tree. I wrote this because I tried virtually every
other "watcher" library on npm and none were totally reliable. Many were extremely
over-engineered. This implementation works for me and is simple enough to grok.
Enjoy.

## Usage

```js
var saw = require('saw');

saw('path/to/dir')
  .on('ready', function () {
    // watcher is active
  })
  .on('add', function (p, stat) {
    // file or dir at path `p` was added
    // `stat` is an instance of `fs.Stats`
  })
  .on('remove', function (p, stat) {
    // same for removal
  })
  .on('update', function (p, stat) {
    // same for update
  })
  .on('all', function (ev, p, stat) {
    // catchall - `ev` is the event name.
  })
  // to unwatch all files, call close():
  .close()

- - -

### Developed by [Terra Eclipse](http://www.terraeclipse.com)
Terra Eclipse, Inc. is a nationally recognized political technology and
strategy firm located in Aptos, CA and Washington, D.C.

- - -

### License: MIT

- Copyright (C) 2013 Carlos Rodriguez (http://s8f.org/)
- Copyright (C) 2013 Terra Eclipse, Inc. (http://www.terraeclipse.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the &quot;Software&quot;), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is furnished
to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
