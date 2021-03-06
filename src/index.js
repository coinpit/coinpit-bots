var bluebird       = require('bluebird')
var botParams      = require('./botParams')
var marketMakerGen = require('./marketMakerGen')
var util = require('util')

bluebird.coroutine(function* () {
  util.log("STARTING BOT")
  var params = botParams.read(process.argv[2], process.argv[3])
  var gen    = yield* marketMakerGen(params)
  yield* gen.run()
  if(params.bitmexHedge) {
    var bitmex = yield require('./bitmex/bitmex')
    bitmex.init(params.bitmex)
  }
  process.on('uncaughtException', (err) => {
    console.log("################################## uncaught exception ######################################")
    util.log(err.stack)
    console.log("################################## uncaught exception ######################################")
  })
})()
