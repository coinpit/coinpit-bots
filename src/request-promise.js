var request  = require('request')
var bluebird = require('bluebird')
var extend   = require('extend')

function verbFunc(verb) {
  var method = verb === 'del' ? 'DELETE' : verb.toUpperCase()
  return function (uri, options, callback) {
    var params    = initParams(uri, options, callback)
    params.method = method
    return request(params, params.callback)
  }
}

// organize params for patch, post, put, head, del
function initParams(uri, options, callback) {
  if (typeof options === 'function') {
    callback = options
  }

  var params = {}
  if (typeof options === 'object') {
    extend(params, options, { uri: uri })
  } else if (typeof uri === 'string') {
    extend(params, { uri: uri })
  } else {
    extend(params, uri)
  }

  params.callback = callback
  return params
}

request.options = verbFunc("options")
request.patch   = verbFunc("patch")

var rest = {
  get    : bluebird.promisify(request.get),
  post   : bluebird.promisify(request.post),
  del    : bluebird.promisify(request.del),
  put    : bluebird.promisify(request.put),
  options: bluebird.promisify(request.options),
  patch  : bluebird.promisify(request.patch)
}

module.exports = rest

