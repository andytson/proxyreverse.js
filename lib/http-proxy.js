RegExp.quote = require('regexp-quote');

var events = require('events')
  , util = require('util');

var HttpProxy = exports.HttpProxy = function (options) {
  events.EventEmitter.call(this);
  this.protocols = {};
  this.options = options;

  if (options['mode'] === 'reverse') {
    if (options['rewrite-subdomains']) {
      options['rewrite-domain'] = '.' + options['backend_host'].replace(/^www./, '');
    } else if (options['rewrite-domain'] === undefined) {
      options['rewrite-domain'] = options['backend_host'];
    }

    // Create a re-usable regex expression that can match the domains to rewrite.
    if (options['rewrite-domain'][0] === '.') {
      // match all sub-domains of the provided backend
      options['regex'] = '(?:[a-z\\.]*\\.)?' + RegExp.quote(options['rewrite-domain'].slice(1));
    } else {
      // match only the exact domain of the provided backend
      options['regex'] = RegExp.quote(options['rewrite-domain']);
    }
  }
};

util.inherits(HttpProxy, events.EventEmitter);

HttpProxy.prototype.createServer = function (serverOptions) {
  var server = this.protocols[serverOptions.protocol].createServer(serverOptions);

  return server;
};

HttpProxy.prototype.registerProtocol = function(scheme, callbacks) {
  this.protocols[scheme] = callbacks;
};

HttpProxy.prototype.proxyRequest = function(request, response, next) {
  var self = this;
  var backendOptions = {
    method: request.method,
    headers: util._extend({},request.headers)
  };

  this.emit('request_options', request, backendOptions);

  // re-use the agent a socket is attached to so that keep-alive for the server
  // connection also keep-alive's the backend connection.
  var agent = request.socket.agent;
  if (agent) {
    backendOptions.agent = agent;
  } else {
    backendOptions.agent = this.protocols[backendOptions.protocol].createAgent(backendOptions, request.socket);
  }

  var proxy_request = this.protocols[backendOptions.protocol].request(backendOptions);

  proxy_request.on('error', function (err) {
    console.log('error', err);
    if (!response.headersSent) {
      response.writeHead(502, {'content-type': 'text/plain'});
      response.write('Bad Gateway');
    }
    response.end();
  });

  proxy_request.once('response', function (proxy_response) {
    self.emit('proxy_response', request, response, proxy_request, proxy_response);
    var proxyResponseChunks = [];

    // if the response is buffered, assume it's length will change, so change
    // to chunked transfer encoding
    if (proxy_response.buffer) {
      delete proxy_response.headers['content-length'];
      proxy_response.headers['transfer-encoding'] = 'chunked';

      proxy_response.on('data', function(chunk) {
        proxyResponseChunks.push(chunk);
      });

      proxy_response.on('end', function() {
        if (proxy_response.buffer) {
          var buffer = Buffer.concat(proxyResponseChunks);
          self.emit('data', buffer, request, response, proxy_request, proxy_response);
        } else {
          response.end();
        }
      });
    } else {
        proxy_response.pipe(response);
    }

    response.writeHead(proxy_response.statusCode, proxy_response.headers);
  });

  if (proxy_request.buffer) {
    var requestChunks = [];
    request.on('data', function(chunk) {
      proxy_request.write(chunk, 'binary');
    });

    request.on('end', function() {
      proxy_request.end();
    });
  } else {
    request.pipe(proxy_request);
  }
};