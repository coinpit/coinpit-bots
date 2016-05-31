var fs     = require('fs')
var assert = require('affirm.js')

module.exports = function (walletFile) {
  var walletData  = readWallet(walletFile)
  return walletData
}

function readWallet(walletFile) {
  assert(walletFile, 'Please specify walletFile file: ' + walletFile)
  var stats = walletFile && fs.statSync(walletFile)
  assert(stats.isFile(), 'Does not seem to be file: ' + walletFile)
  var wallet     = fs.readFileSync(walletFile)
  var walletData = JSON.parse(wallet)
  assert(walletData, 'Wallet unreadable')
 return walletData
}
