var util = require('util')
  , fs = require('fs')
  , HttpMiddleware = require('./http').HttpMiddleware
  , https = require('https');

var protocol = 'https:';

function HttpsMiddleware(proxy, opts) {
  HttpMiddleware.call(this, proxy, opts);
  this.defaults = {
    port: 443
  };
  this.agentDefaults = {
    rejectUnauthorized: !opts.insecure
  };
}
util.inherits(HttpsMiddleware, HttpMiddleware);

function createHttps(proxy, opts) {
  proxy.registerProtocol(protocol, new HttpsMiddleware(proxy, opts));
}

module.exports.createHttps = createHttps;
module.exports.HttpsMiddleware = HttpsMiddleware;

HttpsMiddleware.prototype.createServer = function (serverOptions) {
  var self = this;
  var options = {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem')
  };

  var server = https.createServer(options)
    .on('connect', function (request, socket, bodyHead) {
      self.doConnect(request, socket, bodyHead);
    })
    .on('request', function (request, response) {
      request.protocol = protocol;
      self.proxy.proxyRequest(request, response);
    })
    .listen(serverOptions.port, serverOptions.host);
  server.serverOptions = serverOptions;
  server.getUrl = this.getUrl;

  return server;
};

HttpsMiddleware.prototype.createAgent = function (backendOptions, socket) {
  socket.agent = new https.Agent(this.agentDefaults);
  return socket.agent;
};

HttpsMiddleware.prototype.request = function (options, callback) {
  options = util._extend(options, this.defaults);
  return https.request(options, callback);
};