module.exports = function (listener, coinpitUrl) {
  var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  socket.on('trade', function (trade) {
    listener.trade(trade.price)
  })
  socket.on('orderbook', function(orderbook) {
  })

  socket.on('priceband', function(band) {
    listener.priceband(band)
  })

  socket.on('difforderbook', function(difforderbook) {
  })
}
