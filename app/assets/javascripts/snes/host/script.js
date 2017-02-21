function simulateKeyEvent (eventType, keyCode) {
  var e = document.createEvent('Events')
  if (e.initEvent) e.initEvent(eventType, true, true)

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
