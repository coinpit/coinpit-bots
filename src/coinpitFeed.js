module.exports = function (listener, coinpitUrl) {
  var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  socket.on('trade', function (trade) {
    listener(trade.price)
  })
  socket.on('orderbook', function(orderbook) {
    console.log('orderbook', orderbook)
  })

  socket.on('difforderbook', function(difforderbook) {
    console.log('difforderbook', difforderbook)
  })
}
