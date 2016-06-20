var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var baseBot   = require('./chartist')
var botParams = require('./botParams')(process.argv[2])

var bot = bluebird.coroutine(function* mmBot(botParams) {
  var baseurl      = botParams.baseurl, wallet = botParams.wallet, depth = botParams.depth
  var stopPoints   = botParams.stopPoints, targetPoints = botParams.targetPoints
  var buyChartBot  = yield baseBot(baseurl, wallet, stopPoints, targetPoints)
  var sellChartBot = yield baseBot(baseurl, wallet, stopPoints, targetPoints)

  require('./bitstampFeed')(listener)

  function listener(price){
    sequencer.push(buyChartBot.marketMoved.bind(buyChartBot, price))
    sequencer.push(sellChartBot.marketMoved.bind(sellChartBot, price))
  }
})

bot(botParams)
