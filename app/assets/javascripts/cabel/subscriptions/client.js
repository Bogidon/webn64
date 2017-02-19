console.log("in client.js");
App.cable.subscriptions.create("ClientChannel", {
  connected: function(resp) {
    console.log("connected woohoo");
    console.log(resp);
  },

  received: function(resp) {
    console.log("received!!!");
    console.log(resp);
  },
});
