'use strict';
/**
 * Module dependencies.
 */

require('dotenv').config({silent: true});
const express = require('express');
const http = require('http');
const path = require('path');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const methodOverride = require('method-override');
const errorhandler = require('errorhandler');
// const favicon = require('serve-favicon');
const routes = require('./routes');

const app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
//app.use(favicon(__dirname + ''public/favicon.ico'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(morgan('dev'));
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(bodyParser.json());
app.use(methodOverride(function(req) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    const method = req.body._method;
    delete req.body._method;
    return method;
  }
}));

// development only
if ('development' === app.get('env')) {
  app.use(errorhandler());
}

app.locals.title = 'Signature signatures'; // default title

// Routes

app.get('/', routes.site.index);

app.get('/signatures', routes.signatures.list);
app.post('/signatures', routes.signatures.create);
app.get('/signatures/:hash', routes.signatures.show);
app.post('/signatures/:hash', routes.signatures.edit);
app.delete('/signatures/:hash', routes.signatures.del);

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening at: http://localhost:%d/', app.get('port'));
});
