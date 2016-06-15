var assert    = require('affirm.js')

module.exports = function(walletFileName) {
  var wallet = require("./privateKeyReader")(walletFileName)
  assert(wallet, 'PrivateKey not found. Check key file.')
  var baseurl = process.env.BASE_URL
  baseurl     = baseurl || (wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
  var depth = (process.env.DEPTH || 10) - 0

  return {
    baseurl: baseurl,
    depth: depth,
    wallet: wallet
  }
}
