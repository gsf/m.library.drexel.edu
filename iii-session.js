var http = require('http');
var sys = require('sys');

var EXTPATID = '';
var EXTPATPW = '';

var iii = http.createClient(443, 'innoserv.library.drexel.edu', true);

var server = http.createServer(function (request, response) {
  var sessionID_request = iii.request('GET', '/', 
    { 'host': 'innoserv.library.drexel.edu' 
    , 'connection': 'keep-alive'
    , 'cookie': 'III_EXPT_FILE=aa6301'
  });
  sessionID_request.end();
  response.writeHead(200, {'Content-Type': 'text/plain'});
  sessionID_request.on('response', function (sessionID_response) {
    response.write('/ STATUS: ' + sessionID_response.statusCode + '\n');
    response.write('/ HEADERS: ' + JSON.stringify(sessionID_response.headers) + '\n\n');
    var cookies = sessionID_response.headers['set-cookie'];
    var start = cookies.indexOf("III_SESSION_ID") + 15;
    var end = cookies.indexOf(";", start);
    var sessionID = cookies.substring(start, end);
    sessionID_response.on('end', function () {
      var login_request = iii.request('POST', '/patroninfo',
        { 'host': 'innoserv.library.drexel.edu' 
        , 'connection': 'keep-alive'
        , 'cookie': 'III_EXPT_FILE=aa6301; III_SESSION_ID=' + sessionID
      });
      login_request.end('extpatid=' + EXTPATID + '&extpatpw=' + EXTPATPW + '&submit=submit');
      login_request.on('response', function (login_response) {
        response.write('/patroninfo STATUS: ' + login_response.statusCode + '\n');
        response.write('/patroninfo HEADERS: ' + JSON.stringify(login_response.headers) + '\n\n');
        var patronID = login_response.headers['location'].substring(15, 22);
        var mylists_url = '/patroninfo/' + patronID + '/mylists';
        login_response.on('end', function () {
          var mylists_request = iii.request('GET', mylists_url,
            { 'host': 'innoserv.library.drexel.edu' 
            , 'connection': 'keep-alive'
            , 'cookie': 'III_EXPT_FILE=aa6301; III_SESSION_ID=' + sessionID
          });
          mylists_request.end();
          mylists_request.on('response', function (mylists_response) {
            response.write(mylists_url + ' STATUS: ' + mylists_response.statusCode + '\n');
            response.write(mylists_url + ' HEADERS: ' + JSON.stringify(mylists_response.headers) + '\n');
            mylists_response.on('data', function (chunk) {
              response.write(mylists_url + ' BODY: \n\n' + chunk);
            });
            mylists_response.on('end', function () {
              response.end();
            });
          });
        });
      });
    });
  });
});
server.listen(8024);
console.log('Server running at http://127.0.0.1:8124');
