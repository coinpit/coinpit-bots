var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var mangler   = require('mangler')
var assert    = require('affirm.js')

var mmbot = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {
  console.log("Starting " + side + " bot for", wallet.address)
  var PusherClient = require('pusher-client')
  var cc           = require("coinpit-client")(baseurl)
  var account      = yield cc.getAccount(wallet.privateKey)
  account.logging  = true
  var pusherClient = new PusherClient('de504dc5763aeef9ff52')
  var channel      = pusherClient.subscribe('live_trades')
  var stopPrice    = 10, targetPrice = 0.0
  var lastPrice
  var PRICE_ADD    = { buy: -0.1, sell: 0.1 }

  channel.bind('trade', bluebird.coroutine(function*(data) {
    var price = account.fixedPrice(data.price)
    // console.log(price)
    if (price !== lastPrice)
      sequencer.push(marketMoved.bind(undefined, price))
  }))

  var marketMoved = bluebird.coroutine(function* marketMoved(price) {
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

  /*setInterval(bluebird.coroutine(function*(){
   try {
   yield* marketMoved(numberBetween(500, 550))
   } catch (e) {
   console.log(e)
   }
   }), 5000)

   function numberBetween(start, end) {
   return Math.round(Math.random() * (end - start)) + start
   }*/
})

module.exports = (function () {
  var wallet = require("./privateKeyReader")(process.argv[2])
  assert(wallet, 'PrivateKey not found. Check key file.')
  var baseUrl = process.env.BASE_URL
  baseUrl     = baseUrl || (wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
  mmbot(baseUrl, wallet, "buy", 10)
  mmbot(baseUrl, wallet, "sell", 10)
})()


