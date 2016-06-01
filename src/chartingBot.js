var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var assert    = require('affirm.js')

var bot = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {

  var baseBot = yield require('./baseBot')(baseurl, wallet, side, depth)
  require('./bitstampFeed')(listener)
  function listener(price){
    sequencer.push(baseBot.marketMoved.bind(baseBot,price))
  }
})

module.exports = (function () {
  var wallet = require("./privateKeyReader")(process.argv[2])
  assert(wallet, 'PrivateKey not found. Check key file.')
  var baseUrl = process.env.BASE_URL
  baseUrl     = baseUrl || (wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
  bot(baseUrl, wallet, "buy", 10)
  bot(baseUrl, wallet, "sell", 10)
})()


