var bluebird  = require('bluebird')
var mangler   = require('mangler')
var affirm    = require('affirm.js')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl     = botParams.baseurl
  var wallet      = botParams.wallet
  var DEPTH       = botParams.depth
  var SPREAD      = botParams.spread
  var STEP        = botParams.step
  var STRAT       = botParams.strat
  var STP         = botParams.stop
  var TGT         = botParams.target
  var cc          = require("coinpit-client")(baseurl)
  var account     = yield cc.getAccount(wallet.privateKey)
  account.logging = true
  var currentBand
  var listener    = {}
  // strategy names and function calls
  var strategies  = { 'collar': collar, 'random': random }

  /** collar strategy basically puts buys and sells around ref price at fixed spread and spacing **/
  function collar(price) {
    var buys            = {}, sells = {}
    var qty             = 5
    var openOrders      = account.getOpenOrders()
    var stops           = openOrders.filter(order => order.orderType === 'STP')
    var availableMargin = account.calculateAvailableMargin(stops)
    if (availableMargin <= 0) return { buys: buys, sells: sells }
    var instrument         = account.config.instrument
    var satoshiPerQuantity = (STP + instrument.stopcushion) * instrument.ticksperpoint * instrument.tickvalue
    var max                = Math.floor(availableMargin / (satoshiPerQuantity * qty * 2))
    var depth              = Math.min(DEPTH, max * STEP)
    var buySpread          = SPREAD, sellSpread = SPREAD
    var position           = account.getPositions()[instrument.symbol]

    if (position) {
      var adjustedSpread = mangler.fixed(Math.floor(Math.abs(position.quantity) / 100) / 5)
      buySpread          = position.quantity > 0 ? mangler.fixed(buySpread + adjustedSpread) : mangler.fixed(buySpread - adjustedSpread)
      sellSpread         = position.quantity < 0 ? mangler.fixed(sellSpread + adjustedSpread) : mangler.fixed(sellSpread - adjustedSpread)
    }

    for (var i = mangler.fixed(price - buySpread); i > mangler.fixed(price - buySpread - depth); i = mangler.fixed(i - STEP))
      buys[i] = newOrder('buy', i, qty)
    for (var i = mangler.fixed(price + sellSpread); i < mangler.fixed(price + sellSpread + depth); i = mangler.fixed(i + STEP))
      sells[i] = newOrder('sell', i, qty)
    return { buys: buys, sells: sells }
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
    for (var i = 0; i < response.result.length; i++) {
      var eachResponse = response.result[i];
      if (eachResponse.error) {
        return jobs.merge = true
      }
      if (eachResponse.op === 'merge' && !currentBand.price) {
        jobs.movePrice = true
      }
    }
  })

  listener.userMessage = bluebird.coroutine(function*() {
    jobs.merge = true
  })

  listener.trade = bluebird.coroutine(function*(price) {
      jobs.movePrice = true
  })

  listener.priceband = bluebird.coroutine(function*(band) {
    if (!band.price) return
    currentBand   = band
    jobs.movePrice = true
  })

  var jobs      = { movePrice: true, merge: true }
  // var busy      = false
  function* movePrice() {
    if (!jobs.movePrice) return
    var price = currentBand.price
    if (isNaN(price)) return console.log('invalid price', price)
    jobs.movePrice  = false
    try {
      var orders      = account.getOpenOrders()
      var currentBook = getCurrentBook(orders)
      var newBook     = createNewBook(price)

      var cancels = getCancels(currentBook, newBook)
      var creates = getCreates(currentBook, newBook)
      var patch   = generatePatch(cancels, creates)
      updateTargets(patch.updates, currentBook.targets, price)
      yield account.patchOrders(patch)
    } catch (e) {
      console.log(e)
    }
  }

  function* mergePositions() {
    if(!jobs.merge) return
    jobs.merge =false
    try {
      var orders  = account.getOpenOrders()
      var targets = getCurrentBook(orders).targets
      var stops   = getCurrentBook(orders).stops
      if (targets.length > 10) {
        var merges = stops.slice(0, 15).concat(targets.slice(0, 15))
        yield account.patchOrders({ merge: merges.map(order=>order.uuid) })
      }
    } catch (e) {
      console.log(e)
    }
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
      if (order.orderType === 'LMT' && order.side === 'buy')  ordersByType.buys[order.price] = order
      if (order.orderType === 'LMT' && order.side === 'sell') ordersByType.sells[order.price] = order
      if (order.orderType === 'TGT')  ordersByType.targets.push(order)
      if (order.orderType === 'STP')  ordersByType.stops.push(order)
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
      targetPrice: TGT
    }
  }

  function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  var moveAndMerge = bluebird.coroutine(function* (){
    try {
      yield* movePrice()
      yield* mergePositions()
    } catch (e) {
    } finally{
      setTimeout(moveAndMerge, 100)
    }
  })

  function* init() {
    var tick = mangler.fixed(1 / account.config.instrument.ticksperpoint)
    affirm(SPREAD >= tick, 'SPREAD ' + SPREAD + ' is less than tick ' + tick)
    affirm(STEP >= tick, 'STEP ' + STEP + ' is less than tick ' + tick)
    console.log('botParams', JSON.stringify({ 'baseurl': baseurl, 'DEPTH': DEPTH, 'SPREAD': SPREAD, 'STEP': STEP, 'STP': STP, 'TGT': TGT, 'STRAT': STRAT }, null, 2))
    require('./coinpitFeed')(listener, account.socket)
    var info = yield account.loginless.rest.get('/api/info')
    console.log('current price', info)
    currentBand = {price:info[account.config.instrument.symbol].lastPrice}
    yield moveAndMerge()
  }

  yield* init()
})

bot(botParams)
