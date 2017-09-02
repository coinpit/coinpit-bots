var expect        = require('expect.js')
var bluebird      = require('bluebird')
var mangler       = require('mangler')
var sinon         = require('sinon')
var coinpitClient = require('coinpit-client')
var fixtures      = require('./fixtures/marketMakerBot.spec.json')
var uuid          = require('uuid')
var Bot           = require('../src/bot')
var _             = require('lodash')
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
          },
          "newUUID"                               : function () {
            return uuid.v4()
          }
        }

  it('should stop creating orders on expiration', function* () {
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

  it('should compute premium based on timeToExpiry', function* () {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    for (var i = 0; i < fixtures.premium.length; i++) {
      expect(bot.getPremium(fixtures.premium[i].expiry)).to.be(fixtures.premium[i].premium)
    }
  })

  it('should compute premium price based on time to expiry', function* () {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    for (var i = 0; i < fixtures.premiumPrice.length; i++) {
      var test = fixtures.premiumPrice[i]
      expect(bot.getPremiumPrice(test.price, test.premium, test.ticksize)).to.be(test.premiumPrice)
    }
  })

  it('should remove all orders except one if multiple orders are at same price', function* () {
    var bot = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    sinon.stub(account, 'getOpenOrders').returns(fixtures.duplicateRemoval.orders)
    sinon.spy(account, 'patchOrders')
    yield* bot.removeDuplicateOrders()
    var patch = account.patchOrders.getCall(0).args[0]
    expect(patch).to.be.eql(fixtures.duplicateRemoval.result)
    account.patchOrders.restore()
    account.getOpenOrders.restore()
  })

  it('should create sets of buys and sells for collar strategy', function* () {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock     = sinon.useFakeTimers(timestamp)
    var bot       = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    var price     = fixtures.collar.price
    sinon.stub(account, 'calculateAvailableMarginIfCrossShifted').returns(fixtures.collar.margin)
    var newOrders = bot.collar(price);
    ['buys', 'sells'].forEach(side => {
      _.values(newOrders[side]).forEach(order => {
        delete order.clientid
        delete order.orderType
        delete order.stopPrice
        delete order.targetPrice
        delete order.crossMargin
        delete order.instrument
        delete order.userid
      })
    })
    console.log(JSON.stringify(newOrders))
    expect(newOrders).to.eql(fixtures.collar.result)
    account.calculateAvailableMarginIfCrossShifted.restore()
    clock.restore()
  })

  it('should create patch given current book and expected new book', function* () {
    var bot    = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    var result = bot.getPatch(fixtures.createPatch.currentBook, fixtures.createPatch.newBook)
    expect(result).to.eql(fixtures.createPatch.patch)
  })

  it('should get max buy and sell order count based on exposure', function* () {
    var bot    = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    var result = bot.getMaxOrderCounts({ quantity: -50 }, 'buy')
    expect(result).to.eql(fixtures.params.maxQty + 50)
    result = bot.getMaxOrderCounts({ quantity: -50 }, 'sell')
    expect(result).to.eql(fixtures.params.maxQty - 50)

  })

  it.skip("should calculate target price using premium", function* () {
    var timestamp    = Date.parse(fixtures.testDateToday)
    var clock        = sinon.useFakeTimers(timestamp)
    var bot          = yield* Bot.create(fixtures.symbol, fixtures.params, account, fixtures.marginPercent, fixtures.params.bot)
    var targetPoints = bot.getTargetPoints(fixtures.targetPoints.price)
    clock.restore()
    expect(targetPoints).to.eql(fixtures.targetPoints.result)
  })
})
