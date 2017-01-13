var expect         = require('expect.js')
var bluebird       = require('bluebird')
var mangler        = require('mangler')
var sinon          = require('sinon')
var coinpitClient  = require('coinpit-client')
var fixtures       = require('fixtures.js')(__filename)
var marketMakerBot = require('../src/marketMakerBot')
require('mocha-generators').install()

describe('marketMakerBot', function() {
  var resultPrice = {}
  resultPrice[fixtures.symbol] = fixtures.price

  var account =
        {
          "patchOrders": function() { return bluebird.resolve(true)},
          "getInstruments": function() { return fixtures.instruments },
          "loginless" : {
            "socket" : { "on" : function() { return true } },
            "rest" : { "get" : function() { return bluebird.resolve(resultPrice) } },
          },
          "getOpenOrders": function() { return {} },
          "calculateAvailableMarginIfCrossShifted": function() { return 900000 },
          "getPositions": function() { return {} }
        }

  it('should stop creating orders on expiration', function*() {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock = sinon.useFakeTimers(timestamp)

    sinon.spy(account, "patchOrders")
    expect(account.patchOrders.called).to.be(false)
    var bot = yield* marketMakerBot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent)
    bot.listener.trade()
    expect(account.patchOrders.called).to.be(true)

    clock.tick(8 * 24 * 60 * 60 * 1000)
    account.patchOrders.reset()
    bot.listener.trade()
    expect(account.patchOrders.called).to.be(false)
    clock.restore()
  })

  // it('should only use allocated margin to create orders', function*() {
  //
  // })

  it('should compute premium based on timeToExpiry', function*() {
    var bot  = yield* marketMakerBot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent)
    for(var i = 0; i < fixtures.premium.length; i++) {
      expect(bot.getPremium(fixtures.premium[i].expiry)).to.be(fixtures.premium[i].premium)
    }
  })

  it('should compute premium price based on time to expiry', function*() {
    var bot  = yield* marketMakerBot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent)
    for(var i = 0; i < fixtures.premiumPrice.length; i++) {
      var test = fixtures.premiumPrice[i]
      expect(bot.getPremiumPrice(test.price, test.premium, test.ticksize)).to.be(test.premiumPrice)
    }
  })
})
