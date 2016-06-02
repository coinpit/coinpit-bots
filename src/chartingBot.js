var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()

var bot = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {

  var baseBot = yield require('./baseBot')(baseurl, wallet, side, depth)
  require('./bitstampFeed')(listener)
  function listener(price){
    var bias = getRandomIntInclusive(-3, +3)/10
    sequencer.push(baseBot.marketMoved.bind(baseBot,price + bias))
  }
})

function getRandomIntInclusive(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = require("./bot")(bot)
