var bluebird  = require('bluebird')
var mangler   = require('mangler')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl     = botParams.baseurl
  var wallet      = botParams.wallet
  var DEPTH       = botParams.depth
  var SPREAD      = botParams.spread
  var STEP        = botParams.step
  var cc          = require("coinpit-client")(baseurl)
  var account     = yield cc.getAccount(wallet.privateKey)
  account.logging = true

  var listener = {}

  function createNewBook(price) {
    var buys = {}, sells = {}
    for (var i = mangler.fixed(price - SPREAD); i > mangler.fixed(price - SPREAD - DEPTH); i = mangler.fixed(i - STEP))
      buys[i] = newOrder('buy', i)
    for (var i = mangler.fixed(price + SPREAD); i < mangler.fixed(price + SPREAD + DEPTH); i = mangler.fixed(i + STEP))
      sells[i] = newOrder('sell', i)
    return { buys: buys, sells: sells }
  }

  function getCancels(currentBook, newBook) {
    var d1 = subtract(currentBook.buys, newBook.buys)
    var d2 = subtract(currentBook.sells, newBook.sells)
    return concat(d1, d2)
  }

  function getCreates(currentBook, newBook) {
    var d1 = subtract(newBook.buys, currentBook.buys)
    var d2 = subtract(newBook.sells, currentBook.sells)
    return concat(d1, d2)
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

  listener.trade = bluebird.coroutine(function* (price) {
    yield movePrice(price)
  })

  listener.priceband = bluebird.coroutine(function*(band) {
    yield movePrice(band.price)
  })

  var busy           = false
  var movePrice = bluebird.coroutine(function*(price) {
    try {
      if (busy) return
      busy            = true
      var orders      = account.getOpenOrders()
      var currentBook = getCurrentBook(orders)
      var newBook     = createNewBook(price)

      var cancels = getCancels(currentBook, newBook)
      var creates = getCreates(currentBook, newBook)

      if (cancels.length) yield account.cancelOrders(cancels)
      if (creates.length) yield account.createOrders(creates)

    }
    catch (e) {
      console.log(e)
    }
    finally {
      busy = false
    }
  })

  function getCurrentBook(orders) {
    var ordersByType = { buys: {}, sells: {} }
    orders.forEach(order => {
      if (order.orderType === 'LMT' && order.side === 'buy')  ordersByType.buys[order.price] = order
      if (order.orderType === 'LMT' && order.side === 'sell') ordersByType.sells[order.price] = order
    })
    return ordersByType
  }

  function newOrder(side, price) {
    return {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : 1,
      price      : mangler.fixed(price),
      orderType  : 'LMT',
      stopPrice  : botParams.stop,
      targetPrice: botParams.target
    }
  }

  require('./coinpitFeed')(listener, baseurl)

})

bot(botParams)
