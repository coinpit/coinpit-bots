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

  botParams.read = function (walletFileName) {
    var params    = {}
    params.wallet = PrivateKeyReader(walletFileName)
    affirm(params.wallet, 'PrivateKey not found. Check key file.')
    affirm(process.env.TEMPLATE, "Define environment variable TEMPLATE for instrument series")

    params.baseurl  = process.env.BASE_URL
    params.baseurl  = params.baseurl || (params.wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
    params.depth    = (process.env.DEPTH || DEFAULT_DEPTH) - 0
    params.stop     = (process.env.STP || DEFAULT_STP) - 0
    params.target   = (process.env.TGT || DEFAULT_TGT) - 0
    params.spread   = (process.env.SPREAD || DEFAULT_SPREAD) - 0
    params.step     = (process.env.STEP || DEFAULT_STEP) - 0
    params.quantity = (process.env.QTY || DEFAULT_QTY) - 0
    params.strat    = process.env.STRAT || DEFAULT_STRAT
    params.cross    = process.env.CROSS === "true"
    params.template = process.env.TEMPLATE
    params.premium  = (process.env.PREMIUM || DEFAULT_PREMIUM) - 0
    params.bot      = process.env.BOT || DEFAULT_BOT
    params.interval = (process.env.INTERVAL || DEFAULT_INTERVAL) - 0

    return params
  }

  return botParams
})()
