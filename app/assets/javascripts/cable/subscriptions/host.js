console.log("in host.js");
App.hostChannel = App.cable.subscriptions.create("HostChannel", {
    connected: function(resp) {
      return setTimeout((function(_this) {
        return function() {
          return _this.subscribeToChannel();
        };
      })(this), 1000);
    },

    received: function(resp) {
      console.log("host front end received!!!");
      console.log(resp);
    },

    subscribeToChannel: function() {
      return this.perform('follow', {
          game_uuid: gon.game_uuid
      })
    }
});
