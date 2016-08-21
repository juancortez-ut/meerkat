var express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	fs = require('fs'),
    request = require('request'),
    favicon = require('serve-favicon'),
    redis = require('redis'),
    router = express.Router(),
    compression = require('compression'),
    privateCredentials = require('./private_credentials/credentials.json'),
    redisCredentials = privateCredentials.redis.credentials,
    redis_connect = require("./redis/redis.js"),
    socket_connect = require("./socket/socket.js"),
    socket = require('socket.io'),
    config = require('config');

/************************************************************************************************************
*                                   Redis Database Connection
************************************************************************************************************/
var client = redis.createClient(redisCredentials.port, redisCredentials.hostname, {no_ready_check: true});
app.set('redis', client); 
client.auth(redisCredentials.password, function (err) {
    if (err){
    	console.error(err);
    }
});
client.on('connect', function() {
    redis_connect.onRedisConnection(client, redis);
});

/************************************************************************************************************
*                                  Express App Configuration
************************************************************************************************************/
app.use(compression()); //use compression 
app.use(express.static(__dirname + '/public', { maxAge: 604800000 /* 7d */ })); // 1d = 86400000
app.use(bodyParser.json()); // to support JSON-encoded bodies
app.use(bodyParser.urlencoded({ // to support URL-encoded bodies
    extended: true
}));
app.use(favicon(__dirname + '/public/assets/shpe_austin_icon.png'));
require('./router/main')(app, client); // adds the main.js file to send response to browser
app.set('views', __dirname + '/views'); // defines where our HTML files are placed
app.set('view engine', 'ejs'); // used for HTML rendering
app.engine('html', require('ejs').__express); // rendering HTML files through EJS


/************************************************************************************************************
*                                  BlueMix Configurations
************************************************************************************************************/
// cfenv provides access to your Cloud Foundry environment
// for more info, see: https://www.npmjs.com/package/cfenv
var cfenv = require('cfenv');

// get the app environment from Cloud Foundry
var appEnv = cfenv.getAppEnv();

// start server on the specified port and binding host
var server = app.listen(appEnv.port, '0.0.0.0', function() {
    console.log("Server starting on " + appEnv.url);
});

/************************************************************************************************************
*                                  Web Socket Configuration
************************************************************************************************************/
var io = socket.listen(server);
socket_connect.initiateSocket(io, client);

/************************************************************************************************************
*                                  BotKit Configuration
* SHPE-Austin Slack Integrations: https://shpeaustin.slack.com/apps/manage/custom-integrations
************************************************************************************************************/
var Botkit = require('botkit'),
    slackConfig = config.slack;

var controller = Botkit.slackbot({
  debug: false
});

// connect the bot to a stream of messages
var bot = controller.spawn({
  token: slackConfig.botToken,
  incoming_webhook:{
    url: slackConfig.subscribeRequestWebHook
  }
}).startRTM();

app.set('bot', bot); 
require('./slackbot/slack.js')(controller, client); // Listen to different requests
