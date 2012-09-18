/*
 * Web Animations 'house' demo, SVG Open 2012, Zurich
 */

// 1. SIMPLE ANIMATIONS AND TIMING

// Simple animation
var wave = new Anim($('wave'), { transform: 'translate(-60)' }, 2);

// Adjust timing parameters on the fly
wave.timing.duration = 0.4;
wave.play();

// And another
var sun = new Anim($('sun'), { transform: 'rotate(-40)' }, 0.5);
sun.timing.iterationCount = wave.timing.iterationCount = Infinity;

// More interesting example
var doorOpen = new Anim($('door'), { transform: 'rotateY(-110deg)' }, 2);

// Ease it in
doorOpen.timing.timingFunc = new TimingFunc('ease-in');
doorOpen.play();

// More slowly
doorOpen.timing.timingFunc = new TimingFunc([0, 0, 0.1, 1]);
doorOpen.play();

// Close it
doorOpen.reverse();

// And open it again
doorOpen.reverse();

// 2. ANIMATION GROUPS

// What about a synchronized combination of animations?
// Start with two separate animations
var doorClose =
  new Anim($('door'), { transform: [ 'rotateY(-110deg)', 'rotateY(0deg)' ] },
           { duration: 2, timingFunc: new TimingFunc([0.9, 0, 1, 1])});
var pictureTilting =
  new Anim($('picture'), { transform: 'rotate(-10)' }, 0.15);

// Put them together in sequence
var closeSequence = new SeqAnimGroup([doorClose, pictureTilting]);

// But what if some parts of the animation should happen together?
// E.g. a dust puff
var dustPuff = new Anim($('smoke'), { opacity: [0, 0.8, 0] }, 0.2);

// Put it all together
var doorReaction = new ParAnimGroup([pictureTilting, dustPuff]);
closeSequence.add(doorReaction);
closeSequence.play();

// We can adjust the timing of the parts with delays
// e.g. Make picture tilting a bit of a delayed reaction
pictureTilting.timing.startDelay = 0.4;
closeSequence.play();

// 3. ANIMATING ANYTHING

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
      if (timeFraction === null || timeFraction >= 1 || timeFraction <= 0) {
        this.prevFrequency = null;
        return;
      }

      var written;
      // Check if some data was not written in previous attempts.
      if (this.tail) {
        written =
          this.audio.mozWriteAudio(this.tail.subarray(this.tailPosition));
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
        var k =
          2 * Math.PI * (from + (to - from) * i / (size - 1)) / sampleRate;
        soundData[i] = Math.sin(k * this.currentSoundSample++);
      }
      this.currentSoundSample = this.currentSoundSample % (sampleRate / to);
      this.prevFrequency = frequency;
    }
  };
}
var doorCreak = new Anim(null, new DoorCreakAnimFunc(), 2);

// Now combine with the doorOpen animation
var doorOpenEffect = new ParAnimGroup([doorOpen, doorCreak]);

// Move the easing effect to the group
doorOpenEffect.timing.timingFunc = doorOpen.timing.timingFunc;
doorOpen.timing.timingFunc = null;
doorOpenEffect.play();

// And backwards
doorOpenEffect.reverse();

// 4. TEMPLATES

// Open the door
doorOpenEffect.reverse();

// Grow a sunflower
var growSunflower = new Anim($('sunflower1'),
        { transform: ['scale(0)', 'scale(1)'] },
        { duration: 0.4, timingFunc: new TimingFunc([0, 0, 0.8, 1.4])});

// How about another
var sunflowerTemplate = growSunflower.templatize();
var growSunflower2    = sunflowerTemplate.animate($('sunflower2'));

// And the rest
growSunflower.cancel();
growSunflower2.cancel();
var allTheFlowers =
  sunflowerTemplate.animate(document.querySelectorAll('.sunflower'));

// Put it all together
var openSequence =
  new SeqAnimGroup([doorOpenEffect, new ParAnimGroup(allTheFlowers)]);

// Run the whole thing

var reverseCreak =
  new Anim(null, new DoorCreakAnimFunc(),
           { duration: 2, direction: "reverse" });
closeSequence.splice(0, 0, new ParAnimGroup([doorClose, reverseCreak]));
closeSequence.timing.startDelay = 1;

var wholeAnim = new SeqAnimGroup([openSequence, closeSequence]);
wholeAnim.play();
