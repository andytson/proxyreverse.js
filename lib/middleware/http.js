var util = require('util')
  , net = require('net')
  , http = require('http');

var protocol = 'http:';

function HttpMiddleware(proxy, options) {
  this.options = options;
  this.proxy = proxy;
  this.defaults = {
   port: 80
  };
}

function createHttp(proxy, options) {
  proxy.registerProtocol(protocol, new HttpMiddleware(proxy, options));
}

module.exports.HttpMiddleware = HttpMiddleware;
module.exports.createHttp = createHttp;

HttpMiddleware.prototype.getUrl = function (request) {
  return protocol + request.headers.host;
};

HttpMiddleware.prototype.createServer = function (serverOptions) {
  var self = this;
  var server = http.createServer()
    .on('connect', function (request, socket, bodyHead) {
      self.doConnect(request, socket, bodyHead);
    })
    .on('request', function (request, response) {
      request.protocol = protocol;
      self.proxy.proxyRequest(request, response);
    })
    .listen(serverOptions.port);
  server.serverOptions = serverOptions;
  server.getUrl = this.getUrl;

  return server;
};

HttpMiddleware.prototype.doConnect = function (request, socket, bodyHead) {
  if (this.options['mode'] === 'forward') {
    this.connectForward(request, socket, bodyHead);
  } else {
    this.connectReverse(request, socket, bodyHead);
  }
};

HttpMiddleware.prototype.createAgent = function (backendOptions, socket) {
  socket.agent = new http.Agent;
  return socket.agent;
};

HttpMiddleware.prototype.request = function (options, callback) {
  options = util._extend(options, this.defaults);
  return http.request(options, callback);
};

HttpMiddleware.prototype.synReply = function (request, socket, statusCode, headers, cb) {
  var response = new http.ServerResponse(request);
  response.useChunkedEncodingByDefault = false;

  response.on('finish', function () {
    this.detachSocket(socket);
    if (cb) { cb.call(); }
  });

  response.assignSocket(socket);
  response.writeHead(statusCode, headers);
  response.end();
};

HttpMiddleware.prototype.connectForward = function (request, socket, bodyHead) {
  var self = this;
  var requestOptions = {
    host: request.url.split(':')[0],
    port: request.url.split(':')[1] || 443
  };

  if (this.options.verbose) {
      console.log('connect: %s:%s', requestOptions.host, requestOptions.port);
  }

  var tunnel = net.createConnection(requestOptions, function() {
    tunnel.pipe(socket);
    socket.pipe(tunnel);
    self.synReply(request, socket, 200, {
        'Connection': 'keep-alive'
    });
  });

  tunnel.setNoDelay(true);

  tunnel.on('error', function(e) {
    console.log("Tunnel error: " + e);
    self.synReply(request, socket, 502, {}, function() {
      socket.end();
    });
  });
};

HttpMiddleware.prototype.connectReverse = function (request, socket, bodyHead) {
  // TODO: Implement connect reverse forwarding
  socket.destroy();
};