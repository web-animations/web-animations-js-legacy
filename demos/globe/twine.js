/*
 * twine(), where |timing| is a web-animations timing dictionary with extra
 * properties that allow the custom control/ease of arbitrary js objects or dom
 * elements via the web animations API.
 *
 *   context: arbitrary |js-object| or |dom-element| [optional]
 *   timing.onstart: callback |function| when the animation starts [optional]
 *   timing.oniteration: callback |function| on animation iteration [optional]
 *   timing.onend: callback |function| when animation completes [optional]
 *   timing.delay: initial animation delay |float| in seconds [optional]
 *   timing.to: target |object| of context properties to animate [optional]
 *   timing.easing: |string| easing name [optional]
 *   timing.onupdate: callback |function| on animation updates [optional]
 *   duration: animation duration |float| in seconds [optional]
 *
 *  Return a web-animation object with a start() method to start it playing
 *  on the document timeline.
 */

twine = function(context, timing, duration) {
  (timing = timing || {}).iterationDuration = duration || "auto";
  if (timing.easing)
    timing.timingFunction = timing.easing;
  if (timing.delay)
    timing.startDelay = timing.delay;

  var anim = new Animation(context, { sample: onsample }, timing);
  anim.oniteration = timing.oniteration;
  anim.onstart = timing.onstart;
  anim.onend = timing.onend;

  anim._valuesEnd = {};
  for (var property in timing.to)
    if (context && context[property] !== null && timing.to[property] !== null)
      anim._valuesEnd[property] = timing.to[property];

  anim.start = function() {
    anim._valuesStart = {}, anim._valuesDelta = {};
    for (var property in anim._valuesEnd) {
      anim._valuesStart[property] = context[property];
      anim._valuesDelta[property] = anim._valuesEnd[property] - context[property];
    }; return document.timeline.play(anim), anim;
  };

  function onsample(fraction, iteration, context) {
    function customize(fraction) { return { ease: fraction } };
    if (typeof timing.onupdate === 'function')
      fraction = customize(timing.onupdate(fraction, iteration, context)).ease || fraction;
    for (property in anim._valuesDelta)
      context[property] = anim._valuesStart[property] + anim._valuesDelta[property] * fraction;
  }

  anim.stop = function() {
    return anim.player && (anim.player.paused = true), anim;
  };

  return anim;
};
