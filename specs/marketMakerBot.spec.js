var expect         = require('expect.js')
var bluebird       = require('bluebird')
var mangler        = require('mangler')
var sinon          = require('sinon')
var coinpitClient  = require('coinpit-client')
var fixtures       = require('./fixtures/marketMakerBot.spec.json')
var Bot = require('../src/bot')
require('mocha-generators').install()

describe('marketMakerBot', function () {
  var resultPrice              = {}
  resultPrice[fixtures.symbol] = fixtures.price

  var account =
        {
          "patchOrders"                           : function () {
            return bluebird.resolve(true)
          },
          "getInstruments"                        : function () {
            return fixtures.instruments
          },
          "loginless"                             : {
            "socket": {
              "on": function () {
                return true
              }
            },
            "rest"  : {
              "get": function () {
                return bluebird.resolve(resultPrice)
              }
            },
          },
          "getOpenOrders"                         : function () {
            return {}
          },
          "calculateAvailableMarginIfCrossShifted": function () {
            return 900000
          },
          "getPositions"                          : function () {
            return {}
          }
        }

  it('should stop creating orders on expiration', function*() {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock     = sinon.useFakeTimers(timestamp)

    sinon.spy(account, "patchOrders")
    expect(account.patchOrders.called).to.be(false)
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    bot.listener.trade()
    expect(account.patchOrders.called).to.be(true)

    clock.tick(8 * 24 * 60 * 60 * 1000)
    account.patchOrders.reset()
    bot.listener.trade()
    expect(account.patchOrders.called).to.be(false)
    clock.restore()
    account.patchOrders.restore()
  })

  // it('should only use allocated margin to create orders', function*() {
  //
  // })

  it('should compute premium based on timeToExpiry', function*() {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    for (var i = 0; i < fixtures.premium.length; i++) {
      expect(bot.getPremium(fixtures.premium[i].expiry)).to.be(fixtures.premium[i].premium)
    }
  })

  it('should compute premium price based on time to expiry', function*() {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    for (var i = 0; i < fixtures.premiumPrice.length; i++) {
      var test = fixtures.premiumPrice[i]
      expect(bot.getPremiumPrice(test.price, test.premium, test.ticksize)).to.be(test.premiumPrice)
    }
  })

  it('should remove all orders except one if multiple orders are at same price', function*() {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    sinon.stub(account, 'getOpenOrders').returns(fixtures.duplicateRemoval.orders)
    sinon.spy(account, 'patchOrders')
    yield* bot.removeDuplicateOrders()
    var patch = account.patchOrders.getCall(0).args[1]
    expect(patch).to.be.eql(fixtures.duplicateRemoval.result)
    account.patchOrders.restore()
    account.getOpenOrders.restore()
  })
  it.skip("should calculate target price using premium", function*(){
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock     = sinon.useFakeTimers(timestamp)
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    var targetPoints = bot.getTargetPoints(fixtures.targetPoints.price)
    clock.restore()
    expect(targetPoints).to.eql(fixtures.targetPoints.result)
  })
})
