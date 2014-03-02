module.exports = createCookieDomainRewrite;

var Cookie = require('tough-cookie').Cookie;

function createCookieDomainRewrite(proxy, opts) {
  var domainRegexp = new RegExp('^' + opts['regex'] + '$');

  proxy.on('proxy_response', function (request, response, proxy_request, proxy_response) {
    if (opts['mode'] === 'reverse' && 'set-cookie' in proxy_response.headers) {
      if (proxy_response.headers['set-cookie'] instanceof Array)
        cookies = proxy_response.headers['set-cookie'].map(function (c) { return (Cookie.parse(c)); });
      else
        cookies = [Cookie.parse(proxy_response.headers['set-cookie'])];

      cookies = cookies.map(function (cookie) {
        if (cookie.domain !== null) {
          cookie.domain = cookie.domain.replace(domainRegexp, request.headers.host.replace(/:.*/, ''));

          // localhost doesn't support explicit cookie domains, so remove the
          // domain from the set-cookie.
          if (cookie.domain === 'localhost') {
             cookie.domain = null;
          }
        }
        return cookie.toString(); 
      });
      proxy_response.headers['set-cookie'] = cookies;
    }
  });
}