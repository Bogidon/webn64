/**  The Emularity; easily embed emulators
  *  Copyright © 2014-2016 Daniel Brooks <db48x@db48x.net>, Jason
  *  Scott <jscott@archive.org>, Grant Galitz <grantgalitz@gmail.com>,
  *  John Vilk <jvilk@cs.umass.edu>, and Tracey Jaquith <tracey@archive.org>
  *
  *  This program is free software: you can redistribute it and/or modify
  *  it under the terms of the GNU General Public License as published by
  *  the Free Software Foundation, either version 3 of the License, or
  *  (at your option) any later version.
  *
  *  This program is distributed in the hope that it will be useful,
  *  but WITHOUT ANY WARRANTY; without even the implied warranty of
  *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  *  GNU General Public License for more details.
  *
  *  You should have received a copy of the GNU General Public License
  *  along with this program.  If not, see <http://www.gnu.org/licenses/>.
  */

var Module = null;

(function (Promise) {
    /**
    * MAMELoader
    */
  function MAMELoader () {
    var config = Array.prototype.reduce.call(arguments, extend)
    config.emulator_arguments = build_mame_arguments(config.muted, config.mame_driver,
                                                      config.nativeResolution, config.sample_rate,
                                                      config.peripheral, config.extra_mame_args)
    return config
  }

  MAMELoader.canvas = function (id) {
    var elem = id instanceof Element ? id : document.getElementById(id)
    return { canvas: elem }
  }

  MAMELoader.emulatorJS = function (url) {
    return { emulatorJS: url }
  }

  MAMELoader.locateAdditionalEmulatorJS = function (func) {
    return { locateAdditionalJS: func }
  }

  MAMELoader.fileSystemKey = function (key) {
    return { fileSystemKey: key }
  }

  MAMELoader.nativeResolution = function (width, height) {
    if (typeof width !== 'number' || typeof height !== 'number') {
      throw new Error('Width and height must be numbers')
    }
    return { nativeResolution: { width: Math.floor(width), height: Math.floor(height) } }
  }

  MAMELoader.aspectRatio = function (ratio) {
    if (typeof ratio !== 'number') {
      throw new Error('Aspect ratio must be a number')
    }
    return { aspectRatio: ratio }
  }

  MAMELoader.sampleRate = function (rate) {
    return { sample_rate: rate }
  }

  MAMELoader.muted = function (muted) {
    return { muted: muted }
  }

  MAMELoader.mountZip = function (drive, file) {
    return { files: [{ drive: drive,
      mountpoint: '/' + drive,
      file: file
    }] }
  }

  MAMELoader.mountFile = function (filename, file) {
    return { files: [{ mountpoint: filename,
      file: file
    }] }
  }

  MAMELoader.fetchFile = function (title, url) {
    return { title: title, url: url, optional: false }
  }

  MAMELoader.fetchOptionalFile = function (title, url) {
    return { title: title, url: url, optional: true }
  }

  MAMELoader.localFile = function (title, data) {
    return { title: title, data: data }
  }

  MAMELoader.driver = function (driver) {
    return { mame_driver: driver }
  }

  MAMELoader.peripheral = function (peripheral, game) {
    var p = {}
    p[peripheral] = [game]
    return { peripheral: p }
  }

  MAMELoader.extraArgs = function (args) {
    return { extra_mame_args: args }
  }

  var build_mame_arguments = function (muted, driver, native_resolution, sample_rate, peripheral, extra_args) {
    var args = [driver,
      '-verbose',
      '-rompath', 'emulator',
      '-window',
      '-nokeepaspect']

    if (native_resolution && 'width' in native_resolution && 'height' in native_resolution) {
      args.push('-resolution', [native_resolution.width, native_resolution.height].join('x'))
    }

    if (muted) {
      args.push('-sound', 'none')
    } else if (sample_rate) {
      args.push('-samplerate', sample_rate)
    }

    if (peripheral) {
      for (var p in peripheral) {
        if (Object.prototype.propertyIsEnumerable.call(peripheral, p)) {
          args.push('-' + p,
                     '/emulator/' + (peripheral[p][0].replace(/\//g, '_')))
        }
      }
    }

    if (extra_args) {
      args = args.concat(extra_args)
    }

    return args
  }

   /**
    * Emulator
    */
  function Emulator (canvas, callbacks, loadFiles) {
    if (typeof callbacks !== 'object') {
      callbacks = { before_emulator: null,
        before_run: callbacks }
    }
    var js_url
    var requests = []
    var drawloadingtimer
     // TODO: Have an enum value that communicates the current state of the emulator, e.g. 'initializing', 'loading', 'running'.
    var has_started = false
    var loading = false

    var runner

    var muted = false
    var SDL_PauseAudio
    this.isMuted = function () { return muted }
    this.mute = function () { return this.setMute(true) }
    this.unmute = function () { return this.setMute(false) }
    this.toggleMute = function () { return this.setMute(!muted) }
    this.setMute = function (state) {
      muted = state
      if (runner) {
        if (state) {
          runner.mute()
        } else {
          runner.unmute()
        }
      } else {
        try {
          if (!SDL_PauseAudio) {
            SDL_PauseAudio = Module.cwrap('SDL_PauseAudio', '', ['number'])
          }
          SDL_PauseAudio(state)
        } catch (x) {
          console.log('Unable to change audio state:', x)
        }
      }
      return this
    }

     // This is the bare minimum that will allow gamepads to work. If
     // we don't listen for them then the browser won't tell us about
     // them.
     // TODO: add hooks so that some kind of UI can be displayed.
    window.addEventListener('gamepadconnected',
                             function (e) {
                               console.log('Gamepad connected at index %d: %s. %d buttons, %d axes.',
                                           e.gamepad.index, e.gamepad.id,
                                           e.gamepad.buttons.length, e.gamepad.axes.length)
                             })

    window.addEventListener('gamepaddisconnected',
                             function (e) {
                               console.log('Gamepad disconnected from index %d: %s',
                                           e.gamepad.index, e.gamepad.id)
                             })

    if (/archive\.org$/.test(document.location.hostname && document.getElementById('gofullscreen'))) {
      document.getElementById('gofullscreen').addEventListener('click', this.requestFullScreen)
    }

    var css_resolution, scale, aspectRatio
     // right off the bat we set the canvas's inner dimensions to
     // whatever it's current css dimensions are; this isn't likely to be
     // the same size that dosbox/jsmame will set it to, but it avoids
     // the case where the size was left at the default 300x150
    if (!canvas.hasAttribute('width')) {
      var style = getComputedStyle(canvas)
      canvas.width = parseInt(style.width, 10)
      canvas.height = parseInt(style.height, 10)
    }

    this.setScale = function (_scale) {
      scale = _scale
      return this
    }

    this.setCSSResolution = function (_resolution) {
      css_resolution = _resolution
      return this
    }

    this.setAspectRatio = function (_aspectRatio) {
      aspectRatio = _aspectRatio
      return this
    }

    this.setCallbacks = function (_callbacks) {
      if (typeof _callbacks !== 'object') {
        callbacks = { before_emulator: null,
          before_run: _callbacks }
      } else {
        callbacks = _callbacks
      }
      return this
    }

    this.setLoad = function (loadFunc) {
      loadFiles = loadFunc
      return this
    }

    var start = function (options) {
      if (has_started) { return false }
      has_started = true
      if (typeof options !== 'object') {
        options = { waitAfterDownloading: false }
      }

      var k, c, game_data

      var loading

      if (typeof loadFiles === 'function') {
        loading = loadFiles(fetch_file, splash)
      } else {
        loading = Promise.resolve(loadFiles)
      }
      loading.then(function (_game_data) {
        return new Promise(function (resolve, reject) {
          var inMemoryFS = new BrowserFS.FileSystem.InMemory()
          // If the browser supports IndexedDB storage, mirror writes to that storage
          // for persistence purposes.
          if (BrowserFS.FileSystem.IndexedDB.isAvailable()) {
            var AsyncMirrorFS = BrowserFS.FileSystem.AsyncMirror,
              IndexedDB = BrowserFS.FileSystem.IndexedDB
            deltaFS = new AsyncMirrorFS(inMemoryFS,
                                                      new IndexedDB(function (e, fs) {
                                                        if (e) {
                                                          // we probably weren't given access;
                                                          // private window for example.
                                                          // don't fail completely, just don't
                                                          // use indexeddb
                                                          deltaFS = inMemoryFS
                                                          finish()
                                                        } else {
                                                          // Initialize deltaFS by copying files from async storage to sync storage.
                                                          deltaFS.initialize(function (e) {
                                                            if (e) {
                                                              reject(e)
                                                            } else {
                                                              finish()
                                                            }
                                                          })
                                                        }
                                                      },
                                                                    'fileSystemKey' in _game_data ? _game_data.fileSystemKey
                                                                                                  : 'emularity'))
          } else {
            finish()
          }

          function finish () {
            game_data = _game_data

                          // Any file system writes to MountableFileSystem will be written to the
                          // deltaFS, letting us mount read-only zip files into the MountableFileSystem
                          // while being able to "write" to them.
            game_data.fs = new BrowserFS.FileSystem.OverlayFS(deltaFS,
                                                                            new BrowserFS.FileSystem.MountableFileSystem())
            game_data.fs.initialize(function (e) {
              if (e) {
                console.error('Failed to initialize the OverlayFS:', e)
                reject()
              } else {
                var Buffer = BrowserFS.BFSRequire('buffer').Buffer

                function fetch (file) {
                  if ('data' in file && file.data !== null && typeof file.data !== 'undefined') {
                    return Promise.resolve(file.data)
                  }
                  return fetch_file(file.title, file.url, 'arraybuffer', file.optional)
                }

                function mountat (drive) {
                  return function (data) {
                    if (data !== null) {
                      drive = drive.toLowerCase()
                      var mountpoint = '/' + drive
                                    // Mount into RO MFS.
                      game_data.fs.getOverlayedFileSystems().readable.mount(mountpoint, BFSOpenZip(new Buffer(data)))
                    }
                  }
                }

                function saveat (filename) {
                  return function (data) {
                    if (data !== null) {
                      game_data.fs.writeFileSync('/' + filename, new Buffer(data), null, flag_w, 0x1a4)
                    }
                  }
                }
                Promise.all(game_data.files
                                                   .map(function (f) {
                                                     if (f && f.file) {
                                                       if (f.drive) {
                                                         return fetch(f.file).then(mountat(f.drive))
                                                       } else if (f.mountpoint) {
                                                         return fetch(f.file).then(saveat(f.mountpoint))
                                                       }
                                                     }
                                                     return null
                                                   }))
                                                   .then(resolve, reject)
              }
            })
          }
        })
      })
              .then(function (game_files) {
                if (!game_data) {
                  return null
                }
                return Promise.resolve()
              })
              .then(function () {
                if (!game_data) {
                  return null
                }

                // Don't let arrow, pg up/down, home, end affect page position
                blockSomeKeys()
                setupFullScreen()
                disableRightClickContextMenu(canvas)

                      // Emscripten doesn't use the proper prefixed functions for fullscreen requests,
                      // so let's map the prefixed versions to the correct function.
                canvas.requestPointerLock = getpointerlockenabler()

                Module = init_module(game_data.emulator_arguments, game_data.fs, game_data.locateAdditionalJS,
                                           game_data.nativeResolution, game_data.aspectRatio)

                if (callbacks && callbacks.before_emulator) {
                  try {
                    callbacks.before_emulator()
                  } catch (x) {
                    console.log(x)
                  }
                }
                if (game_data.emulatorJS) {
                  return attach_script(game_data.emulatorJS)
                }
                return null
              },
                    function () {
                      if (!game_data) {
                        return null
                      }
                    })
              .then(function () {
                if (!game_data) {
                  return null
                }
                if ('runner' in game_data) {
                  runner = new game_data.runner(canvas, game_data)
                  configureCanvas(canvas)
                  runner.onReset(function () {
                    if (muted) {
                      runner.mute()
                    }
                  })
                  runner.start()
                }
              })
      return this
    }
    this.start = start

    var init_module = function (args, fs, locateAdditionalJS, nativeResolution, aspectRatio) {
      return { arguments: args,
        screenIsReadOnly: true,
        print: function (text) { console.log(text) },
        canvas: canvas,
        noInitialRun: false,
        locateFile: locateAdditionalJS,
        preInit: function () {
                           // Re-initialize BFS to just use the writable in-memory storage.
          BrowserFS.initialize(fs)
          var BFS = new BrowserFS.EmscriptenFS()
                           // Mount the file system into Emscripten.
          FS.mkdir('/emulator')
          FS.mount(BFS, {root: '/'}, '/emulator')

          // Emit window-wide event that emulator has started
          var event = new Event('emulatorStarted')
          window.dispatchEvent(event)

          setTimeout(function () {
            configureCanvas(canvas)
          })
          if (callbacks && callbacks.before_run) {
            window.setTimeout(function () { callbacks.before_run() }, 0)
          }
        }
      }
    }

    var formatSize = function (event) {
      if (event.lengthComputable) {
        return '(' + (event.total ? (event.loaded / event.total * 100).toFixed(0)
                                  : '100') +
                '%; ' + formatBytes(event.loaded) +
                ' of ' + formatBytes(event.total) + ')'
      }
      return '(' + formatBytes(event.loaded) + ')'
    }

    var formatBytes = function (bytes, base10) {
      if (bytes === 0) {
        return '0 B'
      }
      var unit = base10 ? 1000 : 1024,
        units = base10 ? ['B', 'kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']
                            : ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'],
        exp = parseInt((Math.log(bytes) / Math.log(unit))),
        size = bytes / Math.pow(unit, exp)
      return size.toFixed(1) + ' ' + units[exp]
    }

    var fetch_file = function (title, url, rt, optional) {
      return new Promise(function (resolve, reject) {
        var xhr = new XMLHttpRequest()
        xhr.open('GET', url, true)
        xhr.responseType = rt || 'arraybuffer'
        xhr.onload = function (e) {
          if (xhr.status === 200) {
            resolve(xhr.response)
          } else if (optional) {
            resolve(null)
          } else {
            failure()
            reject()
          }
        }
        xhr.onerror = function (e) {
          if (optional) {
            success()
            resolve(null)
          } else {
            failure()
            reject()
          }
        }
        xhr.send()
      })
    }

    function keyevent (resolve) {
      return function (e) {
        if (e.which == 32) {
          e.preventDefault()
          resolve()
        }
      }
    };

    var configureCanvas = function (canvas) {
      if (scale && resolution) {
         // optimizeSpeed is the standardized value. different
         // browsers support different values; they will all ignore
         // values that they don't understand.
        canvas.style.imageRendering = '-moz-crisp-edges'
        canvas.style.imageRendering = '-o-crisp-edges'
        canvas.style.imageRendering = '-webkit-optimize-contrast'
        canvas.style.imageRendering = 'optimize-contrast'
        canvas.style.imageRendering = 'crisp-edges'
        canvas.style.imageRendering = 'pixelated'
        canvas.style.imageRendering = 'optimizeSpeed'
      }
    }

    var clearCanvas = function () {
      var context = canvas.getContext('2d')
      context.fillRect(0, 0, canvas.width, canvas.height)
      console.log('canvas cleared')
    }

    function attach_script (js_url) {
      return new Promise(function (resolve, reject) {
        var newScript
        function loaded (e) {
          if (e.target == newScript) {
            newScript.removeEventListener('load', loaded)
            newScript.removeEventListener('error', failed)
            resolve()
          }
        }
        function failed (e) {
          if (e.target == newScript) {
            newScript.removeEventListener('load', loaded)
            newScript.removeEventListener('error', failed)
            reject()
          }
        }
        if (js_url) {
          var head = document.getElementsByTagName('head')[0]
          newScript = document.createElement('script')
          newScript.addEventListener('load', loaded)
          newScript.addEventListener('error', failed)
          newScript.type = 'text/javascript'
          newScript.src = js_url
          head.appendChild(newScript)
        }
      })
    }

    function getpointerlockenabler () {
      return canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock
    }

    this.isfullscreensupported = function () {
      return !!(getfullscreenenabler())
    }

    function setupFullScreen () {
      var self = this
      var fullScreenChangeHandler = function () {
        if (!(document.mozFullScreenElement || document.fullScreenElement)) {
          configureCanvas(canvas)
        }
      }
      if ('onfullscreenchange' in document) {
        document.addEventListener('fullscreenchange', fullScreenChangeHandler)
      } else if ('onmozfullscreenchange' in document) {
        document.addEventListener('mozfullscreenchange', fullScreenChangeHandler)
      } else if ('onwebkitfullscreenchange' in document) {
        document.addEventListener('webkitfullscreenchange', fullScreenChangeHandler)
      }
    };

    this.requestFullScreen = function () {
      if (typeof Module === 'object' && 'requestFullScreen' in Module) {
        Module.requestFullScreen(1, 0)
      } else if (runner) {
        runner.requestFullScreen()
      }
    }

     /**
       * Prevents page navigation keys such as page up/page down from
       * moving the page while the user is playing.
       */
    function blockSomeKeys () {
      function keypress (e) {
        if (e.which >= 33 && e.which <= 40) {
          e.preventDefault()
          return false
        }
        return true
      }
      window.onkeydown = keypress
    }

     /**
       * Disables the right click menu for the given element.
       */
    function disableRightClickContextMenu (element) {
      element.addEventListener('contextmenu',
                                function (e) {
                                  if (e.button == 2) {
                                    // Block right-click menu thru preventing default action.
                                    e.preventDefault()
                                  }
                                })
    }
  };

   /**
    * misc
    */
  function getfullscreenenabler () {
    return canvas.requestFullScreen || canvas.webkitRequestFullScreen || canvas.mozRequestFullScreen
  }

  function BFSOpenZip (loadedData) {
    return new BrowserFS.FileSystem.ZipFS(loadedData)
  };

   // This is such a hack. We're not calling the BrowserFS api
   // "correctly", so we have to synthesize these flags ourselves
  var flag_r = { isReadable: function () { return true },
    isWriteable: function () { return false },
    isTruncating: function () { return false },
    isAppendable: function () { return false },
    isSynchronous: function () { return false },
    isExclusive: function () { return false },
    pathExistsAction: function () { return 0 },
    pathNotExistsAction: function () { return 1 }
  }
  var flag_w = { isReadable: function () { return false },
    isWriteable: function () { return true },
    isTruncating: function () { return false },
    isAppendable: function () { return false },
    isSynchronous: function () { return false },
    isExclusive: function () { return false },
    pathExistsAction: function () { return 0 },
    pathNotExistsAction: function () { return 3 }
  }

  function extend (a, b) {
    if (a === null) {
      return b
    }
    if (b === null) {
      return a
    }
    var ta = typeof a,
      tb = typeof b
    if (ta !== tb) {
      if (ta === 'undefined') {
        return b
      }
      if (tb === 'undefined') {
        return a
      }
      throw new Error('Cannot extend an ' + ta + ' with an ' + tb)
    }
    if (Array.isArray(a)) {
      return a.concat(b)
    }
    if (ta === 'object') {
      Object.keys(b).forEach(function (k) {
        a[k] = extend(k in a ? a[k] : undefined, b[k])
      })
      return a
    }
    return b
  }

  function dict_from_xml (xml) {
    if (xml instanceof XMLDocument) {
      xml = xml.documentElement
    }
    var dict = {}
    var len = xml.childNodes.length, i
    for (i = 0; i < len; i++) {
      var node = xml.childNodes[i]
      dict[node.nodeName] = node.textContent
    }
    return dict
  }

  function list_from_xml (xml) {
    if (xml instanceof XMLDocument) {
      xml = xml.documentElement
    }
    return Array.prototype.slice.call(xml.childNodes)
  }

  window.MAMELoader = MAMELoader
  window.Emulator = Emulator
})(typeof Promise === 'undefined' ? ES6Promise.Promise : Promise)

// legacy
var JSMESS = JSMESS || {}
JSMESS.ready = function (f) { f() }
