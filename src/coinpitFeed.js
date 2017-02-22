module.exports = function (listener, socket) {
  // var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })

  socket.on('trade', function (trade) {
    if (listener.trade)
      process.nextTick(listener.trade.bind(listener, trade.price))
  })

  socket.on('orderbook', function (orderbook) {
  })

  socket.on('priceband', function (band) {
    if (listener.priceband)
      process.nextTick(listener.priceband.bind(listener, band))
  })

  socket.on('account', function (msg) {
    if (listener.userMessage)
      process.nextTick(listener.userMessage.bind(listener))
  })

  socket.on('order_patch', function (response) {
    if (listener.orderPatch)
      process.nextTick(listener.orderPatch.bind(listener, response))
  })

  socket.on('difforderbook', function (difforderbook) {
  })
}
