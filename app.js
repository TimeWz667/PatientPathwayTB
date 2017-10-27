
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes');

var app = express();

// Configuration
app.set('port', process.env.OPENSHIFT_NODEJS_PORT || 3000);
//app.use(express.bodyParser());
//app.use(express.methodOverride());
app.use('/static', express.static('public'))
app.set('views', './views')
app.engine('html', require('ejs').renderFile);


app.get('/Index', function(req, res) {res.render('pathway', {});});


// Routes

app.get('/', routes.index);


app.listen(process.env.PORT ||1314, function(){
  console.log("Express server listening on port %d in %s mode", app.settings.env);
});
