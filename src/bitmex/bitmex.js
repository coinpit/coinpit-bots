var bluebird  = require('bluebird')
var rest      = require('../request-promise')
var crypto    = require('crypto')
var affirm    = require('affirm.js')
var URL       = require('url')
var Socket    = require('./socket')
var hedgeInfo = require('../hedgeInfo')

module.exports = bluebird.coroutine(function* () {
  var bitmex       = {}
  var rateLimit    = {}
  var errorCounter = 0
  var socket, spread
  bitmex.init      = function (params) {
    affirm(params && params.url && params.instrument && params.apiKey && params.apiSecret, 'Missing params for bitmex. { url:"", instrument:"", apiKey:"", apiSecret:""}')
    bitmex.params = params
    socket        = Socket({ orderBook: bitmex.onOrderBookChange })
    socket.init(params)
    setTimeout(bitmex.startHedge, 5000)
  }

  bitmex.getHeaders = function (uri, method, body) {
    var path      = bitmex.getPath(uri)
    var expires   = new Date().getTime() + (60 * 1000) // 1 min in the future
    var bodyStr   = body ? JSON.stringify(body) : ""
    var signature = crypto.createHmac('sha256', bitmex.params.apiSecret).update(method + path + expires + bodyStr).digest('hex');
    return {
      'content-type'    : 'application/json',
      'Accept'          : 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'api-expires'     : expires,
      'api-key'         : bitmex.params.apiKey,
      'api-signature'   : signature
    }
  }

  bitmex.getPath = function (uri) {
    affirm(uri, 'Pass a valid uri')
    var parsed = URL.parse(uri)
    return parsed.pathname//.replace(/([^:]\/)\/+/g, "$1")
    // return parsed.pathname.replace(/([^:]\/)\/+/g, "$1")
  }

  bitmex.placeOrder = function* (quantity, side, offset) {
    affirm(quantity > 0, "Quantity must be positive number")
    affirm(side === "Buy" || side === "Sell", "Valid sides ar Buy or Sell")
    var endpoint = "order"
    if ((side === 'Sell' && offset > 0) || (side === 'Buy' && offset < 0)) offset = offset * -1
    var payload  = !offset ? bitmex.getMarket(quantity, side) : bitmex.getTrailingStop(offset, quantity, side)
    var uri      = bitmex.params.url + endpoint
    var headers  = bitmex.getHeaders(uri, "POST", payload)
    var response = yield rest.post({ uri: uri, headers: headers, json: payload })
    bitmex.setRateLimit(response)
    return response
  }

  bitmex.placeBulk = function* (splits, side) {
    affirm(splits, "Quantity splits undefined")
    affirm(side === "Buy" || side === "Sell", "Valid sides ar Buy or Sell")
    var endpoint = "order/bulk"
    var orders   = []
    for (var i = 0; i < splits.length; i++) {
      var tupple = splits[i];
      var peg    = tupple.peg
      if ((side === 'Sell' && peg > 0) || (side === 'Buy' && peg < 0)) peg = peg * -1
      var order = bitmex.getTrailingStop(peg, tupple.qty, side)
      orders.push(order)
    }
    var uri      = bitmex.params.url + endpoint
    var headers  = bitmex.getHeaders(uri, "POST", { orders: orders })
    var response = yield rest.post({ uri: uri, headers: headers, json: { orders: orders } })
    bitmex.setRateLimit(response)
    return response
  }

  bitmex.cancelAllOrders = function* () {
    var endpoint = "order/all"
    var uri      = bitmex.params.url + endpoint
    var headers  = bitmex.getHeaders(uri, "DELETE")
    var response = yield rest.del({ uri: uri, headers: headers })
    bitmex.setRateLimit(response)
  }

  bitmex.getMarket = function (quantity, side) {
    return {
      "ordType" : "Market",
      "orderQty": quantity,
      "symbol"  : bitmex.params.instrument,
      "side"    : side
    }
  }

  bitmex.getTrailingStop = function (offset, quantity, side) {
    return {
      "execInst"      : "LastPrice",
      "ordType"       : "StopMarket",
      "pegOffsetValue": offset,
      "pegPriceType"  : "TrailingStopPeg",
      "orderQty"      : quantity,
      "symbol"        : bitmex.params.instrument,
      "side"          : side
    }
  }

  bitmex.getSpread = function () {
    console.log("############# spread", spread)
    return spread
  }

  bitmex.onOrderBookChange = function () {
    var orderBook = socket.getOrderBook()
    if (!orderBook || !orderBook.bids || !orderBook.asks) return
    var buyPrice  = bitmex.getPriceFor(bitmex.params.qtyForSpread, orderBook['bids'])
    var sellPrice = bitmex.getPriceFor(bitmex.params.qtyForSpread, orderBook['asks'])
    spread        = ((sellPrice - buyPrice) + bitmex.params.commissionAdjust) / 2
    hedgeInfo.setBitmexSpread(spread)
  }

  bitmex.getPriceFor = function (quantity, prices) {
    var total = 0
    var price
    for (var i = 0; i < prices.length; i++) {
      var tuple = prices[i];
      total += tuple[1]
      price     = tuple[0]
      if (total >= quantity) return tuple[0]
    }
    return price

  }

  bitmex.startHedge = bluebird.coroutine(function* () {
    try {
      if (bitmex.isRateLimitExceeded()) return
      var coinpitPositions = hedgeInfo.getCoinpitPositions()
      if (coinpitPositions === undefined) return
      var on_bitmex  = socket.getPositions()
      var hedgeCount = on_bitmex + coinpitPositions * bitmex.params.coinpitBitmexRatio
      if (bitmex.alreadyHedged(hedgeCount)) return
      var orders = socket.getOrders()
      if (orders.length > 0) yield* bitmex.cancelAllOrders()
      var side = hedgeCount > 0 ? 'Sell' : 'Buy'
      var qty  = Math.abs(hedgeCount)
      if (qty === 0) return
      if (bitmex.params.trailingPeg === 0) {
        qty = Math.min(qty, bitmex.params.maxIndividualPosition)
        yield* bitmex.placeOrder(qty, side, bitmex.params.trailingPeg)
      } else {
        var splits = bitmex.splitOrderPeg(qty, bitmex.params.maxIndividualPosition, bitmex.params.trailingPeg, bitmex.params.pegInterval)
        yield* bitmex.placeBulk(splits, side)
      }
    } catch (e) {
      console.log(e)
    } finally {
      setTimeout(bitmex.startHedge, bitmex.params.hedgeInterval)
    }
  })

  bitmex.splitOrderPeg = function (hedgeQty, maxIndividualQty, peg, increment) {
    var split = []
    while (hedgeQty > 0) {
      var qty = Math.min(hedgeQty, maxIndividualQty)
      split.push({ qty: qty, peg: peg })
      hedgeQty -= qty
      peg += increment
    }
    return split
  }

  bitmex.alreadyHedged = function (hedgeCount) {
    var hedged = 0
    var orders = socket.getOrders()
    for (var i = 0; i < orders.length; i++) {
      var order = orders[i];
      hedged += order.leavesQty * (order['side'] === 'Buy' ? -1 : 1)
    }
    return hedgeCount === hedged
  }

  bitmex.setRateLimit = function (response) {
    if (response.statusCode >= 400) {
      errorCounter++
      console.log("###### error response from bitmex.", JSON.stringify(
        {
          counter: errorCounter, response: { statusCode: response.statusCode, body: response.body, headers: response.headers },
          request                        : { header: response.request.headers, body: response.request.body, path: response.request.path }
        })
      )
    }
    var headers = response.headers
    var time
    if (response.statusCode === 429 && headers['retry-after']) {
      time = Date.now() + (headers['retry-after'] - 0) * 1000
    } else {
      time = (headers['x-ratelimit-reset'] - 0) * 1000
    }
    rateLimit = {
      time : time,
      count: headers['x-ratelimit-remaining'] - 0
    }
    console.log("###### ratelimit", JSON.stringify(rateLimit))
  }

  bitmex.isRateLimitExceeded = function () {
    if (errorCounter > 3) process.exit(1)
    if (rateLimit.time === undefined) return false
    if (Date.now() > rateLimit.time) return false
    if (rateLimit.count > 5) return false
    console.log('Bitmex Rate limit exceeded. waiting to hedge until', new Date(rateLimit.time), " Bitmex ratelimit response:", JSON.stringify(rateLimit))
    return true
  }

  return bitmex
})()