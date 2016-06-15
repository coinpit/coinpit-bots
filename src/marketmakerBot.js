var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var assert    = require('affirm.js')
var baseBot   = require('./baseBot')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl = botParams.baseurl, wallet = botParams.wallet, depth = botParams.depth
  var PRICE_ADD = { buy: -0.1, sell: 0.1 }

  var mmBuyBot = yield baseBot(baseurl, wallet, 'buy', depth)
  var mmSellBot = yield baseBot(baseurl, wallet, 'sell', depth)

  require('./coinpitFeed')(listener, baseurl)

  function listener(price){
    sequencer.push(mmBuyBot.marketMoved.bind(mmBuyBot, price + PRICE_ADD.buy))
    sequencer.push(mmSellBot.marketMoved.bind(mmSellBot, price + PRICE_ADD.sell))
  }
})

bot(botParams)
