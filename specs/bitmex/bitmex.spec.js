var expect   = require('expect.js')
var bluebird = require('bluebird')
var sinon    = require('sinon')
var rest     = require('rest.js')
require('mocha-generators').install()
var socket = require("../../src/bitmex/socket")
var clock
var bitmex

describe('bitmex', function () {

  this.timeout(10000)
  it('should get path from url', function* () {
    bitmex   = yield require('../../src/bitmex/bitmex')
    var path = bitmex.getPath('https://testnet.bitmex.com/api/v1/orders?key1=value1&key2=val2')
    expect(path).to.eql('/api/v1/orders')
  })

  it('place order', function* () {
    sinon.stub(rest, 'post', emptypromise)
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

    var arguments = rest.post.getCall(0).args
    expect(arguments[0]).to.eql('https://testnet.bitmex.com/api/v1/order')
    expect(arguments[1]).to.eql({
                                  'content-type'    : 'application/json',
                                  Accept            : 'application/json',
                                  'X-Requested-With': 'XMLHttpRequest',
                                  'api-expires'     : 1502937502200,
                                  'api-key'         : 'N3l3N7M1VoCW_haO30XjhgdJ',
                                  'api-signature'   : 'aa45c6f2caee48c22efdbfe9cc97556f65bd6a8845a36a1fa39340a73620a7e2'
                                })
    expect(arguments[2]).to.eql({
                                  execInst      : 'LastPrice',
                                  ordType       : 'StopMarket',
                                  pegOffsetValue: 1,
                                  pegPriceType  : 'TrailingStopPeg',
                                  orderQty      : 1,
                                  symbol        : 'XBTUSD',
                                  side          : 'Buy'
                                })

  })

  afterEach(function () {
    if (rest.post.restore) rest.post.restore()
    if (clock && clock.restore) clock.restore()
  })

  it('socket test', function (done) {
    var client = socket()
    client.init({
                  url       : "https://testnet.bitmex.com/api/v1/",
                  apiKey    : "N3l3N7M1VoCW_haO30XjhgdJ",
                  apiSecret : "xoSLABLiLGmI2ZleCvyWYbYhHUD4IgpNBOQHX2PMBrZKlJwd",
                  instrument: "XBTUSD"
                })

  })
})

var emptypromise = bluebird.coroutine(function* () {
  return {}
})
