var expect   = require('expect.js')
var reader = require('../src/privateKeyReader')
var path = require('path')
describe("read password", function () {
  it("read from private key file", function() {
    var privateKey = reader(__dirname + path.sep + 'privateKey.json')
    expect(privateKey).to.be.eql(require("./privateKey.json"))
  })
})