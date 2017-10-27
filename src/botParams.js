var affirm           = require('affirm.js')
var PrivateKeyReader = require("./privateKeyReader")

module.exports = (function () {
  var botParams = {}

  var DEFAULT_DEPTH    = 0.5
  var DEFAULT_STP      = 10
  var DEFAULT_TGT      = 1
  var DEFAULT_SPREAD   = 0.1
  var DEFAULT_STEP     = 0.1
  var DEFAULT_QTY      = 5
  var DEFAULT_PREMIUM  = 6
  var DEFAULT_STRAT    = 'collar'
  var DEFAULT_BOT      = 'marketMakerBot'
  var DEFAULT_INTERVAL = 1000
  var DEFAULT_MAX_QTY  = 1000
  var DEFAULT_MARGIN_PERCENT  = 0.6

  // market maker on coinpit will maintain number of contracts on buy and sell side
  var DEFAULT_BITMEX_QTY_FOR_SPREAD           = 50000
  //commission adjustment to price from bitmex in points
  var DEFAULT_BITMEX_COMMISSION_SPREAD_ADJUST = 1
  var DEFAULT_COINPIT_BITMEX_RATIO            = 100
  // one buy and one sell order is placed 2% away from index to make sure that there is always some spread is avalable.
  var DEFAULT_COINPIT_LATCH                   = 0.02

  var DEFAULT_BITMEX_SYMBOL                  = 'XBTUSD'
// places a trailing stop order with peg. if this value is 0, a market order will be placed.
  var DEFAULT_BITMEX_TRAILING_PEG            = 10
  var DEFAULT_BITMEX_HEDGE_INTERVAL          = 2000
  var DEFAULT_BITMEX_MAX_INDIVIDUAL_POSITION = 20
  var DEFAULT_BITMEX_PEG_INTERVAL            = 1

  botParams.read = function (walletFileName, bitmex) {
    var params    = {}
    params.wallet = PrivateKeyReader(walletFileName)
    affirm(params.wallet, 'PrivateKey not found. Check key file.')
    affirm(trim(process.env.TEMPLATE), "Define environment variable TEMPLATE for instrument series")

    params.baseurl  = trim(process.env.BASE_URL)
    var isLive      = (params.wallet.address || params.wallet.userid).startsWith("1")
    params.baseurl  = params.baseurl || (isLive ? "https://live.coinpit.io" : "https://live.coinpit.me")
    params.depth    = (trim(process.env.DEPTH) || DEFAULT_DEPTH) - 0
    params.stop     = (trim(process.env.STP) || DEFAULT_STP) - 0
    params.target   = (trim(process.env.TGT) || DEFAULT_TGT) - 0
    params.spread   = (trim(process.env.SPREAD) || DEFAULT_SPREAD) - 0
    params.step     = (trim(process.env.STEP) || DEFAULT_STEP) - 0
    params.quantity = (trim(process.env.QTY) || DEFAULT_QTY) - 0
    params.strat    = trim(process.env.STRAT) || DEFAULT_STRAT
    params.cross    = trim(process.env.CROSS) === "true"
    params.template = trim(process.env.TEMPLATE)
    params.premium  = (trim(process.env.PREMIUM) || DEFAULT_PREMIUM) - 0
    params.bot      = trim(process.env.BOT) || DEFAULT_BOT
    params.interval = (trim(process.env.INTERVAL) || DEFAULT_INTERVAL) - 0
    params.maxQty   = (trim(process.env.MAX_QTY) || DEFAULT_MAX_QTY) - 0
    params.marginPercent = (trim(process.env.MARGIN_PERCENT) || DEFAULT_MARGIN_PERCENT) - 0

    if (bitmex) {
      params.bitmexHedge = true
      params.bitmex      = PrivateKeyReader(bitmex)
      affirm(params.bitmex.apiKey, 'invalid bitmex apiKey')
      affirm(params.bitmex.apiSecret, 'invalid bitmex apiSecret')
      params.bitmex.url     = isLive ? "https://www.bitmex.com/api/v1/" : "https://testnet.bitmex.com/api/v1/"
      params.bitmex.testnet = !isLive

      params.bitmex.commissionAdjust      = (trim(process.env.BITMEX_COMMISSION_SPREAD_ADJUST) || DEFAULT_BITMEX_COMMISSION_SPREAD_ADJUST) - 0
      params.bitmex.qtyForSpread          = (trim(process.env.BITMEX_QTY_FOR_SPREAD) || DEFAULT_BITMEX_QTY_FOR_SPREAD) - 0
      params.bitmex.coinpitBitmexRatio    = (trim(process.env.BITMEX_COINPIT_BITMEX_RATIO) || DEFAULT_COINPIT_BITMEX_RATIO) - 0
      params.bitmex.instrument            = trim(process.env.BITMEX_INSTRUMENT) || DEFAULT_BITMEX_SYMBOL
      params.bitmex.trailingPeg           = (trim(process.env.BITMEX_TRAILING_PEG) || DEFAULT_BITMEX_TRAILING_PEG) - 0
      params.bitmex.hedgeInterval         = (trim(process.env.BITMEX_HEDGE_INTERVAL) || DEFAULT_BITMEX_HEDGE_INTERVAL) - 0
      params.bitmex.maxIndividualPosition = (trim(process.env.BITMEX_MAX_INDIVIDUAL_POSITION) || DEFAULT_BITMEX_MAX_INDIVIDUAL_POSITION) - 0
      params.bitmex.pegInterval           = (trim(process.env.BITMEX_PEG_INTERVAL) || DEFAULT_BITMEX_PEG_INTERVAL) - 0

    }
    return params
  }

  function trim(str) {
    if (str) return str.trim()
    return str
  }

  return botParams
})()
