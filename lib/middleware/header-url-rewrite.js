module.exports = createHeaderUrlRewrite;

var url = require('url');

function createHeaderUrlRewrite(proxy, opts) {
  var headerRegexp = new RegExp('^(https?:)\\/\\/' + opts['regex']);

  proxy.on('request_options', function (request, backendOptions) {
    if (opts['mode'] === 'forward') {
        // if the user agent didn't supply the absolute url in the request
        // generate it from what is known.
        if (request.url[0] === '/') {
            // only http requests are sent to the request handler, as https
            // is tunnelled, so can assume this was a http request
            request.url = 'http://' + request.headers['host'] + request.url;
        }
        var requestParts = url.parse(request.url);
        backendOptions.host = requestParts.hostname;
        if (requestParts.port) {
            backendOptions.port = requestParts.port;
        }
        backendOptions.path = requestParts.path;
        backendOptions.protocol = requestParts.protocol;
    } else {
        backendOptions.protocol = opts['backend_protocol'] || request.protocol;
        if (opts['backend_port']) {
            backendOptions.port = opts['backend_port'];
        }
        backendOptions.host = opts['backend_host'];
        backendOptions.path = request.url;
        backendOptions.headers['host'] = opts['backend_host'];
    }
  });

  proxy.on('proxy_response', function (request, response, proxy_request, proxy_response) {
    if (opts['mode'] === 'reverse' && 'location' in proxy_response.headers) {
      proxy_response.headers['location'] = proxy_response.headers['location']
        .replace(headerRegexp, '$1//' + request.headers.host);
    }
  });
}