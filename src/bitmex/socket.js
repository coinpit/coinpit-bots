var BitMEXClient = require('bitmex-realtime-api')
var affirm       = require('affirm.js')

module.exports = function (handlers) {
  var socket                    = {}
  var client, orderBook, orders = [], positions
  socket.init                   = function (params) {
    affirm(params && params.instrument && params.apiKey && params.apiSecret, 'Invalid params')
    socket.params = params
    client = new BitMEXClient({ testnet: params.testnet, apiKeyID: params.apiKey, apiKeySecret: params.apiSecret })
    subscribe(params.instrument)
  }

  socket.on_instrument = function (data, symbol, tableName) {
    console.log(tableName, symbol, JSON.stringify(data))
  }

  socket.on_orderBook10 = function (data, symbol, tableName) {
    if (!data || !data[0]) return
    orderBook = data[0]
    if (handlers && handlers.orderBook) handlers.orderBook()
  }

  socket.on_order = function (data, symbol, tableName) {
    if (!data) return
    orders = data
    console.log(tableName, symbol, JSON.stringify(data))
  }

  socket.on_execution = function (data, symbol, tableName) {
    console.log(tableName, symbol, JSON.stringify(data))
  }

  socket.on_position = function (data, symbol, tableName) {
    if (!data || !data[0]) return
    positions = data[0]
    console.log(tableName, symbol, JSON.stringify(data))
  }

  socket.on_error = function (e) {
    console.error(e)
  }

  socket.getOrderBook = function () {
    return orderBook
  }

  socket.getPositions = function () {
    return positions ? positions.currentQty : 0;
  }

  socket.getOrders = function () {
    return orders || []
  }

  function subscribe(instrument) {
    var subscriptions = {
      // instrument : socket.on_instrument,
      orderBook10: socket.on_orderBook10,
      order      : socket.on_order,
      // execution  : socket.on_execution,
      position   : socket.on_position,

    }
    Object.keys(subscriptions).forEach(topic => {
      client.addStream(instrument, topic, subscriptions[topic])
    })

    client.on("error", socket.on_error)
    client.on("open", () => console.log("open"))
    client.on("close", () => console.log("close"))
    client.on("initialize", () => console.log("initialize"))
  }

  return socket
}