module.exports = (function () {
  var creator    = {}
  creator.create = function*(symbol, botParams, account, marginPercent, botName) {
    var bot = require("./" + botName)
    return (yield* bot(symbol, botParams, account, marginPercent))
  }
  return creator
})()
