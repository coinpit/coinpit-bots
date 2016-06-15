var bluebird  = require('bluebird')
module.exports = function(listener){
  var PusherClient = require('pusher-client')
  var pusherClient = new PusherClient('de504dc5763aeef9ff52')
  var channel      = pusherClient.subscribe('live_trades')
  var orderCh      = pusherClient.subscribe('order_book')
  channel.bind('trade', bluebird.coroutine(function*(data) {
      listener(data.price)
  }))
  orderCh.bind('data', bluebird.coroutine(function*(data) {
    // console.log('Bitstamp bid', data.bids[0][0])
    // console.log('Bitstamp ask', data.asks[0][0])
  }))

}
