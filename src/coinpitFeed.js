module.exports = function (listener, coinpitUrl) {
  var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  socket.on('trade', function (trade) {
    process.nextTick(listener.trade.bind(listener, trade.price))
  })
  socket.on('orderbook', function (orderbook) {
  })

  socket.on('priceband', function (band) {
    process.nextTick(listener.priceband.bind(listener, band))
  })

  socket.on('difforderbook', function (difforderbook) {
  })
}
