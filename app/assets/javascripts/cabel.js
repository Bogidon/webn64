//= require action_cable
//= require_self

(function() {
  this.App || (this.App = {});
  console.log("better print this")

  App.cable = ActionCable.createConsumer();
}).call(this);
