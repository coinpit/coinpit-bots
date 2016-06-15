var bluebird  = require('bluebird')
module.exports = function(listener){
  var Pusher = require('pusher-client')
  var pusher = new Pusher('de504dc5763aeef9ff52')
  pusher.connection.bind('error', function(err) {
    console.log('PUSHER ERR', err)
  })

  pusher.connection.bind('disconnected', function(err) {
    console.log('PUSHER DISCONNECT', err)
  })

  var channel      = pusher.subscribe('live_trades')
  // var orderCh      = pusher.subscribe('order_book')
  channel.bind('trade', bluebird.coroutine(function*(data) {
      listener(data.price)
  }))
  // orderCh.bind('data', bluebird.coroutine(function*(data) {
    // console.log('Bitstamp bid', data.bids[0][0])
    // console.log('Bitstamp ask', data.asks[0][0])
  // }))

}
