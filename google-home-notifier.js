var Client = require('castv2-client').Client;
var DefaultMediaReceiver = require('castv2-client').DefaultMediaReceiver;
var mdns = require('mdns');
var browser = mdns.createBrowser(mdns.tcp('googlecast'));
var deviceAddress;
var language;
var CastStatus = 'DONE'; // added
var primed = 0;

var device = function(name, lang = 'en') {
    device = name;
    language = lang;
    return this;
};

var ip = function(ip) {
  deviceAddress = ip;
  return this;
}

var googletts = require('google-tts-api');
var googlettsaccent = 'us';
var accent = function(accent) {
  googlettsaccent = accent;
  return this;
}

var notify = function(message, callback) {
  if (!deviceAddress){
    browser.start();
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(device.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getSpeechUrl(message, deviceAddress, function(res) {
          callback(res);
        });
      }
      browser.stop();
    });
  }else {
    getSpeechUrl(message, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var play = function(mp3_url, callback) {
  if (!deviceAddress){
    browser.start();
    browser.on('serviceUp', function(service) {
      console.log('Device "%s" at %s:%d', service.name, service.addresses[0], service.port);
      if (service.name.includes(device.replace(' ', '-'))){
        deviceAddress = service.addresses[0];
        getPlayUrl(mp3_url, deviceAddress, function(res) {
          callback(res);
        });
      }
      browser.stop();
    });
  }else {
    getPlayUrl(mp3_url, deviceAddress, function(res) {
      callback(res);
    });
  }
};

var getSpeechUrl = function(text, host, callback) {
  googletts(text, language, 1, 1000, googlettsaccent).then(function (url) {
console.log(url);
    onDeviceUp(host, url, function(res){
      callback(res)
    });
  }).catch(function (err) {
    console.error(err.stack);
  });
};

var getPlayUrl = function(url, host, callback) {
    onDeviceUp(host, url, function(res){
      callback(res)
    });
};

var onDeviceUp = function(host, url, callback) {
  var client = new Client();
  client.connect(host, function() {
    client.launch(DefaultMediaReceiver, function(err, player) {

      var media = {
        contentId: url,
        contentType: 'audio/mp3',
        streamType: 'BUFFERED' // or LIVE
      };
	  primed = 0;
	  CastStatus = "DONE"
	  player.load(media, { autoplay: true }, function(err, status) {
		//client.close();
		if(err !== null && typeof err === 'object'){
			console.log('Device notified error:'+err.message);
			if(err.message=='Load failed'){primed = 0;CastStatus = "DONE";callback('Device done');}
		}
	  });
	  // added status
		player.on('status', status => {
			if(status !== null && typeof status === 'object'){
				console.log('status broadcast player State=%s primed=%i', status.playerState,primed);
				CastStatus = status.playerState;
				if((status.playerState == "IDLE") && (primed ==1) ){primed = 0;CastStatus = "DONE";callback('Device done');}
				if(status.playerState == "BUFFERING")primed = 1;
			}
		});
		player.on('close', function(){console.log('player close');client.close();});
		player.on('error', function(){console.log('player error');});
    });
  });

  client.on('error', function(err) {
    console.log('Error: %s', err.message);
    client.close();
    callback('error');
  });
  
	client.on('close', ()  => {
		console.info("Client Closed");

	});
  
};

exports.ip = ip;
exports.device = device;
exports.accent = accent;
exports.notify = notify;
exports.play = play;
exports.CastStatus = CastStatus;
