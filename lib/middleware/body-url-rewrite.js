module.exports = createBodyUrlRewrite;

var zlib = require('zlib');

function createBodyUrlRewrite(proxy, opts) {
  var defaults = {
    rewrite_content_types: [
      'text/html',
      'application/xhtml+xml'
    ]
  };
  var bodyRegexp = new RegExp('(https?:)\\/\\/' + opts['regex'], 'g');

  proxy.on('proxy_response', function (request, response, proxy_request, proxy_response) {
    if (opts['mode'] === 'reverse' && proxy_response.headers['content-type'] !== undefined) {
      for (var i in defaults.rewrite_content_types) {
          str = defaults.rewrite_content_types[i];
          if (proxy_response.headers['content-type'].slice(0, str.length) === str) {
              proxy_response.buffer = true;
              return;
          }
      }
    }
  });

  proxy.on('data', function(buffer, request, response, proxy_request, proxy_response) {
    function replaceUrlCallback(match, protocol) {
      return proxy.protocols[protocol].getUrl(request);
    }

    if (proxy_response.buffer) {
      var processBuffer = function (buffer) {
        var string = buffer.toString();
        buffer = new Buffer(string.replace(bodyRegexp, '$1//' + request.headers.host));

        switch (proxy_response.headers['content-encoding']) {
          case 'gzip':
            zlib.gzip(buffer, function(err, encoded) {
              response.end(encoded, 'binary');
            });
            break;
          case 'deflate':
            zlib.deflate(buffer, function(err, encoded) {
              response.end(encoded, 'binary');
            });
            break;
          default:
            response.end(buffer, 'binary');
        }
      };
      switch (proxy_response.headers['content-encoding']) {
        case 'gzip':
          zlib.gunzip(buffer, function(err, decoded) {
            if (err) { response.end('error', 'utf-8'); return }
            processBuffer(decoded);
          });
          break;
        case 'deflate':
          zlib.inflate(buffer, function(err, decoded) {
            if (err) { response.end('error', 'utf-8'); return }
            processBuffer(decoded);
          });
          break;
        default:
          processBuffer(buffer);
      }
    }
  });
}