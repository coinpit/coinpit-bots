module.exports = function (listener, socket) {
  // var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var counters = resetCounters()
  socket.on('trade', function (trade) {
    counters.trade++
    if (listener.trade)
      process.nextTick(listener.trade.bind(listener, trade.price))
  })

  socket.on('orderbook', function (orderbook) {
    counters.orderbook++
    if (listener.orderbook)
      process.nextTick(listener.orderbook.bind(listener, band))
  })

  socket.on('priceband', function (band) {
    counters.priceband++
    if (listener.priceband)
      process.nextTick(listener.priceband.bind(listener, band))
  })

  socket.on('account', function (msg) {
    counters.userMessage++
    if (listener.userMessage)
      process.nextTick(listener.userMessage.bind(listener))
  })

  socket.on('order_patch', function (response) {
    counters.order_patch++
    if (listener.orderPatch)
      process.nextTick(listener.orderPatch.bind(listener, response))
  })

  socket.on('difforderbook', function (difforderbook) {
    counters.difforderbook++
    if (listener.difforderbook)
      process.nextTick(listener.difforderbook.bind(listener, response))
  })

  setInterval(function(){
    console.log('messages recieved on socket', JSON.stringify(counters))
    counters = resetCounters()
  }, 60000)

  function resetCounters() {
    return {trade:0, orderbook:0, priceband:0, account:0, order_patch:0, difforderbook:0}
  }
}
