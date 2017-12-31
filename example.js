var googlehome = require('./google-home-notifier');
var deviceName = 'Chromecast-Audio-xxxxxx';
var ip = 'xx.xx.xx.xx'; // default IP

var express = require('express');
var fs = require('fs');
var app = express();
var bodyParser = require('body-parser');
const MP3URL = '/SpeakMP3/';
var NotifyList = [];

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for parsing application/json

app.on('MyEvent', function(data) {
		console.log("my event "+data);
		if(NotifyList.length){
			SpkType = NotifyList[0].substring(0,4);  // look at first on list, but leave on until we're done...
			SpkWhat = NotifyList[0].substring(4);	 // split the TXT:/URL: from the front
			googlehome.ip(ip);
			if(SpkType == 'URL:'){
				console.log('Speak URL:'+SpkWhat);
				googlehome.play(SpkWhat, function(notifyRes) {
					console.log(notifyRes);
					console.log('finished '+NotifyList.shift());		// now pull the one we just did off
					if(NotifyList.length)app.emit("MyEvent","hello");  // if there's more, do it again
				});
			} else if(SpkType == 'TXT:'){
				console.log('Speak TXT:'+SpkWhat);
				googlehome.notify(SpkWhat, function(notifyRes) {
					console.log(notifyRes);
					console.log('finished '+NotifyList.shift());		// now pull the one we just did off
					if(NotifyList.length)app.emit("MyEvent","hello");  // if there's more, do it again
				});
			} else {
				console.log('unknown type '+SpkType + SpkWhat);
			}
		}
	});

// 
// this gets the request for a MP3 file to play
//
app.get(MP3URL+'*', function(req, res){
    console.log('GET '+MP3URL+'*');
	console.log('path:'+req.path.substring(MP3URL.length)); //  path:/SpeakMP3/file.mp3
	try{
		var html = fs.readFileSync('F:\\Words\\'+req.path.substring(MP3URL.length));
		//                         ^^^^^^^^^^^^^ replace this with where your phrase MP3's are located
		res.writeHead(200);
		res.end(html);
	} catch(err) {
		console.log('GET error: '+err.message);
		res.sendStatus(400);
	}
});

//
// this gets the JSON telling us what MP3 URL to play or what text to say
//
app.post('/', function(req, res){
    console.log('POST /');
	if (!req.body)  res.sendStatus(400);
	if(req.body.SpeakMP3){
		var mp3_url = 'http://xx.xx.xx.xx:8091/SpeakMP3/'+req.body.SpeakMP3;
		//                    ^^^^^^^^^^^^^^^^  replace with IP and Port this code is running on
		console.log('got URL:'+mp3_url);
		NotifyList.push('URL:'+mp3_url);
		console.log("NotifyList is now "+NotifyList.length);
		if(NotifyList.length == 1)app.emit("MyEvent","hello");  // if we just put in the first one, start the chain
	} else if(req.body.SpeakTXT) {
		console.log('got TXT:'+req.body.SpeakTXT);
		NotifyList.push('TXT:'+req.body.SpeakTXT);
		console.log("NotifyList is now "+NotifyList.length);
		if(NotifyList.length == 1)app.emit("MyEvent","hello");  // if we just put in the first one, start the chain
	} else {return res.sendStatus(400);}
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('OK');
});

port = 8091;
app.listen(port);
console.log('Listening at http://toms2:' + port)
