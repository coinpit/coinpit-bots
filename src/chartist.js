var bluebird    = require('bluebird')
var sequencer   = require('sequencer-js')()
var mangler     = require('mangler')
var util = require('util')
var bitcoinDust = 5430 + 5000

module.exports  = bluebird.coroutine(function* mmBot(baseurl, wallet, stopPrice, targetPrice) {
  console.log("Starting chartist bot for", wallet.address)
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
    account.closeAll()
    var bidAsk = account.getBidAsk()
    var orders
    if(price > bidAsk.ask) {
      orders = [
        newOrder('buy', price, true),
        newOrder('sell', price, false)
      ]
    } else {
      orders = [
        newOrder('sell', price, true),
        newOrder('buy', price, false)
      ]
    }
    yield account.createOrders(orders)
  })

  function* createOrders(orders) {
    try {
      if (!account.getPostAvailableMargin(orders) >= 0) {
        yield* sendToMarginIfAvailable()
      }
      if (account.getPostAvailableMargin(orders) >= 0) {
        console.log('Insufficient margin')
        yield account.createOrders(orders)
      }
    } catch (e) {
      util.log(Date.now(), 'Order Creation error', e.message)
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

  function newOrder(side, price, postOnly) {
    return {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : 1,
      price      : mangler.fixed(price),
      orderType  : 'LMT',
      stopPrice  : stopPrice,
      targetPrice: targetPrice,
      postOnly  : postOnly
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
