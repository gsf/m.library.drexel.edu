var htmlparser = require('htmlparser');
var http = require('http');
var select = require('soupselect').select;
var sys = require('sys');
var url = require('url');

var innoserv = http.createClient(80, 'innoserv.library.drexel.edu');

var server = http.createServer(function (request, response) {
  console.log('Request from ' + request.url);
  var url_parts = url.parse(request.url);
  if (url_parts.pathname ==='/') {
    // url_parts.query should be searcharg=blah+blah
    var search_path = '/search~S9/?searchtype=X&' + url_parts.query;
    console.log(search_path);
    var search_request = innoserv.request(
      'GET', search_path,
      { 'host': 'innoserv.library.drexel.edu' 
      , 'connection': 'keep-alive'
    });
    search_request.end();
    response.writeHead(200, {'Content-Type': 'text/plain'});
    search_request.on('response', function (search_response) {
      //response.write('STATUS: ' + search_response.statusCode + '\n');
      //response.write('HEADERS: ' + JSON.stringify(search_response.headers) + '\n\n');
      var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) {
          response.end(error);
        } else {
          var resultCount = select(dom, 'div.browseSearchtoolMessage i')[0];
          if (resultCount) {
            response.end(resultCount.children[0].data);
          } else {
            response.end('0 results found.');
          }
          //response.end(JSON.stringify(dom));
        }
      }
      , {verbose: false, ignoreWhitespace: true}
      );
      var parser = new htmlparser.Parser(handler);
      search_response.on('data', function (chunk) {
        parser.parseChunk(chunk);
      });
      search_response.on('end', function () {
        parser.done();
      });
    });
  } else {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.end('404');
  }
});
server.listen(8024);
console.log('Server running at http://127.0.0.1:8024');
