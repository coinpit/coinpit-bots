module.exports = (function () {
  var info = {}
  var coinpitPositions, bitmexSpread

  info.getCoinpitPositions = function () {
    return coinpitPositions
  }

  info.setCoinpitPositions = function (count) {
    coinpitPositions = count
  }

  info.getBitmexSpread = function () {
    return bitmexSpread
  }

  info.setBitmexSpread = function (spread) {
    bitmexSpread = spread
  }

  return info
})()