var googlehome = require('./google-home-notifier');
var deviceName = 'Kitchen';  // use the name you gave your google device in the Home app.
var ip;			     // don't use IP, that can change, it's DHCP
var express = require('express');
var fs = require('fs');
var app = express();
var bodyParser = require('body-parser');
const MP3URL = '/SpeakMP3/';
var NotifyList = [];
var NotifyDevList = [];

port = 8091;			// port this JSON listener runs on

let localIP;
var os = require('os');
var ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach(function (ifname) {
   var alias = 0;

   ifaces[ifname].forEach(function (iface) {
      if ('IPv4' !== iface.family || iface.internal !== false) {
         // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
         return;
      }

      if(ifname === 'Local Area Connection') {
         if (alias >= 1) {
            // this single interface has multiple ipv4 addresses
            // console.log(ifname + ':' + alias, iface.address);
         } else {
            // this interface has only one ipv4 adress
            // console.log(ifname, iface.address);
         }
         ++alias;
         localIP = iface.address;
      }
   });
});
if(!localIP){
	console.log('warning local IP not defined');
}

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json()); // for parsing application/json

app.on('MyEvent', function(data) {
		console.log("my event "+data);
		if(NotifyList.length){
			SpkType = NotifyList[0].substring(0,4);  // look at first on list, but leave on until we're done...
			SpkWhat = NotifyList[0].substring(4);	 // split the TXT:/URL: from the front
			googlehome.device(NotifyDevList[0]);
			if(SpkType == 'URL:'){
				console.log('Speak URL:'+SpkWhat);
				googlehome.play(SpkWhat, function(notifyRes) {
					console.log(notifyRes);
					console.log('finished '+NotifyList.shift());		// now pull the one we just did off
					NotifyDevList.shift();
					if(NotifyList.length)app.emit("MyEvent","hello");  // if there's more, do it again
				});
			} else if(SpkType == 'TXT:'){
				console.log('Speak TXT:'+SpkWhat);
				googlehome.notify(SpkWhat, function(notifyRes) {
					console.log(notifyRes);
					console.log('finished '+NotifyList.shift());		// now pull the one we just did off
					NotifyDevList.shift();
					if(NotifyList.length)app.emit("MyEvent","hello");  // if there's more, do it again
				});
			} else {
				console.log('unknown type '+SpkType + SpkWhat);
			}
		}
	});

// 
// this gets the request for a MP3 file to play, create a directory containing
// your phrase MP3's, line 82 below has to reference the local path.
//
app.get(MP3URL+'*', function(req, res){
    console.log('GET '+MP3URL+'*');
	console.log('path:'+req.path.substring(MP3URL.length)); //  path:/SpeakMP3/file.mp3
	try{
		var html = fs.readFileSync('F:\\Words\\'+req.path.substring(MP3URL.length));
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
	var d;
    console.log('POST /');
	if (!req.body)  res.sendStatus(400);
	if(req.body.Device){
		console.log("Device specified: "+req.body.Device);
		d = req.body.Device;	// if they specified a device, use that
	} else {
		d = deviceName;			// otherwise use default device
	}
	if(req.body.SpeakMP3){
		var mp3_url = 'http://'+localIP+':'+port+'/SpeakMP3/'+req.body.SpeakMP3;
		console.log('got URL: '+mp3_url);
		NotifyList.push('URL:'+mp3_url);
		NotifyDevList.push(d);
		console.log("NotifyList is now "+NotifyList.length);
		if(NotifyList.length == 1)app.emit("MyEvent","hello");  // if we just put in the first one, start the chain
	} else if(req.body.SpeakTXT) {
		console.log('got TXT: '+req.body.SpeakTXT);
		NotifyList.push('TXT:'+req.body.SpeakTXT);
		NotifyDevList.push(d);
		console.log("NotifyList is now "+NotifyList.length);
		if(NotifyList.length == 1)app.emit("MyEvent","hello");  // if we just put in the first one, start the chain
	} else {return res.sendStatus(400);}
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end('OK');
});

app.listen(port);
console.log('Listening at http://'+localIP+':'+port+'/  POST me a JSON string!');
