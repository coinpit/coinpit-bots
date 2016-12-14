var assert = require('affirm.js')

module.exports = function (walletFileName) {
  var wallet = require("./privateKeyReader")(walletFileName)
  assert(wallet, 'PrivateKey not found. Check key file.')
  var baseurl      = process.env.BASE_URL
  baseurl          = baseurl || (wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
  var depth        = (process.env.DEPTH || 0.5) - 0
  var stopPoints   = (process.env.STP || 10) - 0
  var targetPoints = (process.env.TGT || 1) - 0
  var spread       = (process.env.SPREAD || 0.1) - 0
  var step         = (process.env.STEP || 0.1) - 0
  var strat        = (process.env.STRAT || 'collar')
  var quantity     = (process.env.QTY || 5) - 0
  var cross        = process.env.CROSS === "true"
  var symbol       = process.env.SYMBOL

  return {
    baseurl : baseurl,
    depth   : depth,
    wallet  : wallet,
    stop    : stopPoints,
    target  : targetPoints,
    spread  : spread,
    step    : step,
    strat   : strat,
    quantity: quantity,
    cross   : cross,
    symbol  : symbol
  }
}
