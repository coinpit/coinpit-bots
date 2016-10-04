module.exports = function (listener, socket) {
  // var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })

  socket.on('trade', function (trade) {
    process.nextTick(listener.trade.bind(listener, trade.price))
  })

  socket.on('orderbook', function (orderbook) {
  })

  socket.on('priceband', function (band) {
    process.nextTick(listener.priceband.bind(listener, band))
  })

  socket.on('user_message', function (msg) {
    process.nextTick(listener.userMessage.bind(listener))
  })

  socket.on('order_patch', function (response) {
    process.nextTick(listener.orderPatch.bind(listener, response))
  })

  socket.on('difforderbook', function (difforderbook) {
  })
}
