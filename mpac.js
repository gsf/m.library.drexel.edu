var fs = require('fs');
var htmlparser = require('htmlparser');
var http = require('http');
var querystring = require('querystring');
var select = require('soupselect').select;
var sys = require('sys');
var url = require('url');
var ejs = require('ejs');

var innoserv = http.createClient(80, 'innoserv.library.drexel.edu');

var server = http.createServer(function (request, response) {
  console.log('Request from ' + request.url);
  var urlParts = url.parse(request.url, true);
  if (urlParts.pathname ==='/') {
    var query = (urlParts.query) ? urlParts.query.q : '';
    var queryEscaped = querystring.escape(query);
    //console.log('Query: ' + query);
    // range is grabbed from innopac, looks like "51,1036,1036"
    var range = (urlParts.query) ? urlParts.query.r : '';
    var rangeEscaped = querystring.escape(range);
    var start = 1;
    var searchPath = '/search~S9?/X(' + queryEscaped + ')';
    if (range) {
      // start is the digits in range up to the first comma
      start = range.match(/\d+(?=,)/)[0];
      console.log(start);
      searchPath = '/search~S9?/X(' + queryEscaped + ')&/X(' + queryEscaped + ')&/' + rangeEscaped + '/browse';
    } 
    console.log(searchPath);
    var searchRequest = innoserv.request(
      'GET', searchPath,
      { 'host': 'innoserv.library.drexel.edu' 
      , 'connection': 'keep-alive'
    });
    searchRequest.end();
    response.writeHead(200, {'Content-Type': 'text/html'});
    searchRequest.on('response', function (searchResponse) {
      //response.write('STATUS: ' + searchResponse.statusCode + '\n');
      //response.write('HEADERS: ' + JSON.stringify(searchResponse.headers) + '\n\n');
      var handler = new htmlparser.DefaultHandler(function (error, dom) {
        if (error) response.end(error);
        fs.readFile('search.html', function (error, data) {
          if (error) response.end(error);
          var locals = {
            query: query,
            queryEscaped: queryEscaped,
            count: '',
            prev: '',
            next: '',
            start: start,
            // TODO titles needs to be a list in case two
            // titles are the same -- for (x in list) { list[x] }
            titles: {}
          };
          var count = select(dom, 'td.browseHeaderData')[0];
          if (query && !count) {
            locals.count = 'No records found.';
          }
          //console.log('Count: ' + count);
          if (count) {
            locals.count = count.children[0].data.match(/\((.+)\)/)[1];
            var pages = select(dom, 'td.browsePager a');
            var rangeRe = /\/([^\/]+)%2CB\/browse/;
            pages.forEach(function (p) {
              if (p.children[0].data === 'Prev') {
                locals.prev = p.attribs.href.match(rangeRe)[1];
              } else if (p.children[0].data === 'Next') {
                locals.next = p.attribs.href.match(rangeRe)[1];
              }
            });
            var titles = select(dom, 'span.briefcitTitle a');
            var actions = select(dom, 'div.briefcitActions');
            var items = select(dom, 'div.briefcitItems');
            for (var i=0; i < titles.length; i++) {
              var title = titles[i].children[0].data;
              var items = []; // TODO: grab actions or items
              locals.titles[title] = items;
            }
          }
          //console.log('Context: ' + sys.inspect(locals));
          response.end(ejs.render(data.toString('utf8'), {locals: locals}));
        });
      }
      , {verbose: false, ignoreWhitespace: true}
      );
      var parser = new htmlparser.Parser(handler);
      searchResponse.on('data', function (chunk) {
        parser.parseChunk(chunk);
      });
      searchResponse.on('end', function () {
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
