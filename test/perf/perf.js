(function(){
'use strict';

var disregardFramesCount = 10;
var framesPerTimeReading = 10;
var maxTimeReadings = 60;
var maxFPSReadings = 31;

var frameCount = 0;
var timeReadings = [];
var fpsReadings = [];
var onCompleteHandler;
var outputElement;

var getTime = (typeof window.performance === 'object' &&
    typeof window.performance.now === 'function') ?
    function() { return window.performance.now(); } :
    function() { return Date.now(); };

var raf = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame ||
    window.mozRequestAnimationFrame ||
    function(callback) { setTimeout(callback, 1000 / 60); };

function disregardFrames() {
  raf((frameCount++ < disregardFramesCount) ? disregardFrames : trackFrameRate);
}

function trackFrameRate()
{
  frameCount++;
  if (frameCount % framesPerTimeReading === 0) {
    timeReadings.splice(0, 0, getTime());
    if (timeReadings.length > maxTimeReadings) {
      timeReadings.pop();
    }
    if (timeReadings.length > 1) {
      var fpsReading = 1000 * (timeReadings.length - 1) * framesPerTimeReading /
          (timeReadings[0] - timeReadings[timeReadings.length - 1]);
      fpsReadings.push(fpsReading);
      outputFPSReading(fpsReading);
      if (fpsReadings.length >= maxFPSReadings) {
        outputSummary();
        if (typeof onCompleteHandler === 'function') {
          onCompleteHandler();
        }
        return;
      }
    }
  }
  raf(trackFrameRate);
}

function output(text) {
  outputElement.value += text;
}

function outputFPSReading(fpsReading) {
  output(fpsReading + ' FPS\n');
}

function outputSummary() {
  var total = 0;
  fpsReadings.forEach(function(fpsReading) { total += fpsReading; });
  var average = total / maxFPSReadings;
  output('Average: ' + average + ' FPS\n');
  var temp = 0;
  fpsReadings.forEach(function(fpsReading) {
    temp += (fpsReading - average) * (fpsReading - average);
  });
  output('Stddev: ' + Math.sqrt(temp / fpsReadings.length) + ' FPS\n');
  fpsReadings.sort();
  output('Min: ' + fpsReadings[0] + ' FPS\n');
  output('Max: ' + fpsReadings[fpsReadings.length - 1] + ' FPS\n');
  if (fpsReadings.length % 2 === 0) {
    output('Median: ' + ((fpsReadings[fpsReadings.length >> 1] +
        fpsReadings[(fpsReadings.length >> 1) + 1]) / 2) + ' FPS\n');
  } else {
    output('Median: ' + fpsReadings[fpsReadings.length >> 1] + ' FPS\n');
  }

}

var start = function() {
  outputElement = document.createElement('textarea');
  outputElement.setAttribute('rows', maxFPSReadings + 6);
  outputElement.setAttribute('cols', 32);
  document.body.appendChild(outputElement);

  output('Disregarding initial ' + disregardFramesCount + ' frames.\n')
  raf(disregardFrames);
};

window.Perf = {
  set oncomplete(callback) {
    onCompleteHandler = callback;
  },
  start: start,
};

})();
