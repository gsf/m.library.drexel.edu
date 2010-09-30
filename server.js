var dgram = require('dgram'),
    exec = require('child_process').exec,
    http = require('http'),
    querystring = require('querystring'),
    sys = require('sys'),
    url = require('url');

// Log to syslog
var socket = dgram.createSocket('unix_dgram');
var log = function (message) {
  buffer = new Buffer('node[' + process.pid + ']: ' + message);
  socket.send(buffer, 0, buffer.length, '/dev/log',
    function (err, bytes) {
      if (err) {
        throw err;
      }
    console.log('Wrote ' + bytes + ' bytes to the socket.');
    }
  );
};

http.createServer(function (request, response) {
  var url_parts = url.parse(request.url);
  if (url_parts.pathname ==='/') {
    response.writeHead(200, {'Content-Type': 'text/plain'});
    response.end('200');
  } else {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.end('404');
  }
}).listen(8024);

log('Server running');
