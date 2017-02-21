App.clientChannel = App.cable.subscriptions.create('ClientChannel', {
  connected: function (resp) {
    console.log('connected woohoo')
    console.log(resp)
    return setTimeout((function (_this) {
      return function () {
        var event = new Event('websocketsConnected')
        window.dispatchEvent(event)
        return _this.subscribeToChannel()
      }
    })(this), 1000)
  },

  received: function (resp) {
    console.log('client received!!!')
    console.log(resp)
  },

  subscribeToChannel: function () {
    console.log('making sure uuid is: ')
    console.log(gon.game_uuid)
    return this.perform('follow', {
      game_uuid: gon.game_uuid
    })
  }
})
