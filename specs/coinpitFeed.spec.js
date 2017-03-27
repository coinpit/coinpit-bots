var expect      = require('expect.js')
var sinon       = require('sinon')
var CoinpitFeed = require("../src/coinpitFeed")
var bluebird    = require('bluebird')
require('mocha-generators').install()

describe('coinpit feed', function () {
  it("should invoke all handlers when message on trade is received on socket", function*() {
    var socket      = mockSocket()
    var coinpitFeed = CoinpitFeed(socket)
    var handler1    = handler()
    var handler2    = handler()
    sinon.spy(handler1, "trade")
    sinon.spy(handler2, "trade")
    coinpitFeed.setListeners([handler1, handler2])
    var message = "some message"
    socket.emit("trade", message)
    yield bluebird.delay(1)
    expect(handler1.trade.getCall(0).args[0]).to.eql(message)
    expect(handler2.trade.getCall(0).args[0]).to.eql(message)
  })
})

function handler() {
  var handler   = {}
  handler.trade = function (response) {
    // console.log("CALLED WITH", response)
  }

  return handler
}

function mockSocket() {
  var socket   = {}
  var topicMap = {}
  socket.on    = function (topic, handler) {
    topicMap[topic] = handler
  }

  socket.emit = function (topic, message) {
    topicMap[topic](message)
  }
  return socket
}
