var bluebird         = require('bluebird')
var mangler          = require('mangler')
var affirm           = require('affirm.js')
process.env.TEMPLATE = "something" // is a hack
var botParams        = require('./botParams').read(process.argv[2])
var _                = require('lodash')
var util             = require('util')
var coinpit     = require('coinpit-client')

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var account     = yield coinpit.getAccount(botParams.wallet.privateKey, botParams.baseurl)
  account.logging = true
  var bands       = {}
  var listener    = {}

  listener.priceband = function (priceBand) {
    bands = priceBand
  }

  function* init() {
    var feed = require('./coinpitFeed')(account.loginless.socket)
    feed.setListeners([listener])
    bands = account.getIndexBands()
    setInterval(bluebird.coroutine(function*() {
      if (_.isEmpty(bands)) return
      yield* randomAction()()
    }), 100)
  }

//*********** actions ***********************************************************

  function* create() {
    var openOrders                     = account.getOpenOrders()
    var symbol                         = symbolWithMinOrders(openOrders)
    var orderType                      = randomOrderType()
    var side                           = randomSide(symbol)
    var price                          = orderType === 'MKT' ? undefined : randomPrice(symbol, side)
    var order                          = {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : randomQuantity(),
      price      : price,
      orderType  : orderType,
      stopPrice  : randomStopPoints(),
      targetPrice: randomTargetPoints(),
      crossMargin: randomIsCrossMargin(),
      instrument : symbol
    }
    openOrders[symbol][order.clientid] = order
    var availableMargin                = account.calculateAvailableMarginIfCrossShifted(openOrders)
    if (availableMargin >= 0) {
      yield account.patchOrders(symbol, { creates: [order] })
    } else {
      yield* remove()
    }
  }

  function* update() {

  }

  function* remove() {
    var allOrders = account.getOpenOrders()
    var symbol    = symbolWithMaxOrders(allOrders)
    var orders    = allOrders[symbol]
    var order     = getRandom(_.values(orders))
    if (order)
      yield account.patchOrders(symbol, { cancels: [order] })
  }

  function* merge() {

  }

  function* split() {

  }

  function* restCreate() {

  }

  function* restUpdate() {

  }

  function* restRemove() {

  }

//*********** fuzzy ***********************************************************

  function randomAction() {
    return getRandom([create, restCreate, remove, restRemove])
  }

  function randomPrice(symbol, side) {
    var delta = side === 'buy' ? numberBetween(-200, 20) / 100 : numberBetween(-20, 200) / 100
    return (bands[symbol].price + delta).toFixed(instrument(symbol).ticksize) - 0
  }

  function randomTargetPoints() {
    return numberBetween(0, 10)
  }

  function randomStopPoints() {
    return numberBetween(2, 10)
  }

  function randomQuantity() {
    return numberBetween(1, 5)
  }

  function randomIsCrossMargin() {
    return numberBetween(1, 100) % 10 === 0
  }

  var orderTypes = { 1: "MKT", 2: "STM", 3: "SLM" }

  function randomOrderType() {
    return orderTypes[numberBetween(1, 20)] || "LMT"
  }

  function randomSide(symbol) {
    var orders = account.getOpenOrders()[symbol]
    if (_.isEmpty(orders)) return numberBetween(1, 20) % 2 === 0 ? 'buy' : 'sell'
    var sideCount = { buy: 0, sell: 0 }
    _.values(orders).forEach(order => sideCount[order.side] += toBeFilled(order))
    return sideCount.buy - sideCount.sell > 0 ? 'sell' : 'buy'
  }

  function symbolWithMinOrders(orders) {
    return sortedOrdersPerSymbol(orders)[0].symbol
  }

  function symbolWithMaxOrders(orders) {
    var ordersPerSymbol = sortedOrdersPerSymbol(orders)
    return ordersPerSymbol[ordersPerSymbol.length - 1].symbol
  }

  function sortedOrdersPerSymbol(orders) {
    orders              = orders || account.getOpenOrders()
    var ordersPerSymbol = Object.keys(account.instruments).map(symbol => {
      var count = { symbol: symbol, size: 0 }
      Object.keys(orders[symbol]).forEach(uuid => count.size += toBeFilled(orders[symbol][uuid]))
      return count
    })
    ordersPerSymbol.sort(function (a, b) {
      return a.size > b.size
    })
    return ordersPerSymbol
  }

  function numberBetween(start, end) {
    return Math.round(Math.random() * (end - start)) + start
  }

  function toBeFilled(order) {
    return order.quantity - (order.filled || 0) - (order.cancelled || 0)
  }

  function getRandom(list) {
    var count = list.length
    if (count === 0) return undefined
    var index = Math.round(Math.random() * 1000) % count
    return list[index]
  }

  function instrument(symbol) {
    return account.instruments[symbol]
  }

  yield* init()
})

bot(botParams)
