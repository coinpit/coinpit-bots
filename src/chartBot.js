var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var assert    = require('affirm.js')
var mangler   = require('mangler')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl     = botParams.baseurl, wallet = botParams.wallet
  var cc          = require("coinpit-client")(baseurl)
  var account     = yield cc.getAccount(wallet.privateKey)
  account.logging = true

  var listener = {}

  listener.trade = function() {}

  var busy = false
  listener.priceband = bluebird.coroutine(function*(band) {
    try {
      if(busy) return
      var price = band.price
      busy = true

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

    }
    catch(e) {
      console.log(e)
    }
    finally {
      busy = false
    }
  })

  function newOrder(side, price, postOnly) {
    return {
      clientid   : account.newUUID(),
      userid     : account.userid,
      side       : side,
      quantity   : 1,
      price      : mangler.fixed(price),
      orderType  : 'LMT',
      stopPrice  : 0.1,
      targetPrice: 0.1,
      postOnly   : postOnly
    }
  }

  require('./coinpitFeed')(listener, baseurl)

})

bot(botParams)
