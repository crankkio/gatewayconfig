var express = require('express');
var app = express();
var port = process.env.PORT || 80

var ttyx = require('tty.js');

var app = ttyx.createServer({
  shell: 'bash',
  port: 80
});



app.set('view engine', 'ejs');
// public stuff to /static
 app.use('/static', express.static('public'));

// for post process
var bodyParser = require('body-parser');
app.use(bodyParser.json());
// for parsing application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({
  extended: true
}));

require('./routes')(app);
/**
 * Default error handler
 */
app.use(function(err, req, res, next){
  res.status(404).send('These aren\'t the droids you\'re looking for');
  console.error(err.stack);
});

app.listen();
