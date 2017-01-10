var bluebird  = require('bluebird')
var mangler   = require('mangler')
var affirm    = require('affirm.js')
var _         = require('lodash')
var util      = require('util')

module.exports = (function (){
  var creator = {}
  creator.create = function*(symbol, botParams, account, marginPercent){
    return (yield* mmBot(symbol, botParams, account, marginPercent))
  }
  return creator
})()

function* mmBot(symbol, botParams, account, marginPercent) {
  affirm(symbol, "Symbol required to create marketMakerBot")

  var bot = {}

  var baseurl = botParams.baseurl
  var wallet  = botParams.wallet
  var DEPTH   = botParams.depth
  var SPREAD  = botParams.spread
  var STEP    = botParams.step
  var STRAT   = botParams.strat
  var STP     = botParams.stop
  var TGT     = botParams.target
  var CROSS   = botParams.cross
  var QTY     = botParams.quantity
  var SYMBOL  = bot.symbol = symbol
  account.logging = true
  var currentBand
  var listener    = bot.listener = {}
  // strategy names and function calls
  var strategies  = { 'collar': collar, 'random': random }

  bot.marginPercent = marginPercent
  bot.getMarginPercent = function() { return bot.marginPercent }
  bot.setMarginPercent = function(marginPercent) { bot.marginPercent = marginPercent}
  bot.isExpired = function() { return !isActive() }
  /** collar strategy basically puts buys and sells around ref price at fixed spread and spacing **/
  function collar(price) {
    var buys       = {}, sells = {}
    var openOrders = account.getOpenOrders()
    Object.keys(openOrders).forEach(symbol => Object.keys(openOrders[symbol]).forEach(uuid => {
      if (openOrders[symbol][uuid].orderType !== 'STP') delete openOrders[symbol][uuid]
    }))
    var availableMargin = Math.floor(account.calculateAvailableMarginIfCrossShifted(openOrders) * bot.marginPercent / 100)
    console.log('availableMargin', availableMargin)
    if (availableMargin <= 0) return { buys: buys, sells: sells }
    var inst               = instrument(SYMBOL)
    var satoshiPerQuantity = getSatoshiPerQuantity[inst.type]()
    var max                = Math.floor(availableMargin / (satoshiPerQuantity * QTY * 2))
    var depth              = Math.min(DEPTH, max * STEP)
    var buySpread          = SPREAD, sellSpread = SPREAD
    var position           = account.getPositions()[inst.symbol]

    if (position) {
      var adjustedSpread = mangler.fixed(Math.floor(Math.abs(position.quantity) / 100) / 5)
      buySpread          = position.quantity > 0 ? mangler.fixed(buySpread + adjustedSpread) : buySpread
      sellSpread         = position.quantity < 0 ? mangler.fixed(sellSpread + adjustedSpread) : sellSpread
    }

    console.log(DEPTH, STEP, max, 'price-spread', mangler.fixed(price - buySpread), 'price - buySpread - depth', mangler.fixed(price - buySpread - depth))
    for (var i = mangler.fixed(price - buySpread); i > mangler.fixed(price - buySpread - depth); i = mangler.fixed(i - STEP))
      buys[i] = newOrder('buy', i, QTY)
    for (var i = mangler.fixed(price + sellSpread); i < mangler.fixed(price + sellSpread + depth); i = mangler.fixed(i + STEP))
      sells[i] = newOrder('sell', i, QTY)
    return { buys: buys, sells: sells }
  }

  var getSatoshiPerQuantity = {
    inverse: function () {
      var inst  = instrument(SYMBOL)
      affirm(currentBand && currentBand.price, 'Band price unavailable')
      affirm(inst && inst.stopcushion, 'Instrument cushion unavailable')
      affirm(inst && inst.contractusdvalue, 'Instrument contractusdvalue unavailable')
      console.log('STP', STP)
      var entry = currentBand.price
      var exit  = entry - (STP + inst.stopcushion)
      return Math.ceil(inst.contractusdvalue * 1e8 * (1 / exit - 1 / entry))
    },
    quanto : function () {
      var inst = instrument(SYMBOL)
      return (STP + inst.stopcushion) * inst.ticksperpoint * inst.tickvalue
    }
  }

  /** random strategy assumes best results on random order spacing **/
  function random(price) {
    var buys = {}, sells = {}
    var bid  = mangler.fixed(price - SPREAD), ask = mangler.fixed(price + SPREAD)
    for (var i = 0; i < DEPTH;) {
      var buyOrder           = newRandomOrder('buy', price, Math.floor(i / 10))
      buys[buyOrder.price]   = buyOrder
      var sellOrder          = newRandomOrder('sell', price, Math.floor(i / 10))
      sells[sellOrder.price] = sellOrder
      i += buyOrder.quantity + sellOrder.quantity
    }
    return { buys: buys, sells: sells }
  }

  function createNewBook(price) {
    var strategy = strategies[STRAT] || strategies['collar']
    return strategy(price)
  }

  function getCancels(currentBook, newBook) {
    var d1 = subtract(currentBook.buys, newBook.buys)
    var d2 = subtract(currentBook.sells, newBook.sells)
    return { buys: d1, sells: d2 }
  }

  function getCreates(currentBook, newBook) {
    var d1 = subtract(newBook.buys, currentBook.buys)
    var d2 = subtract(newBook.sells, currentBook.sells)
    return { buys: d1, sells: d2 }
  }

  function subtract(map1, map2) {
    var difference = {}
    Object.keys(map1).forEach(key => {
      if (!map2[key]) difference[key] = map1[key]
    })
    return difference
  }

  function concat(map1, map2) {
    var cat = []
    Object.keys(map1).forEach(key => cat.push(map1[key]))
    Object.keys(map2).forEach(key => cat.push(map2[key]))
    return cat
  }

  function generatePatch(cancels, creates) {
    var buys  = replaceCancelToUpdate(cancels.buys, creates.buys)
    var sells = replaceCancelToUpdate(cancels.sells, creates.sells)
    return { cancels: buys.cancels.concat(sells.cancels), updates: buys.updates.concat(sells.updates), creates: buys.creates.concat(sells.creates) }
  }

  function replaceCancelToUpdate(cancels, creates) {
    cancels     = Object.keys(cancels).map(price => cancels[price])
    creates     = Object.keys(creates).map(price => creates[price])
    var updates = []
    var cancel  = cancels.shift()
    while (cancel) {
      if (creates.length === 0) {
        cancels.push(cancel)
        break
      }
      var create   = creates.shift()
      cancel.price = create.price
      updates.push(cancel)
      cancel = cancels.shift()
    }
    return { cancels: cancels, updates: updates, creates: creates }
  }

  listener.orderPatch = bluebird.coroutine(function*(response) {
    try {
      for (var i = 0; i < response.result.length; i++) {
        var eachResponse = response.result[i];
        if (eachResponse.error) {
          return jobs.merge = true
        }
        if (eachResponse.op === 'merge' && !currentBand.price) {
          jobs.movePrice = true
        }
      }
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  })

  listener.userMessage = bluebird.coroutine(function*() {
    jobs.merge = true
  })

  listener.trade = bluebird.coroutine(function*() {
    jobs.movePrice = true
  })

  listener.priceband = bluebird.coroutine(function*(band) {
    try {
      if (!band) return console.log('bad band ', band)
      currentBand    = band[SYMBOL]
      jobs.movePrice = true
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  })

  var jobs = { movePrice: true, merge: true }
  // var busy      = false
  function* movePrice() {
    if (!jobs.movePrice) return
    var price = currentBand.price
    if (isNaN(price)) {
      jobs.movePrice = false
      return console.log('invalid price', price)
    }
    jobs.movePrice = false
    try {
      var orders      = _.toArray(account.getOpenOrders()[SYMBOL] || {})
      var currentBook = getCurrentBook(orders)
      var newBook     = createNewBook(price)

      var cancels = getCancels(currentBook, newBook)
      var creates = getCreates(currentBook, newBook)
      var patch   = generatePatch(cancels, creates)
      updateTargets(patch.updates, currentBook.targets, price)
      yield account.patchOrders(SYMBOL, patch)
    } catch (e) {
      util.log(e);
      util.log(e.stack)
    }
  }

  function* mergePositions() {
    if (!jobs.merge) return
    jobs.merge = false
    try {
      var orders  = _.toArray(account.getOpenOrders()[SYMBOL])
      var targets = getCurrentBook(orders).targets
      if (targets.length > 50) {
        targets    = targets.sort(quantityLowToHigh)
        targets    = targets.slice(0, 15)
        var merges = []
        targets.forEach(target => {
          merges.push(target.uuid)
          merges.push(target.oco)
        })
        yield account.patchOrders(SYMBOL,{ merge: merges })
      }
    } catch (e) {
      util.log(e)
      util.log(e.stack)
    }
  }

  function quantityLowToHigh(o1, o2) {
    return toBeFilled(o1) - toBeFilled(o2)
  }

  function toBeFilled(order) {
    return order.quantity - (order.filled || 0) - (order.cancelled || 0)
  }

  function updateTargets(updates, targets, price) {
    var step = Math.min(SPREAD, STEP)
    var bid  = mangler.fixed(price - SPREAD + step), ask = mangler.fixed(price + SPREAD - step)
    targets.forEach(order => {
      order.price = order.side === 'buy' ? bid : ask
      updates.push(order)
    })
  }

  function getCurrentBook(orders) {
    var ordersByType = { buys: {}, sells: {}, targets: [], stops: [] }
    orders.forEach(order => {
      if (order.orderType === 'LMT' && order.side === 'buy') ordersByType.buys[order.price] = order
      if (order.orderType === 'LMT' && order.side === 'sell') ordersByType.sells[order.price] = order
      if (order.orderType === 'TGT') ordersByType.targets.push(order)
      if (order.orderType === 'STP') ordersByType.stops.push(order)
    })
    return ordersByType
  }

  function newRandomOrder(side, price, distance) {
    var size       = getRandomInt(2, 12)
    var buyStep    = mangler.fixed(getRandomInt(1, 4) / 10)
    var delta      = mangler.fixed((side == 'buy' ? -1 : 1) * (SPREAD + distance))
    var orderPrice = mangler.fixed(price + delta)
    return newOrder(side, orderPrice, size)
  }

  function newOrder(side, price, quantity) {
    return {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : quantity || 1,
      price      : mangler.fixed(price),
      orderType  : 'LMT',
      stopPrice  : STP,
      targetPrice: TGT,
      crossMargin: CROSS,
      instrument : SYMBOL
    }
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  function isActive() {
    var currentInstrument = instrument(SYMBOL)
    return (currentInstrument && Date.now() <= currentInstrument.expiry)

  }

  var moveAndMerge = bluebird.coroutine(function*() {
    try {
      if(isActive()) yield* movePrice()
      if(isActive()) yield* mergePositions()
    } catch (e) {
      util.log(e.stack)
    } finally {
      if(isActive()) setTimeout(moveAndMerge, 100)
      else console.log('Shutting down bot for', SYMBOL)
    }
  })

  function* init() {
    var tick = mangler.fixed(1 / instrument(SYMBOL).ticksperpoint)
    affirm(SPREAD >= tick, 'SPREAD ' + SPREAD + ' is less than tick ' + tick)
    affirm(STEP >= tick, 'STEP ' + STEP + ' is less than tick ' + tick)
    console.log('botParams', JSON.stringify({ 'baseurl': baseurl, 'SYMBOL': SYMBOL, 'MARGINPERCENT': marginPercent, 'DEPTH': DEPTH, 'SPREAD': SPREAD, 'STEP': STEP, 'STP': STP, 'TGT': TGT, 'STRAT': STRAT, 'QTY': QTY }, null, 2))
    require('./coinpitFeed')(listener, account.loginless.socket)
    var info  = yield account.loginless.rest.get('/api/v1/info')
    // console.log('current price', info)
    var price = info[SYMBOL].indexPrice

    currentBand = { price: price }
    yield moveAndMerge()
  }

  function instrument(symbol) {
    return account.getInstruments()[symbol]
  }

  yield* init()
  return bot
}
