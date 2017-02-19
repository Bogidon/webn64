console.log("in client.js");
App.cable.subscriptions.create({
  channel: "ClientChannel",
  received: function(resp) {
    console.log("Client!!");
    console.log(resp);
  }
});
