var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var assert    = require('affirm.js')
var baseBot   = require('./baseBot')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl = botParams.baseurl, wallet = botParams.wallet, depth = botParams.depth
  var PRICE_ADD = { buy: -0.1, sell: 0.1 }
  var side = process.argv[3] === 'sell' ? 'sell' : 'buy'

  var mmBot = yield baseBot(baseurl, wallet, side, depth)
  require('./bitstampFeed')(listener, baseurl)

  function listener(price){
    sequencer.push(mmBot.marketMoved.bind(mmBot, price + PRICE_ADD[side]))
  }
})

bot(botParams)
