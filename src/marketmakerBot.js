var bluebird  = require('bluebird')
var sequencer = require('sequencer-js')()
var assert    = require('affirm.js')

var mmbot = bluebird.coroutine(function* mmBot(baseurl, wallet, side, depth) {
  var baseBot = yield require('./baseBot')(baseurl, wallet, side, depth)
  require('./coinpitFeed')(listener, baseurl)
  function listener(price){
    sequencer.push(baseBot.marketMoved.bind(baseBot,price))
  }
})

module.exports = require("./bot")(mmbot)


