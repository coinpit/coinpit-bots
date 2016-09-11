var bluebird  = require('bluebird')
var mangler   = require('mangler')
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

  console.log('botParams', JSON.stringify({ 'baseurl': baseurl, 'DEPTH': DEPTH, 'SPREAD': SPREAD, 'STEP': STEP, 'STP': STP, 'TGT': TGT, 'STRAT': STRAT }, null, 2))
  // strategy names and function calls
  var strategies = { 'collar': collar, 'random': random }

  /** collar strategy basically puts buys and sells around ref price at fixed spread and spacing **/
  function collar(price) {
    var buys = {}, sells = {}
    var qty  = 10
    for (var i = mangler.fixed(price - SPREAD); i > mangler.fixed(price - SPREAD - DEPTH); i = mangler.fixed(i - STEP))
      buys[i] = newOrder('buy', i, qty)
    for (var i = mangler.fixed(price + SPREAD); i < mangler.fixed(price + SPREAD + DEPTH); i = mangler.fixed(i + STEP))
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

  listener.trade = bluebird.coroutine(function*(price) {
    if (currentBand)
      yield movePrice(currentBand.price)
  })

  listener.priceband = bluebird.coroutine(function*(band) {
    if (!band.price) return
    currentBand = band
    yield movePrice(band.price)
  })

  var busy      = false
  var movePrice = bluebird.coroutine(function*(price) {
    try {
      if (busy) return
      busy            = true
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
    finally {
      busy = false
    }
  })

  function updateTargets(updates, targets, price) {
    var bid = mangler.fixed(price - SPREAD), ask = mangler.fixed(price + SPREAD)
    targets.forEach(order => {
      order.price = order.side === 'buy' ? bid : ask
      updates.push(order)
    })
  }

  function getCurrentBook(orders) {
    var ordersByType = { buys: {}, sells: {}, targets: [] }
    orders.forEach(order => {
      if (order.orderType === 'LMT' && order.side === 'buy')  ordersByType.buys[order.price] = order
      if (order.orderType === 'LMT' && order.side === 'sell') ordersByType.sells[order.price] = order
      if (order.orderType === 'TGT')  ordersByType.targets.push(order)
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

  require('./coinpitFeed')(listener, baseurl)

})

bot(botParams)
