var affirm = require('affirm.js')

module.exports = function (socket) {
  // var socket = require("socket.io-client")(coinpitUrl, { rejectUnauthorized: true })
  var feed      = {}
  var listeners = []

  feed.setListeners = function (handlers) {
    affirm(Array.isArray(handlers), "handlers must be an Array")
    listeners = handlers
  }

  var counters        = {}
  var eventHandlerMap = {
    trade        : "trade",
    orderbook    : "orderbook",
    priceband    : "priceband",
    account      : "userMessage",
    order_patch  : "orderPatch",
    difforderbook: "difforderbook"
  }

  function addListeners() {
    Object.keys(eventHandlerMap).forEach(topic => {
      function eventListener(response) {
        counters[topic]++
        listeners.forEach(listener => {
          var handler = listener[eventHandlerMap[topic]]
          if (handler)
            process.nextTick(handler.bind(handler, response))
        })
      }

      socket.on(topic, eventListener)
    })
  }

  setInterval(function () {
    console.log('messages recieved on socket', JSON.stringify(counters))
    resetCounters()
  }, 60000)

  function resetCounters() {
    counters = { trade: 0, orderbook: 0, priceband: 0, account: 0, order_patch: 0, difforderbook: 0 }
  }

  function init() {
    resetCounters()
    addListeners()
  }

  init()
  return feed
}
