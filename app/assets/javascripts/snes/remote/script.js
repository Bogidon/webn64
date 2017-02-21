window.addEventListener('websocketsConnected', function () {
  var buttons = document.getElementsByClassName('button')
  for (var i = buttons.length - 1; i >= 0; i--) {
    buttons[i].onclick = function (e) {
      var button = e.target.id
      App.clientChannel.send({ game_uuid: gon.game_uuid, button: button})
    }
  }
})
