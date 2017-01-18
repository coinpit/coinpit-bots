var bluebird       = require('bluebird')
var mangler        = require('mangler')
var affirm         = require('affirm.js')
var _              = require('lodash')
var util           = require('util')
var coinpit        = require('coinpit-client')
var marketMakerBot = require('./marketMakerBot')

module.exports = (function* marketMakerGen(params) {
  var gen = {}

  var account           = yield coinpit.getAccount(params.wallet.privateKey, params.baseurl)
  account.logging = true
  var seriesInstruments = []
  var currentBots       = {}

  gen.run = function*() {
    yield* gen.createBots()
    bluebird.coroutine(function*(){
      while(true) {
        yield bluebird.delay(15 * 60 * 1000)
        yield* gen.createBots()
      }
    })()
  }

  gen.createBots = function*() {
    seriesInstruments = sortByExpiry(account.getInstruments(), params.template)
    gen.purgeExpired()
    var availableMarginPercent = 100
    for(var i = 0; i < seriesInstruments.length; i++) {
      var percent = (i == seriesInstruments.length - 1 ? 1 : 0.9)
      var botPercent = Math.floor(availableMarginPercent * percent)
      availableMarginPercent -= botPercent
      yield* gen.createBot(seriesInstruments[i].symbol, params, account, botPercent)
    }
  }

  gen.createBot = function*(symbol, params, account, botPercent) {
    if(currentBots[symbol]) {
      return currentBots[symbol].setMarginPercent(botPercent)
    }
    return currentBots[symbol] = (yield* marketMakerBot.create(symbol, params, account, botPercent))
  }

  gen.purgeExpired = function() {
    Object.keys(currentBots).forEach(bot => { if(currentBots[bot].isExpired()) delete currentBots[bot]})
  }

  gen.nearExpiryBot = function() {
    return currentBots[seriesInstruments[0].symbol]
  }

  gen.farExpiryBot = function() {
    return currentBots[seriesInstruments[1].symbol]
  }

  function sortByExpiry(instruments, template) {
    return _.values(instruments)
            .filter(x => x.template === template)
            .filter(x => Date.now() < x.expiry)
            .sort(function(a, b) { return a.expiry - b.expiry })
  }

  return gen
})
