(function(){
'use strict';

var disregardFramesCount = 10;
var framesPerReading = 10;
var maxFPSReadings = 10;

var frameCount = 0;
var prevTime;
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
  raf((--disregardFramesCount > 0) ? disregardFrames : initTrackingFrameRate);
}

function initTrackingFrameRate() {
  prevTime = getTime();
  raf(trackFrameRate);
}

function trackFrameRate()
{
  frameCount++;
  if (frameCount % framesPerReading === 0) {
    var currTime = getTime();
    var reading = 1000 * framesPerReading / (currTime - prevTime);
    fpsReadings.push(reading);
    outputReading(reading);
    if (fpsReadings.length >= maxFPSReadings) {
      outputSummary();
      if (typeof onCompleteHandler === 'function') {
        onCompleteHandler();
      }
      return;
    }
    prevTime = currTime;
  }
  raf(trackFrameRate);
}

function output(text) {
  outputElement.value += text;
}

function outputReading(reading) {
  output(reading + ' FPS\n');
}

function outputSummary() {
  var total = 0;
  fpsReadings.forEach(function(reading) { total += reading; });
  output('Average: ' + (total / maxFPSReadings) + ' FPS\n');
}

var start = function() {
  outputElement = document.createElement('textarea');
  outputElement.setAttribute('rows', maxFPSReadings + 5);
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
