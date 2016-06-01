var bluebird  = require('bluebird')
module.exports = function(listener){
  var PusherClient = require('pusher-client')
  var pusherClient = new PusherClient('de504dc5763aeef9ff52')
  var channel      = pusherClient.subscribe('live_trades')
  channel.bind('trade', bluebird.coroutine(function*(data) {
      listener(data.price)
  }))
}