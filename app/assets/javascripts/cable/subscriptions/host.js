function simulateKeyEvent (eventType, keyCode) {
  var e = document.createEvent('Events')
  if (e.initEvent) e.initEvent(eventType, true, true)

  e.key = keyCode
  e.keyCode = keyCode
  e.which = keyCode

  Module.canvas.dispatchEvent(e)
}

function quickPress (keyCode) {
  simulateKeyEvent('keydown', keyCode)
  setTimeout(function () {
    simulateKeyEvent('keyup', keyCode)
  }, 100)
}

console.log('in host.js')
App.hostChannel = App.cable.subscriptions.create('HostChannel', {
  connected: function (resp) {
    return setTimeout((function (_this) {
      return function () {
        return _this.subscribeToChannel()
      }
    })(this), 1000)
  },

  received: function (resp) {
    console.log('host front end received!!!')
    console.log(resp)

    var keyCode
    switch (resp.button) {
      case 'dpad_up':
        keyCode = 38
        break
      case 'dpad_right':
        keyCode = 39
        break
      case 'dpad_down':
        keyCode = 40
        break
      case 'dpad_left':
        keyCode = 37
        break
      case 'select':
        keyCode = 53
        break
      case 'start':
        keyCode = 49
        break
      case 'a':
        keyCode = 32
        break
      case 'b':
        keyCode = 18
        break
      case 'x':
        keyCode = 16
        break
      case 'y':
        keyCode = 17
        break
      case 'bumper_left':
        keyCode = 88
        break
      case 'bumper_right':
        keyCode = 90
        break

    }

    quickPress(keyCode)
  },

  subscribeToChannel: function () {
    return this.perform('follow', {
      game_uuid: gon.game_uuid
    })
  }
})
