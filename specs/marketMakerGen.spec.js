var expect         = require('expect.js')
var bluebird       = require('bluebird')
var mangler        = require('mangler')
var sinon          = require('sinon')
var coinpitClient  = require('coinpit-client')
var fixtures       = require('./fixtures/marketMakerGen.spec.json')
var marketMakerBot = require('../src/marketMakerBot')
var marketMakerGen = require('../src/marketMakerGen')
require('mocha-generators').install()

describe('marketMakerGen', function() {
  var NEAR_SYMBOL     = 'BTCUSD7F13'
  var FAR_SYMBOL      = 'BTCUSD7F20'
  var NEXT_FAR_SYMBOL = 'BTCUSD7F27'

  beforeEach(function() {
    sinon.stub(coinpitClient, 'getAccount', function() {
      var account =
            {
              "getInstruments": function() {
                var instruments = {}
                Object.keys(fixtures.instruments).forEach(function(x) {
                  if(Date.now() < Date.parse(fixtures.bot[x].expiry)) {
                    if(Object.keys(instruments).length == 2) return
                    instruments[x] = fixtures.instruments[x]
                    instruments[x].expiry = Date.parse(fixtures.bot[x].expiry)
                  }
                })
                return instruments
              }
            }

      return bluebird.resolve(account)
    })

    sinon.stub(marketMakerBot, "create", function*(symbol, botParams, account, botPercent) {
      var bot = fixtures.bot[symbol]
      bot.symbol = symbol
      bot.isExpired = function() { return Date.now() > Date.parse(bot.expiry) }
      bot.getMarginPercent = function() { return botPercent }
      bot.setMarginPercent = function(marginPercent) { botPercent = marginPercent }
      return bot
    })
  })

  afterEach(function() {
    coinpitClient.getAccount.restore()
    marketMakerBot.create.restore()
  })

  it('should create market maker bots on near expiry and far expiry contracts', function*() {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock = sinon.useFakeTimers(timestamp)
    var mmGen       = yield* marketMakerGen(fixtures.params)
    yield* mmGen.createBots()
    expect(mmGen.nearExpiryBot().symbol).to.be(NEAR_SYMBOL)
    expect(mmGen.farExpiryBot().symbol).to.be(FAR_SYMBOL)
    clock.restore()
  })

  it('should create a bot on the new far contract when new contract is available', function*() {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock = sinon.useFakeTimers(timestamp)
    var mmGen       = yield* marketMakerGen(fixtures.params)
    var unpromoted, promoted
    yield* mmGen.run()
    expect(mmGen.nearExpiryBot().symbol).to.be(NEAR_SYMBOL)
    expect((unpromoted = mmGen.farExpiryBot()).symbol).to.be(FAR_SYMBOL)
    clock.tick(8 * 24 * 60 * 60 * 1000)
    expect((promoted = mmGen.nearExpiryBot()).symbol).to.be(FAR_SYMBOL)
    expect(mmGen.farExpiryBot().symbol).to.be(NEXT_FAR_SYMBOL)
    expect(promoted).to.equal(unpromoted)
    clock.restore()
  })

  it('should allocate 90%/10% availableMargin to near/far expiry bots', function*() {
    var timestamp = Date.parse(fixtures.testDateToday)
    var clock = sinon.useFakeTimers(timestamp)
    var mmGen       = yield* marketMakerGen(fixtures.params)
    var MAJOR_MARGIN = 90
    var MINOR_MARGIN = 10
    yield* mmGen.run()
    expect(mmGen.nearExpiryBot().getMarginPercent()).to.be(MAJOR_MARGIN)
    expect(mmGen.farExpiryBot().getMarginPercent()).to.be(MINOR_MARGIN)
    clock.tick(8 * 24 * 60 * 60 * 1000)
    expect(mmGen.nearExpiryBot().getMarginPercent()).to.be(MAJOR_MARGIN)
    expect(mmGen.farExpiryBot().getMarginPercent()).to.be(MINOR_MARGIN)
    clock.restore()
  })

})
