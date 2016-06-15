var bluebird    = require('bluebird')
var sequencer   = require('sequencer-js')()
var mangler     = require('mangler')
var util = require('util')
var bitcoinDust = 5430 + 5000
module.exports  = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth, stopPrice, targetPrice) {
  console.log("Starting " + side + " bot for", wallet.address)
  var bot         = {}
  var cc          = require("coinpit-client")(baseurl)
  var account     = yield cc.getAccount(wallet.privateKey)
  account.logging = true

  stopPrice = stopPrice || 10
  targetPrice = typeof(targetPrice) === 'number' ? targetPrice : 0.0
  var lastPrice

  bot.marketMoved = bluebird.coroutine(function* marketMoved(price) {
    price = account.fixedPrice(price)
    if (lastPrice === price) return;
    lastPrice  = price
    console.log("price", price)
    var orders = filterAndSort(account.getOpenOrders())
    if (orders.length >= depth) {
      yield* updateLastOrder(orders, price)
    } else {
      yield* createOrUpdateOrdersBasedOnMargin(orders, side, price)
    }
  })

  function filterAndSort(orders) {
    var filtered = orders.filter(function (order) {
      return (order.side === side && order.orderType === "LMT")
    })
    filtered.sort(compare[side])
    return filtered
  }

  function* createOrUpdateOrdersBasedOnMargin(orders, side, price) {
    try {
      var order = newOrder(side, price)
      console.log('Order', order)
      if (account.getPostAvailableMargin([order]) >= 0) {
        yield account.createOrders([order])
      } else {
        yield* sendToMarginIfAvailable()
        yield* updateLastOrder(orders, price)
      }
    } catch (e) {
      util.log(Date.now(), 'Order Creation error', e.message)
      yield* updateLastOrder(orders, price)
    }
  }

  function* sendToMarginIfAvailable() {
    try {
      var confirmed = account.getBalance().multisig.confirmed
      if (confirmed > bitcoinDust) yield account.transferToMargin(confirmed, true)
    } catch (e) {
      util.log(Date.now(), 'Transfer to margin failed', e.message)
    }
  }

  function* updateLastOrder(orders, price) {
    if (orders[0]) yield* updateOrder(orders[orders.length - 1], price)
  }

  function newOrder(side, price) {
    return {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : 1,
      price      : mangler.fixed(price),
      orderType  : 'LMT',
      stopPrice  : stopPrice,
      targetPrice: targetPrice
    }
  }

  function* updateOrder(order, price) {
    order.price = mangler.fixed(price)
    yield account.updateOrders([order])
  }

  var compare = {
    buy : function buyOrderCompare(order1, order2) {
      return order1.price == order2.price ? 0 : ( order1.price > order2.price ? -1 : 1 );
    },
    sell: function sellOrderCompare(order1, order2) {
      return order1.price == order2.price ? 0 : ( order1.price < order2.price ? -1 : 1 );
    }
  }

  setInterval(function stats() {
    var balance    = account.getBalance()
    var openOrders = account.getOpenOrders()
    var ocos       = [], limits = []
    for (var i = 0; i < openOrders.length; i++) {
      var order = openOrders[i];
      if (order.oco) ocos.push(order)
      else limits.push(order)
    }
    util.log(Date.now(), "limits:", limits.length, "ocos:", ocos.length, "total balance:", balance.balance,
                "total availableMargin:", balance.availableMargin, 'multisigBalance:', balance.multisig.balance)
  }, 120000)
  return bot
})
