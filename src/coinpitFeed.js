module.exports = function (listener, coinpitUrl) {
  var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  socket.on('trade', function (trade) {
    listener(trade.price)
  })
}