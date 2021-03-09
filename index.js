module.paths.unshift('.'); // find our belly button
var app = require('app'),
    port = process.env.PORT || 5000;

app.locals.port = port; // store for later use
if (process.env.DYNO) {
    // running on Heroku
    // Assume public port is 80
    app.locals.port = 80;
}
app.set('port', port);

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});