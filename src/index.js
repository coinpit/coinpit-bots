var bluebird       = require('bluebird')
var botParams      = require('./botParams')
var marketMakerGen = require('./marketMakerGen')

bluebird.coroutine(function* () {
  var params = botParams.read(process.argv[2])
  var gen    = yield* marketMakerGen(params)
  yield* gen.run()
})()
