# ProxyReverse

ProxyReverse acts as a reverse proxy, with a simple command-line interface so
you can run it anywhere without having to worry about configuration files.

It can be used, for instance, to reverse proxy a local VM to the host computer
automatically rewriting Host, Location and Set-Cookie headers, and rewrite html
assets to appear served from the host computer.

## Installation

ProxyReverse is a tool that runs on the command line.

On any system with [nodejs] and [npm] installed, open your terminal
and type:

    $ npm install proxyreverse

Create a SSL server key and certificate, for example a self-signed one:

    $ openssl req -nodes -new -x509 -keyout server-key.pem -out server-cert.pem -days 360

## Usage

Assuming that you are running your local web-server on a VM with a host-only
interface with local access via http://my.dev/

    $ proxyreverse 8080,8443 my.dev
    http://my.dev is now available via: http://localhost:8080
    https://my.dev is now available via: https://localhost:8443

Now you can open this link in your favorite browser and request will
be proxied to your my.dev serer.

If your domain uses sub-domains for assets, proxyreverse can be told to rewrite
them as well, using:

   $ proxyreverse -s 8080,8443 my.dev

If your domain's SSL certificate is invalid, connections to it will fail, invalid
certificates can be ignored using the --insecure (or -k) option on the command line:

   $ proxyreverse -sk 8080,8443 my.dev


[nodejs]: http://nodejs.org/download/
[github]: https://github.com/andytson/proxyremote.js


## Known issues

* Transitioning from http to https (or vice versa) via http redirects fails.