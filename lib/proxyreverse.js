exports.connectMiddleware = createProxy;

var HttpProxy = exports.HttpProxy = require('./http-proxy').HttpProxy;

function createProxy(opts) {
  proxy = new HttpProxy(opts);

  return function(request, response, next) {
    proxy.proxyRequest(request, response, next);
  };
};