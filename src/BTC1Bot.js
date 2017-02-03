var bluebird       = require('bluebird')
var coinpit        = require('coinpit-client')
var marketMakerBot = require('./marketMakerBot')
var botParams      = require('./botParams')

bluebird.coroutine(function*() {
  var params      = botParams.read(process.argv[2])
  var account     = yield coinpit.getAccount(params.wallet.privateKey, params.baseurl)
  account.logging = true
  yield* marketMakerBot.create("BTC1", params, account, 100)
})()
