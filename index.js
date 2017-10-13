var port = process.env.PORT || 80
// for post process
var bodyParser = require('body-parser');
var tty = require('tty.js');
var express = require('express')
var app = express();
var ttyapp = tty.createServer({
  shell: 'bash',
  users:{
  ttn: '8a807116521c1cf1a8ad9db1cb67e874d2040ad0'
  },
  port: 9000
});

app.use(bodyParser.urlencoded({
  extended: true
}));


app.use(bodyParser.json());

app.set('view engine', 'ejs');
// public stuff to /static
app.use('/static', tty.static('public'));

//app.use(ttyx.bodyParser())
// for parsing application/x-www-form-urlencoded
require('./routes')(app);
/**
 * Default error handler
 */
app.use(function(err, req, res, next){
  res.status(404).send('These aren\'t the droids you\'re looking for');
  console.error(err.stack);
});

app.listen(80, ()=>{console.log("Server started at the 80 port.")});
ttyapp.listen();
