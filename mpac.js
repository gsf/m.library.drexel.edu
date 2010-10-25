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
    response.writeHead(200, {'Content-Type': 'text/html'});
    fs.readFile('search.html', function (error, data) {
      if (error) throw error;
      var query = (urlParts.query) ? urlParts.query.q : '';
      var searchPath = '/search~S9?/X'
      if (!query) {
        var locals = {
          query: '',
          count: '',
          full: 'http://innoserv.library.drexel.edu' + searchPath
        };
        response.end(ejs.render(data.toString('utf8'), {locals: locals}));
        return;
      }
      var queryEscaped = querystring.escape(query);
      var searchPath = searchPath + '(' + queryEscaped + ')';
      //console.log('Query: ' + query);
      // range is grabbed from innopac, looks like "51,1036,1036"
      var range = (urlParts.query) ? urlParts.query.r : '';
      var start = 1;
      if (range) {
        // start is the digits in range up to the first comma
        start = range.match(/\d+(?=,)/)[0];
        console.log(start);
        searchPath = searchPath + '&/X(' + queryEscaped + ')&/' + querystring.escape(range) + '/browse';
      } 
      var searchRequest = innoserv.request(
        'GET', searchPath,
        { 'host': 'innoserv.library.drexel.edu' 
        , 'connection': 'keep-alive'
      });
      searchRequest.end();
      searchRequest.on('response', function (searchResponse) {
        //response.write('STATUS: ' + searchResponse.statusCode + '\n');
        //response.write('HEADERS: ' + JSON.stringify(searchResponse.headers) + '\n\n');
        var handler = new htmlparser.DefaultHandler(function (error, dom) {
          if (error) throw error;
          var locals = {
            query: query,
            queryEscaped: queryEscaped,
            count: '',
            prev: '',
            next: '',
            start: start,
            bibs: [],
            full: 'http://innoserv.library.drexel.edu' + searchPath
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
            var citItems = select(dom, 'div.briefcitItems');
            for (var i=0; i < titles.length; i++) {
              var items = [];
              var action = actions[i];
              if (action) {
                if (action.children[0].name === 'a') { 
                  items.push('<a href="' + action.children[0].attribs.href + '">Online resource</a>');
                } else {
                  var entries = select(citItems[i], 'tr.bibItemsEntry');
                  for (var j=0; j < entries.length; j++) {
                    var entry = entries[j];
                    var loc = entry.children[0].children[1].data;
                    try {
                      var call_no = entry.children[1].children[2].children[0].data;
                    } catch (e) {
                      var call_no = '';
                    }
                    var stat = entry.children[2].children[1].data;
                    items.push(loc + ' ' + call_no + ' ' + stat);
                  }
                }
              } else { // handle crazy customized resource
                items.push('<a href="' + titles[i].attribs.href + '">Online resource</a>');
              }
              if (!items.length) {
                items.push('On order.');
              }
              locals.bibs.push({
                title: titles[i].children[0].data,
                items: items
              });
            }
          }
          //console.log('Context: ' + sys.inspect(locals));
          response.end(ejs.render(data.toString('utf8'), {locals: locals}));
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
    });
  } else {
    response.writeHead(404, {'Content-Type': 'text/plain'});
    response.end('404');
  }
});
server.listen(8024);
console.log('Server running at http://127.0.0.1:8024');
