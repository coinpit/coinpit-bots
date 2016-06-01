var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var mangler   = require('mangler')

module.exports = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {
  console.log("Starting " + side + " bot for", wallet.address)
  var bot = {}
  var cc           = require("coinpit-client")(baseurl)
  var account      = yield cc.getAccount(wallet.privateKey)
  account.logging  = true

  var stopPrice    = 10, targetPrice = 0.0
  var lastPrice
  var PRICE_ADD    = { buy: -0.1, sell: 0.1 }

  
  bot.marketMoved = bluebird.coroutine(function* marketMoved(price) {
    price = account.fixedPrice(price)
    if(lastPrice === price) return
    lastPrice  = price
    // console.log("price", price)
    var orders = filterAndSort(account.getOpenOrders())
    if(orders.length >= depth){
      yield* updateOrder(orders[orders.length - 1], price)
    } else {
      try {
        yield* createOrder(side, price)
      } catch (e) {
        console.log('Order Creation error', e.message)
        if(orders[0]) yield* updateOrder(orders[orders.length - 1], price)
      }
    }
  })

  function filterAndSort(orders) {
    var filtered = orders.filter(function (order) {
      return (order.side === side && order.orderType === "LMT")
    })
    filtered.sort(compare[side])
    return filtered
  }

  function* createOrder(side, price) {
    yield account.createOrders(
      [{
        clientid   : account.newUUID(),
        userid     : account.userid,
        side       : side,
        quantity   : 1,
        price      : mangler.fixed(price + PRICE_ADD[side]),
        orderType  : 'LMT',
        stopPrice  : stopPrice,
        targetPrice: targetPrice
      }]
    )
  }

  function* updateOrder(order, price) {
    order.price = mangler.fixed(price + PRICE_ADD[side])
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

  return bot
})


