var expect   = require('expect.js')
var bluebird = require('bluebird')
var sinon    = require('sinon')
var rest     = require("../../src/request-promise")

require('mocha-generators').install()
var clock
var bitmex

describe('bitmex', function () {

  it('should get path from url', function* () {
    bitmex   = yield require('../../src/bitmex/bitmex')
    var path = bitmex.getPath('https://testnet.bitmex.com/api/v1/orders?key1=value1&key2=val2')
    expect(path).to.eql('/api/v1/orders')
  })

  it('place order', function* () {
    sinon.stub(rest, 'post', emptypromise)
    sinon.stub(bitmex, 'setRateLimit', empty)
    sinon.stub(bitmex, 'isRateLimitExceeded', empty)

    clock = sinon.useFakeTimers();
    clock.tick(1502937442200);
    bitmex        = yield require('../../src/bitmex/bitmex')
    bitmex.params = {
      url       : "https://testnet.bitmex.com/api/v1/",
      apiKey    : "N3l3N7M1VoCW_haO30XjhgdJ",
      apiSecret : "xoSLABLiLGmI2ZleCvyWYbYhHUD4IgpNBOQHX2PMBrZKlJwd",
      instrument: "XBTUSD"
    }
    yield bitmex.placeOrder(1, 'Buy', 1)

    var arguments = rest.post.getCall(0).args[0]
    expect(arguments.uri).to.eql('https://testnet.bitmex.com/api/v1/order')
    expect(arguments.headers).to.eql({
                                  'content-type'    : 'application/json',
                                  Accept            : 'application/json',
                                  'X-Requested-With': 'XMLHttpRequest',
                                  'api-expires'     : 1502937502200,
                                  'api-key'         : 'N3l3N7M1VoCW_haO30XjhgdJ',
                                  'api-signature'   : 'aa45c6f2caee48c22efdbfe9cc97556f65bd6a8845a36a1fa39340a73620a7e2'
                                })
    expect(arguments.json).to.eql({
                                  execInst      : 'LastPrice',
                                  ordType       : 'StopMarket',
                                  pegOffsetValue: 1,
                                  pegPriceType  : 'TrailingStopPeg',
                                  orderQty      : 1,
                                  symbol        : 'XBTUSD',
                                  side          : 'Buy'
                                })

  })

  it('should get split order with different pegs for traing stops', function* () {
    bitmex     = yield require('../../src/bitmex/bitmex')
    var result = bitmex.splitOrderPeg(100, 2000, 10, 1)
    expect(result).to.eql([{ qty: 100, peg: 10 }])
    result = bitmex.splitOrderPeg(4100, 2000, 10, 1)
    expect(result).to.eql([{ qty: 2000, peg: 10 }, { qty: 2000, peg: 11 }, { qty: 100, peg: 12 }])
  })

  afterEach(function () {
    if (rest.post.restore) rest.post.restore()
    if (bitmex.setRateLimit.restore) bitmex.setRateLimit.restore()
    if (bitmex.isRateLimitExceeded.restore) bitmex.isRateLimitExceeded.restore()
    if (clock && clock.restore) clock.restore()
  })

})

var emptypromise = bluebird.coroutine(function* () {
  return {}
})
var empty        = function () {
}