var fs = require('fs');
var htmlparser = require('htmlparser');
var http = require('http');
//var querystring = require('querystring');
var select = require('soupselect').select;
var sys = require('sys');
var url = require('url');
var ejs = require('ejs');

var innoserv = http.createClient(80, 'innoserv.library.drexel.edu');

var server = http.createServer(function (request, response) {
  console.log('Request from ' + request.url);
  var url_parts = url.parse(request.url);
  if (url_parts.pathname ==='/') {
    // url_parts.query should be the search terms
    var query = url_parts.query || '';
    console.log('Query: ' + query);
    var search_path = '/search~S9?/X(' + query + ')';
    console.log(search_path);
    var search_request = innoserv.request(
      'GET', search_path,
      { 'host': 'innoserv.library.drexel.edu' 
      , 'connection': 'keep-alive'
    });
    search_request.end();
    response.writeHead(200, {'Content-Type': 'text/html'});
    search_request.on('response', function (search_response) {
      //response.write('STATUS: ' + search_response.statusCode + '\n');
      //response.write('HEADERS: ' + JSON.stringify(search_response.headers) + '\n\n');
      var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) response.end(error);
        fs.readFile('results.html', function (error, data) {
          if (error) response.end(error);
          var context = {locals: {
            query: query,
            count: '0 records found.',
            bibs: []
          }};
          var count = select(dom, 'div.browseSearchtoolMessage i')[0];
          console.log('Count: ' + count);
          if (count) {
            context.locals.count = count.children[0].data;
            var titles = select(dom, 'span.briefcitTitle a');
            var actions = select(dom, 'div.briefcitActions');
            var items = select(dom, 'div.briefcitItems');
            context.locals.bibs = [];
            for (var i=0; i < titles.length; i++) {
              bib = {}
              bib.title = titles[i].children[0].data;
              bib.items = []; // TODO: grab actions or items
              context.locals.bibs.push(bib)
              //response.write(titles[i].children[0].data + '\n');
            }
          }
          console.log('Context: ' + sys.inspect(context));
          response.end(ejs.render(data.toString('utf8'), context));
        });
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
