var bluebird  = require('bluebird')
module.exports = function(listener){
  var Pusher = require('pusher-client')
  var pusher, lastTime = Date.now()

  reconnect()

  function reconnect() {
    pusher && pusher.disconnect()
    pusher = new Pusher('de504dc5763aeef9ff52')
    pusher.connection.bind('error', function(err) {
      console.log('PUSHER ERR', err)
    })

    pusher.connection.bind('disconnected', function(err) {
      console.log('PUSHER DISCONNECT', err)
    })

    var channel = pusher.subscribe('live_trades')

    channel.bind('trade', bluebird.coroutine(function*(data) {
      lastTime = Date.now()
        listener(data.price)
    }))
  }

  setInterval(function() {
    if(Date.now() - lastTime > 150000) {
      console.log('Reconnecting to bitstamp')
      reconnect()
    }
  }, 300000)
}
