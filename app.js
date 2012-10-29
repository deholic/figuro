
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , figuro = require('./figuro')
  , http = require('http')
  , path = require('path')
  , fs = require('fs');

var app = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'ejs');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.static(path.join(__dirname, 'static')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.get('/', routes.index);
app.get('/:identifier', figuro.getUploadedImage);
app.post('/upload', figuro.uploadImage);

http.createServer(app).listen(app.get('port'), function(){
  figuro.initialize();
  console.log("Express server listening on port " + app.get('port'));
});