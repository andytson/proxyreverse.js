var util = require('util')
  , fs = require('fs')
  , http = require('http')
  , HttpsMiddleware = require('./https').HttpsMiddleware
  , spdy = require('spdy');

var protocol = 'https:';

function Http2Middleware(proxy, opts) {
  HttpsMiddleware.call(this, proxy, opts);
};
util.inherits(Http2Middleware, HttpsMiddleware);

function createHttp2(proxy, opts) {
  proxy.registerProtocol(protocol, new Http2Middleware(proxy, opts));
}

module.exports.Http2Middleware = Http2Middleware;
module.exports.createHttp2 = createHttp2;

Http2Middleware.prototype.createServer = function (serverOptions) {
  var self = this;
  var options = {
    key: fs.readFileSync('server-key.pem'),
    cert: fs.readFileSync('server-cert.pem')
  };
  var server = spdy.createServer(options)
    .on('connect', function (request, socket, bodyHead) {
      self.doConnect(request, socket, bodyHead);
    })
    .on('request', function (request, response) {
      // node-spdy for some reason passing connect method to request
      // so send it to the right place
      if (request.method === 'CONNECT') {
          self.doConnect(request, response.socket);
          return;
      }
      request.protocol = protocol;
      self.proxy.proxyRequest(request, response);
    })
    .listen(serverOptions.port);
  server.serverOptions = serverOptions;
  server.getUrl = this.getUrl;

  return server;
};

// SPDY client implementation doesn't currently support fallback to https
// so use inherited https client agent for now.
//Http2Middleware.prototype.createAgent = function (backendOptions, socket) {
//  socket.agent = spdy.createAgent(util._extend({host: backendOptions.hostname}, agentDefaults));
//  return socket.agent;
//};


Http2Middleware.prototype.synReply = function (request, socket, statusCode, headers, cb) {
  if (!socket._lock) {
      return HttpsMiddleware.prototype.synReply.call(this, request, socket, statusCode, headers, cb);
  }
  var statusMessage = http.STATUS_CODES[statusCode] || 'unknown';
  socket._lock(function() {
    var socket = this;
    this._spdyState.framer.replyFrame(
      this._spdyState.id, statusCode, statusMessage, headers,
      function (err, frame) {
        socket.connection.write(frame);
        socket._unlock();
        if (cb) { cb.call(); }
      }
    );
  });
};
