var assert    = require('affirm.js')

module.exports = function(bot){
  var wallet = require("./privateKeyReader")(process.argv[2])
  assert(wallet, 'PrivateKey not found. Check key file.')
  var baseUrl = process.env.BASE_URL
  baseUrl     = baseUrl || (wallet.address.startsWith("1") ? "https://live.coinpit.io" : "https://live.coinpit.me")
  var depth = (process.env.DEPTH || 10) - 0
  var side = process.argv[3] === 'sell' ? 'sell' : 'buy'
  bot(baseUrl, wallet, "buy", depth)
  bot(baseUrl, wallet, "sell", depth)
}
