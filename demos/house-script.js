/*
 * Web Animations 'house' demo, SVG Open 2012, Zurich
 */

var a = new Anim($('wave'), { transform: 'translate(-60)' }, 2);
a.timing.iterationCount = 3;
a.timing.duration = 0.4;

// XXX This is generating errors for some values
var sun = new Anim($('sun'), { transform: 'rotate(-40deg)' }, { iterationCount: 6, duration: 0.5 });

var doorOpen = new Anim($('door'), { transform: 'rotateY(-110deg)' }, 2);

// Ease it in
doorOpen.timing.timingFunc = new TimingFunc('ease-in');
doorOpen.play();

// More slowly
doorOpen.timing.timingFunc = new TimingFunc([0, 0, 0.1, 1]);
doorOpen.play();

// Close it
doorOpen.reverse();

var doorClose = new Anim($('door'), { transform: [ 'rotateY(-110deg)', 'rotate(0deg)' ] }, { duration: 2, timingFunc: new TimingFunction([0.9, 0, 1, 1])});
var pictureTilting = new Anim($('picture'), { transform: 'rotate(-10)' }, 0.15);

var closeSequence = new SeqAnimGroup([doorClose, pictureTilting]);

var dustPuff = new Anim($('smoke'), { opacity: [0, 0.8, 0] }, 0.2);

// Put it all together
var doorReaction = new ParAnimGroup([pictureTilting, dustPuff]);
closeSequence.add(doorReaction);
closeSequence.play();

// Make picture tilting a bit of a delay reaction
pictureTilting.timing.startDelay = 0.3;
closeSequence.play();

// Use a custom anim func
//
// The audio part of the following is based on:
// https://wiki.mozilla.org/Audio_Data_API
function DoorCreakAnimFunc() {
  var sampleRate = 44100;
  
  var audio = new Audio();
  audio.mozSetup(1, sampleRate);
  
  return {
    audio: audio,
    tail: null,
    currentWritePosition: 0,
    currentSoundSample: 0,
    prebufferSize: sampleRate / 5,
    tailPosition: 0,
    prevFrequency: null,
   
    sample: function(timeFraction, currentIteration, target) {
      if (timeFraction === null || timeFraction >= 1) {
        this.prevFrequency = null;
        return;
      }
      
      var written;
      // Check if some data was not written in previous attempts.
      if (this.tail) {
        written = this.audio.mozWriteAudio(this.tail.subarray(this.tailPosition));
        this.currentWritePosition += written;
        this.tailPosition += written;
        if (this.tailPosition < this.tail.length) {
          // Not all the data was written, saving the tail...
          return; // ... and exit the function.
        }
        this.tail = null;
      }

      // Check if we need add some data to the audio output.
      var currentPosition = this.audio.mozCurrentSampleOffset();
      var available = currentPosition + this.prebufferSize -
                      this.currentWritePosition;
      if (available > 0) {
        // Request some sound data from the callback function.
        var soundData = new Float32Array(available);
        this.requestSoundData(soundData, timeFraction * 400 + 110);

        // Writing the data.
        written = this.audio.mozWriteAudio(soundData);
        if (written < soundData.length) {
          // Not all the data was written, saving the tail.
          this.tail = soundData;
          this.tailPosition = written;
        }
        this.currentWritePosition += written;
      }
    },
    requestSoundData: function(soundData, frequency) {
      var from = this.prevFrequency ? this.prevFrequency : frequency;
      var to = frequency;
      var k = 2 * Math.PI * to / sampleRate;
      for (var i=0, size=soundData.length; i<size; i++) {
        var k = 2 * Math.PI * (from + (to - from) * i / (size - 1)) / sampleRate;
        soundData[i] = Math.sin(k * this.currentSoundSample++);
      }
      this.currentSoundSample = this.currentSoundSample % (sampleRate / to);
      this.prevFrequency = frequency;
    }
  };
}
var doorCreak = new Anim(null, new DoorCreakAnimFunc(), 2);

// Now combine with the doorOpen animation
doorOpen.reverse();
var group = new ParAnimGroup([doorOpen, doorCreak]);

// Move the easing effect to the group
group.timing.timingFunc = doorOpen.timing.timingFunc;
doorOpen.timing.timingFunc = null;
group.play();

// And backwards
group.reverse();

// Templates
// Sunflower animation
//   -- make one grow
//   -- call templatize()
//   -- apply to another
//   -- apply to a selector (i.e. all sunflowers)
//   -- iterate over and adjust start times
//   -- put them in a group
//   -- create a door open sequence
// Go back to dust puff and explain???

// Animation group templates
// -- reveal mouse door
// -- generate template from doorOpen to open the mouse door
// -- generate template from doorClose sequence and apply to mouse door?
// -- hide mouse door

// Run the whole thing

// Show visualisation

// Declarative syntax for the whole thing
