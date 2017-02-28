var bluebird       = require('bluebird')
var mangler        = require('mangler')
var affirm         = require('affirm.js')
var _              = require('lodash')
var util           = require('util')
var coinpit        = require('coinpit-client')
var marketMakerBot = require('./marketMakerBot')
var CoinpitFeed    = require("./coinpitFeed")

module.exports = (function* marketMakerGen(params) {
  var gen               = {}
  gen.delayTime         = 1 * 60 * 1000
  var account           = yield coinpit.getAccount(params.wallet.privateKey, params.baseurl)
  account.logging       = true
  var seriesInstruments = []
  var currentBots       = {}
  var coinpitFeed

  gen.run = function*() {
    util.log('BOT GENERATOR STARTING', currentBots)
    yield* gen.createBots()
    gen.setListeners()
    bluebird.coroutine(function*() {
      while (true) {
        yield bluebird.delay(gen.delayTime)
        yield* gen.createBots()
        gen.setListeners()
      }
    })()
  }

  gen.createBots = function*() {
    var instruments   = account.getInstruments()
    seriesInstruments = sortByExpiry(instruments, params.template)
    util.log("INSTRUMENTS FROM ACCOUNT: ", Object.keys(instruments).map(symbol => symbol + ":" + instruments[symbol].expiry))
    util.log("SERIES INSTRUMENTS: ", seriesInstruments.map(instrument => instrument.symbol + ":" + instrument.expiry))
    util.log("CURRENT BOTS", Object.keys(currentBots))
    gen.purgeExpired()
    var availableMarginPercent = 100
    for (var i = 0; i < seriesInstruments.length; i++) {
      var percent    = (i == seriesInstruments.length - 1 ? 1 : 0.9)
      var botPercent = Math.floor(availableMarginPercent * percent)
      availableMarginPercent -= botPercent
      yield* gen.createBot(seriesInstruments[i].symbol, params, account, botPercent)
    }
    util.log("CURRENT BOTS AFTER CREATION", Object.keys(currentBots))
  }

  gen.createBot = function*(symbol, params, account, botPercent) {
    if (currentBots[symbol]) {
      return currentBots[symbol].setMarginPercent(botPercent)
    }
    return currentBots[symbol] = (yield* marketMakerBot.create(symbol, params, account, botPercent))
  }

  gen.purgeExpired = function () {
    Object.keys(currentBots).forEach(bot => {
      if (currentBots[bot].isExpired()) {
        util.log('REMOVING BOT', bot)
        delete currentBots[bot]
      }
    })
  }

  gen.nearExpiryBot = function () {
    return currentBots[seriesInstruments[0].symbol]
  }

  gen.farExpiryBot = function () {
    return currentBots[seriesInstruments[1].symbol]
  }

  gen.setListeners = function () {
    coinpitFeed = coinpitFeed || CoinpitFeed(account.loginless.socket)
    var handlers = _.values(currentBots).map(bot => bot.listener)
    coinpitFeed.setListeners(handlers)
  }

  function sortByExpiry(instruments, template) {
    return _.values(instruments)
      .filter(x => x.template === template)
      .filter(x => Date.now() < x.expiry)
      .sort(function (a, b) {
        return a.expiry - b.expiry
      })
  }

  return gen
})
