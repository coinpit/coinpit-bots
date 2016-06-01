var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()

var bot = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {

  var baseBot = yield require('./baseBot')(baseurl, wallet, side, depth)
  require('./bitstampFeed')(listener)
  function listener(price){
    sequencer.push(baseBot.marketMoved.bind(baseBot,price))
  }
})

module.exports = require("./bot")(bot)

