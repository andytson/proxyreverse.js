module.exports = createXForwarded;


function createXForwarded(proxy) {
  proxy.on('request_options', function (request, backendOptions) {
    if (request.headers['x-forwarded-for']) {
        var addressToAppend = ',' + request.connection.remoteAddress || request.socket.remoteAddress;
        backendOptions.headers['x-forwarded-for'] += addressToAppend;
    } else {
        backendOptions.headers['x-forwarded-for'] = request.connection.remoteAddress || request.socket.remoteAddress;
    }

    if (request.headers['x-forwarded-port']) {
        var portToAppend = ',' + request.connection.remotePort || request.socket.remotePort;
        backendOptions.headers['x-forwarded-port'] += portToAppend;
    } else {
        backendOptions.headers['x-forwarded-port'] = request.connection.remotePort || request.socket.remotePort;
    }

    if (request.headers['x-forwarded-proto']) {
      var protoToAppend = "," + request.protocol.slice(0, -1);
      backendOptions.headers['x-forwarded-proto'] += protoToAppend;
    }
    else {
      backendOptions.headers['x-forwarded-proto'] = request.protocol.slice(0, -1);
    }
  });
}