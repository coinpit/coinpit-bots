var bluebird         = require('bluebird')
var mangler          = require('mangler')
var affirm           = require('affirm.js')
process.env.TEMPLATE = "something" // is a hack
var botParams        = require('./botParams').read(process.argv[2])
var _                = require('lodash')
var util             = require('util')
var coinpit          = require('coinpit-client')

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var account     = yield coinpit.getAccount(botParams.wallet.privateKey, botParams.baseurl)
  var socket      = account.loginless.socket
  var rest        = account.loginless.rest
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
      try {
        if (_.isEmpty(bands)) return
        yield* randomAction()()
      } catch (e) {
        util.log('fuzzbot init', e.stack)
      }
    }), 1000)
  }

//*********** actions ***********************************************************

  function* create() {
    var order = orderToCreate()
    socket.send({ method: "POST", uri: "/order", body: [order], params: { instrument: order.instrument } })
  }

  function* update() {
    var order = orderToUpdate()
    if (order)
      socket.send({ method: "PUT", uri: "/order", body: [order], params: { instrument: order.instrument } })
  }

  function* remove() {
    var order = orderToRemove()
    if (order)
      socket.send({ method: "DELETE", uri: "/order", body: [order.uuid], params: { instrument: order.instrument } })
  }

  function* merge() {
    var result = getMerges()
    if (result)
      yield account.patchOrders(result.symbol, { merge: result.merges })
  }

  function* restMerge() {
    var result = getMerges()
    if (result)
      rest.patch("/contract/" + result.symbol + "/order/open", {}, [{ merge: result.merges }])
  }

  function* split() {
    var target = getTargetToSplit()
    if (target)
      yield account.patchOrders(target.instrument, { split: { uuid: target.uuid, quantity: 1 } })
  }

  function* restSplit() {
    var target = getTargetToSplit()
    if (target)
      rest.patch("/contract/" + target.instrument + "/order/open", {}, [{ split: { uuid: target.uuid, quantity: 1 } }])
  }

  function* restCreate() {
    var order = orderToCreate()
    yield rest.post("/contract/" + order.instrument + "/order/open", {}, [order])
  }

  function* restUpdate() {
    var order = orderToUpdate()
    if (order)
      yield rest.put("/contract/" + order.instrument + "/order/open", {}, [order])
  }

  function* restRemove() {
    var order = orderToRemove()
    if (order)
      yield rest.del("/contract/" + order.instrument + "/order/open/" + order.uuid)
  }

  function orderToRemove() {
    var allOrders = account.getOpenOrders()
    var symbol    = symbolWithMaxOrders(allOrders)
    var orders    = allOrders[symbol]
    return getRandom(_.values(orders))
  }

  function orderToCreate() {
    var openOrders = account.getOpenOrders()
    var symbol     = symbolWithMinOrders(openOrders)
    var orderType  = randomOrderType()
    var side       = randomSide(symbol)
    var price      = orderType === 'MKT' ? undefined : randomPrice(symbol, side)
    return {
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
  }

  function orderToUpdate() {
    var allOrders = allOrdersAsList()
    var filtered  = allOrders.filter(order => order.orderType === 'LMT' || order.orderType === 'STM' || order.orderType === 'SLM')
    var order     = getRandom(filtered)
    if (!order) return
    order.price = randomPrice(order.instrument, order.side)
    return order
  }

  function getTargetToSplit() {
    var allOrders = allOrdersAsList()
    var targets   = allOrders.filter(order => order.orderType === 'TGT' && toBeFilled(order) > 1)
    return getRandom(targets)
  }

  function getMerges() {
    var allOrders = allOrdersAsList()
    var stops     = {}
    Object.keys(allOrders).forEach(symbol => {
      var list = _.values(allOrders[symbol]).filter(order => order.orderType === 'STP' && !order.crossMargin).map(order => order.uuid)
      if (list.length > 2) stops[symbol] = list
    })
    var symbol = getRandom(Object.keys(stops))
    if (!symbol) return
    var merges = []
    stops.forEach(stop => {
      merges.push(stop.uuid)
      merges.push(stop.oco)
    })
    return { symbol: symbol, mreges: merges }
  }

//*********** fuzzy ***********************************************************
  var restMethods   = [restCreate, restCreate, restCreate, restCreate, restCreate, restCreate, restCreate, restRemove, restUpdate, restSplit, restMerge]
  var socketMethods = [create, create, create, create, create, create, create, create, remove, update, split, merge]
  var methods       = restMethods.concat(socketMethods)

  function randomAction() {
    return getRandom(methods)
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
    var ordersPerSymbol = Object.keys(account.instruments)
      .filter(symbol => account.instruments[symbol].expiry > Date.now())
      .map(symbol => {
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

  function allOrdersAsList() {
    var allOrders = account.getOpenOrders()
    var orders    = []
    _.values(allOrders).forEach(ordersMap => _.values(ordersMap).forEach(order => orders.push(order)))
    return orders
  }

  yield* init()
})

bot(botParams)
