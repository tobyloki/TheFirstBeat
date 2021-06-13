var AudioContext = require("web-audio-api").AudioContext;
var sound = require("sound-play");
var MusicTempo = require("music-tempo");
var fs = require("fs");
var filepath = "C:/Users/Alex/Downloads/70bpm.mp3"

const SerialPort = require('serialport');
const port = new SerialPort('COM3', { baudRate: 9600 });

function trim_beats(beats, offset) {
    var count = 0
    for (i = 1; i<beats.length; i++){
        if(beats[i] - beats[i-1] < offset){
            // console.log("Removing " + beats[i] + ", previous beat was: "+ beats[i-1])
            beats.splice(i, 1); 
            count++;
            // console.log("Now it is:" + beats[i])
        }
    }
    console.log("Removed beats = "+ count);
    return beats;
}

function time_differince(beats){
    var diffs = []
    for (i = 1; i<beats.length; i++){
        diffs.push(beats[i] - beats[i-1]);
    }
    return diffs;
}

var calcTempo = function (buffer) {
  var audioData = [];
  // Take the average of the two channels
  if (buffer.numberOfChannels == 2) {
    var channel1Data = buffer.getChannelData(0);
    var channel2Data = buffer.getChannelData(1);
    var length = channel1Data.length;
    for (var i = 0; i < length; i++) {
      audioData[i] = (channel1Data[i] + channel2Data[i]) / 2;
    }
  } else {
    audioData = buffer.getChannelData(0);
  }
  var mt = new MusicTempo(audioData);
  console.log(mt.tempo)
  new_beats = trim_beats(mt.beats, 0.75);
	timeDiffBeats = time_differince(new_beats);
	// timeDiffBeats = timeDiffBeats.slice(0, 100);

  port.write(JSON.stringify({
    "command": "start"
  }) + '\n');

  // port.write(JSON.stringify({
  //   "command": "beats",
  //   "beat": new_beats[0]
  // }) + '\n');

  for(let x=0; x<timeDiffBeats.length; x++){
    setTimeout(() => {
      let beat = timeDiffBeats[x+1];

      if(beat != null){
        console.log(`hit: ${Date.now()}, next beat: ${beat}`)
        port.write(JSON.stringify({
          "command": "beats",
          "beat": beat
        }) + '\n');
      }
		}, new_beats[x] * 1000);
  }
	
  sound.play(filepath);
};

var data = fs.readFileSync(filepath);

var context = new AudioContext();
context.decodeAudioData(data, calcTempo);

port.on('open', () => {
	console.log('Serial port open');
});