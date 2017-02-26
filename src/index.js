var bluebird       = require('bluebird')
var botParams      = require('./botParams')
var marketMakerGen = require('./marketMakerGen')
var util = require('util')

bluebird.coroutine(function* () {
  util.log("STARTING BOT")
  var params = botParams.read(process.argv[2])
  var gen    = yield* marketMakerGen(params)
  yield* gen.run()
})()
