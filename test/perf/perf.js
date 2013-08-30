(function(){
'use strict';

var framesPerTimerReading = 10;
var maxFrameTimes = 30;

var frameCount = 0;
var frameTimes = [];
var onCompleteHandler;

function trackFrameRate()
{
  var currTime = PerfTestRunner.now();

  if ((frameCount++ % framesPerTimerReading) == 0) {
    // Limit the frame time array to the last 30 frames
    while (frameTimes.length > maxFrameTimes)
      frameTimes.splice(0, 1);

    // Calculate the framerate based upon the difference between the absolute times of the oldest and newest frames,
    // subdivided by how many frames were drawn inbetween.
    var frameRate = framesPerTimerReading * 1000 / ((currTime - frameTimes[0]) / frameTimes.length);
    if (!isNaN(frameRate))
      PerfTestRunner.measureValueAsync(frameRate);

    frameTimes.push(currTime);
  }

  if (testRunning)
    requestAnimationFrame(trackFrameRate);
}

var start = function() {

};

window.Perf = {
  set oncomplete(callback) {
    onCompleteHandler = callback;
  },
  start: start,
};

})();
