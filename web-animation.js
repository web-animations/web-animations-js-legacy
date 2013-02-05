/**
 * Copyright 2012 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and

 * limitations under the License.
 */
(function() {

var inherits = function(child, parent) {
  var tmp = function() {};
  tmp.prototype = parent.prototype;
  child.$super = parent;
  child.prototype = new tmp();
  child.prototype.constructor = child;
};

var mixin = function(target, source) {
  for (var k in source) {
    target[k] = source[k];
  }
};

var strip = function(str) {
  return str.replace(/^\s+/, '').replace(/\s+$/, '');
};

var IndexSizeError = function(message) {
  IndexSizeError.$super.call(this);
  this.name = "IndexSizeError";
  this.message = message;
}

inherits(IndexSizeError, Error);

/** @constructor */
var Timing = function(timingDict) {
  this.startDelay = timingDict.startDelay || 0.0;
  this.duration = timingDict.duration;
  if (this.duration < 0.0) {
    throw new IndexSizeError('duration must be >= 0');
  }
  this.iterationCount = isDefined(timingDict.iterationCount) ?
      timingDict.iterationCount : 1.0;
  if (this.iterationCount < 0.0) {
    throw new IndexSizeError('iterationCount must be >= 0');
  }
  this.iterationStart = timingDict.iterationStart || 0.0;
  if (this.iterationStart < 0.0) {
    throw new IndexSizeError('iterationStart must be >= 0');
  }
  this.playbackRate = isDefined(timingDict.playbackRate) ?
      timingDict.playbackRate : 1.0;
  //this.playbackRate = timingDict.playbackRate || 1.0;
  this.direction = timingDict.direction || 'normal';
  if (typeof timingDict.timingFunction === 'string') {
    this.timingFunction =
        TimingFunction.createFromString(timingDict.timingFunction);
  } else {
    this.timingFunction = timingDict.timingFunction;
  }
  this.fillMode = timingDict.fillMode || 'forwards';
};

mixin(Timing.prototype, {
  // TODO: Is this supposed to be public?
  clone: function() {
    return new Timing({
      startDelay: this.startDelay,
      duration: this.duration,
      iterationCount: this.iterationCount,
      iterationStart: this.iterationStart,
      playbackRate: this.playbackRate,
      direction: this.direction,
      timingFunction: this.timingFunction ? this.timingFunction.clone() : null,
      fillMode: this.fillMode
    });
  },
});

/** @constructor */
var TimingProxy = function(timing, setter) {
  this._timing = timing;
  this._setter = setter;
};

['startDelay', 'duration', 'iterationCount', 'iterationStart', 'playbackRate',
    'direction', 'timingFunction', 'fillMode'].forEach(function(s) {
  TimingProxy.prototype.__defineGetter__(s, function() {
    return this._timing[s];
  });
  TimingProxy.prototype.__defineSetter__(s, function(v) {
    var old = this._timing[s];
    this._timing[s] = v;
    try {
      this._setter(v);
    } catch (e) {
      this._timing[s] = old;
      throw e;
    }
  });
});

mixin(TimingProxy.prototype, {
  extractMutableTiming: function() {
    return new Timing({
      startDelay: this._timing.startDelay,
      duration: this._timing.duration,
      iterationCount: this._timing.iterationCount,
      iterationStart: this._timing.iterationStart,
      playbackRate: this._timing.playbackRate,
      direction: this._timing.direction,
      timingFunction: this._timing.timingFunction ?
                  this._timing.timingFunction.clone() : null,
      fillMode: this._timing.fillMode
    });
  },
  clone: function() {
    return this._timing.clone();
  }
});

var isDefined = function(val) {
  return typeof val !== 'undefined';
};

var isDefinedAndNotNull = function(val) {
  return isDefined(val) && (val !== null);
};

var ST_MANUAL = 0;
var ST_AUTO = 1;
var ST_FORCED = 2;

/** @constructor */
var TimedItem = function(timing, startTime, parentGroup) {
  this.timing = new TimingProxy(interpretTimingParam(timing), function() {
    this._updateInternalState();
  }.bind(this));
  this._startTime = startTime;
  this.currentIteration = null;
  this.iterationTime = null;
  this.animationTime = null;
  this._reversing = false;

  // Note that we don't use the public setter, because we call _addInternal()
  // below.
  if (parentGroup === this) {
    throw new Error('parentGroup can not be set to self!');
  }
  this._parentGroup = this._sanitizeParent(parentGroup);

  if (!isDefined(startTime)) {
    this._startTimeMode = ST_AUTO;
    // We take _effectiveParentTime at the moment this TimedItem is
    // created. Note that the call to _addChild() below may cause the parent
    // to update its timing properties, including its iterationTime.
    this._startTime = this._effectiveParentTime;
  } else {
    this._startTimeMode = ST_MANUAL;
    this._startTime = startTime;
  }

  this._timeDrift = 0;
  this._locallyPaused = false;

  if (this.parentGroup) {
    this.parentGroup._addInternal(this);
  }
  this._updateInternalState();
  this._pauseStartTime = 0;
};

TimedItem.prototype.__defineGetter__('timeDrift', function() {
  if (this.locallyPaused) {
    return this._effectiveParentTime - this.startTime -
        this._pauseStartTime;
  }
  return this._timeDrift;
});
TimedItem.prototype.__defineGetter__('_effectiveParentTime', function() {
  return this.parentGroup !== null && this.parentGroup.iterationTime !== null ?
      this.parentGroup.iterationTime : 0;
});
TimedItem.prototype.__defineGetter__('currentTime', function() {
  return this._effectiveParentTime - this._startTime - this.timeDrift;
});
TimedItem.prototype.__defineSetter__('currentTime', function(seekTime) {
  if (this._locallyPaused) {
    this._pauseStartTime = seekTime;
  } else {
    this._timeDrift = this._effectiveParentTime - this._startTime -
        seekTime;
  }
  this._updateTimeMarkers();
});
TimedItem.prototype.__defineGetter__('startTime', function() {
  return this._startTime;
});
TimedItem.prototype.__defineSetter__('startTime', function(newStartTime) {
  if (this.parentGroup && this.parentGroup.type === 'seq') {
    throw new Error('NoModificationAllowedError');
  }
  this._startTime = newStartTime;
  this._startTimeMode = ST_MANUAL;
  this._updateInternalState();
});
TimedItem.prototype.__defineGetter__('locallyPaused', function() {
  return this._locallyPaused;
});
TimedItem.prototype.__defineSetter__('locallyPaused', function(newVal) {
  if (this._locallyPaused === newVal) {
    return;
  }
  if (this._locallyPaused) {
    this._timeDrift = this._effectiveParentTime - this.startTime -
        this._pauseStartTime;
  } else {
    this._pauseStartTime = this.currentTime;
  }
  this._locallyPaused = newVal;
  this._updateTimeMarkers();
});
TimedItem.prototype.__defineGetter__('paused', function() {
  return this.locallyPaused ||
      (isDefinedAndNotNull(this.parentGroup) && this.parentGroup.paused);
});
TimedItem.prototype.__defineSetter__('duration', function(duration) {
  this._duration = duration;
  this._updateInternalState();
});
TimedItem.prototype.__defineGetter__('duration', function() {
  return isDefined(this._duration) ?
      this._duration : (isDefined(this.timing.duration) ?
          this.timing.duration : this._intrinsicDuration());
});
TimedItem.prototype.__defineSetter__('animationDuration',
    function(animationDuration) {
  this._animationDuration = animationDuration;
  this._updateInternalState();
});
TimedItem.prototype.__defineGetter__('animationDuration', function() {
  if (isDefined(this._animationDuration)) {
    return this._animationDuration;
  }
  var repeatedDuration = this.duration * this.timing.iterationCount;
  return repeatedDuration / Math.abs(this.timing.playbackRate);
});
TimedItem.prototype.__defineSetter__('endTime', function() {
  throw new Error('NoModificationAllowedError');
});
TimedItem.prototype.__defineGetter__('endTime', function() {
  return this.locallyPaused ? Infinity :
      this._startTime + this.animationDuration + this.timing.startDelay +
      this.timeDrift;
});
TimedItem.prototype.__defineSetter__('parentGroup', function(parentGroup) {
  var newParent = this._sanitizeParent(parentGroup);
  if (newParent === null) {
    this._reparent(null);
  } else {
    // This updates the parent and calls _reparent() on this object.
    newParent.add(this);
  }
});
TimedItem.prototype.__defineGetter__('parentGroup', function() {
  return this._parentGroup;
});

mixin(TimedItem.prototype, {
  _sanitizeParent: function(parentGroup) {
    if (parentGroup === null || parentGroup instanceof AnimationGroup) {
      return parentGroup;
    } else if (!isDefined(parentGroup)) {
      return DEFAULT_GROUP;
    } else {
      throw new TypeError('parentGroup is not an AnimationGroup');
    }
  },
  // Takes care of updating the outgoing parent.
  _reparent: function(parentGroup) {
    if (parentGroup === this) {
      throw new Error('parentGroup can not be set to self!');
    }
    if (this.parentGroup) {
      this.parentGroup.remove(this.parentGroup.indexOf(this), 1);
    }
    this._parentGroup = parentGroup;
    this._timeDrift = 0;
    if (this._startTimeMode == ST_FORCED &&
        (!this.parentGroup || this.parentGroup.type != 'seq')) {
      this._startTime = this._stashedStartTime;
      this._startTimeMode = this._stashedStartTimeMode;
    }
    if (this._startTimeMode == ST_AUTO) {
      this._startTime = this._effectiveParentTime;
    }
    this._updateTimeMarkers();
  },
  _intrinsicDuration: function() {
    return 0.0;
  },
  _updateInternalState: function() {
    if (this.parentGroup) {
      this.parentGroup._childrenStateModified();
    }
    this._updateTimeMarkers();
  },
  _updateItemTime: function(parentTime) {
    if (this.parentGroup !== null && this.parentGroup.iterationTime !== null) {
      this.itemTime = this.parentGroup.iterationTime -
          this._startTime - this.timeDrift;
    } else if (isDefined(parentTime)) {
      this.itemTime = parentTime;
    } else {
      this.itemTime = null;
    }
  },
  _updateAnimationTime: function() {
    if (this.itemTime <= this.timing.startDelay) {
      if (((this.timing.fillMode == 'backwards') && !this._reversing)
        || this.timing.fillMode == 'both'
        || ((this.timing.fillMode == 'forwards') && this._reversing)) {
        this.animationTime = 0;
      } else {
        this.animationTime = null;
      }
    } else if (this.itemTime <
        this.timing.startDelay + this.animationDuration) {
      this.animationTime = this.itemTime - this.timing.startDelay;
    } else {
      if (((this.timing.fillMode == 'forwards') && !this._reversing)
        || this.timing.fillMode == 'both'
        || ((this.timing.fillMode == 'backwards') && this._reversing)) {
        this.animationTime = this.animationDuration;
      } else {
        this.animationTime = null;
      }
    }
  },
  _updateIterationParamsZeroDuration: function() {
    this.iterationTime = 0;
    var isAtEndOfIterations = (this.timing.iterationCount != 0) &&
        ((this.itemTime < this.timing.startDelay) == this._reversing);
    this.currentIteration = isAtEndOfIterations ?
       this._floorWithOpenClosedRange(this.timing.iterationStart +
           this.timing.iterationCount, 1.0) :
       this._floorWithClosedOpenRange(this.timing.iterationStart, 1.0);
    // Equivalent to unscaledIterationTime below.
    var unscaledFraction = isAtEndOfIterations ?
        this._modulusWithOpenClosedRange(this.timing.iterationStart +
            this.timing.iterationCount, 1.0) :
        this._modulusWithClosedOpenRange(this.timing.iterationStart, 1.0);
    this._timeFraction = this._isCurrentDirectionForwards(
        this.timing.direction, this.currentIteration) ?
            unscaledFraction :
            1.0 - unscaledFraction;
    if (this.timing.timingFunction) {
      this._timeFraction = this.timing.timingFunction.scaleTime(
          this._timeFraction);
    }
  },
  _updateIterationParams: function() {
    var startOffset = this.timing.iterationStart * this.duration;
    var effectiveSpeed = this._reversing ?
        -this.timing.playbackRate : this.timing.playbackRate;
    if (effectiveSpeed < 0) {
      var adjustedAnimationTime = (this.animationTime -
          this.animationDuration) * effectiveSpeed + startOffset;
    } else {
      var adjustedAnimationTime = this.animationTime * effectiveSpeed +
          startOffset;
    }
    var repeatedDuration = this.duration * this.timing.iterationCount;
    var isAtEndOfIterations = (this.timing.iterationCount != 0) &&
        (adjustedAnimationTime - startOffset == repeatedDuration);
    this.currentIteration = isAtEndOfIterations ?
        this._floorWithOpenClosedRange(
            adjustedAnimationTime, this.duration) :
        this._floorWithClosedOpenRange(
            adjustedAnimationTime, this.duration);
    var unscaledIterationTime = isAtEndOfIterations ?
        this._modulusWithOpenClosedRange(
            adjustedAnimationTime, this.duration) :
        this._modulusWithClosedOpenRange(
            adjustedAnimationTime, this.duration);
    var scaledIterationTime = unscaledIterationTime;
    this.iterationTime = this._isCurrentDirectionForwards(
        this.timing.direction, this.currentIteration) ?
            scaledIterationTime :
            this.duration - scaledIterationTime;
    this._timeFraction = this.iterationTime / this.duration;
    if (this.timing.timingFunction) {
      this._timeFraction = this.timing.timingFunction.scaleTime(
          this._timeFraction);
      this.iterationTime = this._timeFraction * this.duration;
    }
  },
  // Returns whether this TimedItem is currently in effect.
  _updateTimeMarkers: function(parentTime) {
    this._updateItemTime(parentTime);
    if (this.itemTime === null) {
      this.animationTime = null;
      this.iterationTime = null;
      this.currentIteration = null;
      this._timeFraction = null;
      return false;
    }
    this._updateAnimationTime();
    if (this.animationTime === null) {
      this.iterationTime = null;
      this.currentIteration = null;
      this._timeFraction = null;
    } else if (this.duration == 0) {
      this._updateIterationParamsZeroDuration();
    } else {
      this._updateIterationParams();
    }
    return this._timeFraction !== null;
  },
  pause: function() {
    this.locallyPaused = true;
  },
  seek: function(itemTime) {
    // TODO
  },
  changePlaybackRate: function(playbackRate) {
    var previousRate = this.timing.playbackRate;
    this.timing.playbackRate = playbackRate;
    if (previousRate == 0 || playbackRate == 0) {
      return;
    }
    // TODO: invert the fillMode?
    var seekAdjustment = (this.itemTime - this.timing.startDelay) *
        (1 - previousRate / playbackRate);
    this.currentTime = this.itemTime - seekAdjustment;
  },
  reverse: function() {
    if (this.currentTime === null) {
      var seekTime = 0;
    } else if (this.currentTime < this.timing.startDelay) {
      var seekTime = this.timing.startDelay + this.animationDuration;
    } else if (this.currentTime > this.timing.startDelay +
        this.animationDuration) {
      var seekTime = this.timing.startDelay;
    } else {
      var seekTime = this.timing.startDelay + this.animationDuration -
          this.currentTime;
    }

    this.currentTime = seekTime;
    this._reversing = !(this._reversing);
  },
  cancel: function() {
    if (this.parentGroup) {
      this.parentGroup.remove(this.parentGroup.indexOf(this), 1);
    }
  },
  play: function() {
    // TODO: This should unpause as well
    if (this.currentTime > this.animationDuration + this.timing.startDelay &&
        this.timing.playbackRate >= 0) {
      this.currentTime = this.timing.startDelay;
    }
    this.locallyPaused = false;
  },
  _floorWithClosedOpenRange: function(x, range) {
    return Math.floor(x / range);
  },
  _floorWithOpenClosedRange: function(x, range) {
    return Math.ceil(x / range) - 1;
  },
  _modulusWithClosedOpenRange: function(x, range) {
    return x % range;
  },
  _modulusWithOpenClosedRange: function(x, range) {
    var ret = this._modulusWithClosedOpenRange(x, range);
    return ret == 0 ? range : ret;
  },
  _isCurrentDirectionForwards: function(direction, currentIteration) {
    if (direction == 'normal') {
      return true;
    }
    if (direction == 'reverse') {
      return false;
    }
    var d = currentIteration;
    if (direction == 'alternate-reverse') {
      d += 1;
    }
    // TODO: 6.13.3 step 3. wtf?
    return d % 2 == 0;
  },
  _parentToGlobalTime: function(parentTime) {
    if (!this.parentGroup)
      return parentTime;
    return parentTime + DEFAULT_GROUP.itemTime - this.parentGroup.iterationTime;
  },
  clone: function() {
    throw new Error(
        "Derived classes must override TimedItem.clone()");
  },
  // Gets the TimedItems currently in effect. Note that this is a superset of
  // the TimedItems in their active interval, as a TimedItem can have an effect
  // outside its active interval due to fill.
  _getItemsInEffect: function() {
    throw new Error(
        "Derived classes must override TimedItem._getItemsInEffect()");
  },
});

var isCustomAnimationFunction = function(animationFunction) {
  // TODO: How does WebIDL actually differentiate different callback interfaces?
  return typeof animationFunction === "object" &&
      animationFunction.hasOwnProperty("sample") &&
      typeof animationFunction.sample === "function";
};

var interpretAnimationFunction = function(animationFunction) {
  if (animationFunction instanceof AnimationFunction) {
    return animationFunction;
  } else if (typeof animationFunction === 'object') {
    if (isCustomAnimationFunction(animationFunction)) {
      return animationFunction;
    } else {
      return AnimationFunction.createFromProperties(animationFunction);
    }
  } else {
    try {
      throw new Error('TypeError');
    } catch (e) { console.log(e.stack); throw e; }
  }
};

var cloneAnimationFunction = function(animationFunction) {
  if (animationFunction instanceof AnimationFunction) {
    return animationFunction.clone();
  } else if (isCustomAnimationFunction(animationFunction)) {
    if (typeof animationFunction.clone === "function") {
      return animationFunction.clone();
    } else {
      return animationFunction;
    }
  } else {
    return null;
  }
};

var interpretTimingParam = function(timing) {
  if (!isDefinedAndNotNull(timing)) {
    return new Timing({});
  }
  if (timing instanceof Timing || timing instanceof TimingProxy) {
    return timing;
  }
  if (typeof(timing) === 'number') {
    return new Timing({duration: timing});
  }
  if (typeof(timing) === 'object') {
    return new Timing(timing);
  }
  throw new TypeError('timing parameters must be undefined, Timing objects, ' +
      'numbers, or timing dictionaries; not \'' + timing + '\'');
};

/** @constructor */
var Animation = function(target, animationFunction, timing, parentGroup,
    startTime) {
  this.animationFunction = interpretAnimationFunction(animationFunction);
  this.timing = interpretTimingParam(timing);

  Animation.$super.call(this, timing, startTime, parentGroup);

  this.targetElement = target;
  this.name = this.animationFunction instanceof KeyframesAnimationFunction ?
      this.animationFunction.property : '<anon>';
  this._sortOrder = 0;
};

inherits(Animation, TimedItem);
mixin(Animation.prototype, {
  _sample: function() {
    this.animationFunction.sample(this._timeFraction,
        this.currentIteration, this.targetElement,
        this.underlyingValue);
  },
  _getItemsInEffect: function() {
    if (!this._updateTimeMarkers()) {
      return [];
    }

    this._sortOrder = this._parentToGlobalTime(this.startTime);
    return [this];
  },
  clone: function() {
    return new Animation(this.targetElement,
        cloneAnimationFunction(this.animationFunction), this.timing.clone());
  },
  toString: function() {
    var funcDescr = this.animationFunction instanceof AnimationFunction ?
        this.animationFunction.toString() : 'Custom scripted function';
    return 'Animation ' + this.startTime + '-' + this.endTime + ' (' +
        this.timeDrift + ' @' + this.currentTime + ') ' + funcDescr;
  }
});

// To use this, need to have children and length member variables.
var AnimationListMixin = {
  initListMixin: function(onListChange) {
    this.children = [];
    this.length = 0;
    this.onListChange = onListChange;
  },
  _lengthChanged: function() {
    while (this.length < this.children.length) {
      var i = this.length++;
      this.__defineSetter__(i, function(x) { this.children[i] = x; });
      this.__defineGetter__(i, function() { return this.children[i]; });
    }
    while (this.length > this.children.length) {
      var i = --this.length;
      delete this[i];
    }
  },
  clear: function() {
    // TODO: call cancel on children? Update timing?
    this.children = [];
    this._lengthChanged();
    this.onListChange();
  },
  add: function() {
    var newItems = [];
    for (var i = 0; i < arguments.length; i++) {
      newItems.push(arguments[i]);
    }
    this.splice(this.length, 0, newItems);
    return newItems;
  },
  _addInternal: function(child) {
    this.children.push(child);
    this._lengthChanged();
    this.onListChange();
  },
  indexOf: function(item) {
    return this.children.indexOf(item);
  },
  splice: function(start, deleteCount, newItems) {
    var args = arguments;
    if (args.length == 3) {
      args = [start, deleteCount].concat(newItems);
    }
    for (var i = 2; i < args.length; i++) {
      var newChild = args[i];
      // Check whether the new child is an ancestor. If so, we need to break the
      // chain immediately below the new child.
      for (var ancestor = this; ancestor.parentGroup != null;
          ancestor = ancestor.parentGroup) {
        if (ancestor.parentGroup === newChild) {
          newChild.remove(ancestor);
          break;
        }
      }
      newChild._reparent(this);
    }
    var result = Array.prototype['splice'].apply(this.children, args);
    for (var i = 0; i < result.length; i++) {
      result[i]._parentGroup = null;
    }
    this._lengthChanged();
    this.onListChange();
    return result;
  },
  remove: function(index, count) {
    if (!isDefined(count)) {
      count = 1;
    }
    return this.splice(index, count);
  }
}

/** @constructor */
var AnimationGroup = function(type, children, timing, startTime, parentGroup) {
  // Take a copy of the children array, as it could be modified as a side-effect
  // of creating this object. See
  // https://github.com/web-animations/web-animations-js/issues/65 for details.
  var childrenCopy = (children && Array.isArray(children)) ?
      children.slice() : [];
  // used by TimedItem via _intrinsicDuration(), so needs to be set before
  // initializing super.
  this.type = type || 'par';
  this.initListMixin(this._childrenStateModified);
  AnimationGroup.$super.call(this, timing, startTime, parentGroup);
  // We add children after setting the parent. This means that if an ancestor
  // (including the parent) is specified as a child, it will be removed from our
  // ancestors and used as a child,
  for (var i = 0; i < childrenCopy.length; i++) {
    this.add(childrenCopy[i]);
  }
  // TODO: Work out where to expose name in the API
  // this.name = properties.name || '<anon>';
};

inherits(AnimationGroup, TimedItem);
mixin(AnimationGroup.prototype, AnimationListMixin);
mixin(AnimationGroup.prototype, {
  _childrenStateModified: function() {
    // See _updateChildStartTimes().
    this._isInOnChildrenStateModified = true;

    // We need to walk up and down the tree to re-layout. endTime and the
    // various durations (which are all calculated lazily) are the only
    // properties of a TimedItem which can affect the layout of its ancestors.
    // So it should be sufficient to simply update start times and time markers
    // on the way down.

    // This calls up to our parent, then updates our time markers.
    this._updateInternalState();

    // Update child start times before walking down.
    this._updateChildStartTimes();

    if (!this.parentGroup) {
      maybeRestartAnimation();
    }
    this._isInOnChildrenStateModified = false;
  },
  _updateChildStartTimes: function() {
    if (this.type == 'seq') {
      var cumulativeStartTime = 0;
      this.children.forEach(function(child) {
        if (child._startTimeMode != ST_FORCED) {
          child._stashedStartTime = child._startTime;
          child._stashedStartTimeMode = child._startTimeMode;
          child._startTimeMode = ST_FORCED;
        }
        child._startTime = cumulativeStartTime;
        // Avoid updating the child's time markers if this is about to be done
        // in the down phase of _childrenStateModified().
        if (!child._isInOnChildrenStateModified) {
          child._updateTimeMarkers();
        }
        cumulativeStartTime += Math.max(0, child.timing.startDelay +
            child.animationDuration);
      }.bind(this));
    }
  },
  getAnimationsForElement: function(elem) {
    var result = [];
    for (var i = 0; i < this.children.length; i++) {
      if (this.children[i].getAnimationsForElement) {
        result = result.concat(this.children[i].getAnimationsForElement(elem));
      } else if (this.children[i].targetElement == elem) {
        result.push(this.children[i]);
      }
    }
    return result;
  },
  _intrinsicDuration: function() {
    if (this.type == 'par') {
      var dur = Math.max.apply(undefined, this.children.map(function(a) {
        return a.endTime;
      }));
      return Math.max(0, dur);
    } else if (this.type == 'seq') {
      var result = 0;
      this.children.forEach(function(a) {
        result += a.animationDuration + a.timing.startDelay;
      });
      return result;
    } else {
      throw 'Unsupported type ' + this.type;
    }
  },
  _getItemsInEffect: function() {
    this._updateTimeMarkers();
    var animations = [];
    this.children.forEach(function(child) {
      animations = animations.concat(child._getItemsInEffect());
    }.bind(this));
    return animations;
  },
  clone: function() {
    var children = [];
    this.children.forEach(function(child) {
      children.push(child.clone());
    }.bind(this));
    return this.type === "par" ?
        new ParGroup(children, this.timing.clone()) :
        new SeqGroup(children, this.timing.clone());
  },
  toString: function() {
    return this.type + ' ' + this.startTime + '-' + this.endTime + ' (' +
        this.timeDrift + ' @' + this.currentTime + ') ' + ' [' +
        this.children.map(function(a) { return a.toString(); }) + ']'
  }
});

/** @constructor */
var ParGroup = function(children, timing, parentGroup, startTime) {
  ParGroup.$super.call(
      this, 'par', children, timing, startTime, parentGroup);
};

inherits(ParGroup, AnimationGroup);

/** @constructor */
var SeqGroup = function(children, timing, parentGroup, startTime) {
  SeqGroup.$super.call(
      this, 'seq', children, timing, startTime, parentGroup);
};

inherits(SeqGroup, AnimationGroup);

/** @constructor */
var AnimationFunction = function(operation, accumulateOperation) {
  this.operation = operation === undefined ? 'replace' : operation;
  this.accumulateOperation =
      accumulateOperation == undefined ? 'replace' : operation;
};

mixin(AnimationFunction.prototype, {
  sample: function(timeFraction, currentIteration, target) {
    throw 'Unimplemented sample function';
  },
  getValue: function(target) {
    return;
  },
  clone: function() {
    throw 'Unimplemented clone method'
  }
});

AnimationFunction.createFromProperties = function(properties) {
  // Step 1 - determine set of animation properties
  var animProps = [];
  for (var candidate in properties) {
    animProps.push(candidate);
  }

  // Step 2 - Create AnimationFunction objects
  if (animProps.length === 0) {
    return null;
  } else if (animProps.length === 1) {
    return AnimationFunction._createKeyframeFunction(
        animProps[0], properties[animProps[0]], properties.operation);
  } else {
    var result = new GroupedAnimationFunction();
    for (var i = 0; i < animProps.length; i++) {
      result.add(AnimationFunction._createKeyframeFunction(
          animProps[i], properties[animProps[i]], properties.operation));
    }
    return result;
  }
}

// Step 3 - Create a KeyframesAnimationFunction object
AnimationFunction._createKeyframeFunction =
    function(property, value, operation) {
  var func = new KeyframesAnimationFunction(property);

  if (typeof value === 'string') {
    func.frames.add(new Keyframe(value, 0));
    func.frames.add(new Keyframe(value, 1));
    func.operation = 'merge';
  } else if (Array.isArray(value)) {
    for (var i = 0; i < value.length; i++) {
      if (typeof value[i] !== 'string') {
        var val = isDefinedAndNotNull(value[i].value) ? value[i].value : "";
        var offset = isDefinedAndNotNull(value[i].offset) ? value[i].offset : 1;
        func.frames.add(new Keyframe(val, offset));
      } else {
        var offset = i / (value.length - 1);
        func.frames.add(new Keyframe(value[i], offset));
      }
    }
  } else {
    try {
      throw new Error('TypeError');
    } catch (e) { console.log(e.stack); throw e; }
  }

  if (isDefinedAndNotNull(operation)) {
    func.operation = operation;
  }

  return func;
}

/** @constructor */
var GroupedAnimationFunction = function() {
  GroupedAnimationFunction.$super.call(this);
  this.children = [];
};

inherits(GroupedAnimationFunction, AnimationFunction);
mixin(GroupedAnimationFunction.prototype, {
  item: function(i) {
    return this.children[i];
  },
  add: function(func) {
    this.children.push(func);
  },
  remove: function(i) {
    this.children.splice(i, 1);
  },
  sample: function(timeFraction, currentIteration, target) {
    for (var i = 0; i < this.children.length; i++) {
      this.children[i].sample(timeFraction, currentIteration, target);
    }
  },
  clone: function() {
    var result = new GroupedAnimationFunction();
    for (var i = 0; i < this.children.length; i++) {
      result.add(this.children[i].clone());
    }
  }
});

GroupedAnimationFunction.prototype.__defineGetter__('length', function() {
  return this.children.length;
});

/** @constructor */
var PathAnimationFunction = function(path, operation, accumulateOperation) {
  PathAnimationFunction.$super.call(this, operation, accumulateOperation);
  // TODO: path argument is not in the spec -- seems useful since
  // SVGPathSegList doesn't have a constructor.
  this._path = path;
};

inherits(PathAnimationFunction, AnimationFunction);
mixin(PathAnimationFunction.prototype, {
  sample: function(timeFraction, currentIteration, target) {
    var length = this._path.getTotalLength();
    var point = this._path.getPointAtLength(timeFraction * length);
    var x = point.x - target.offsetWidth / 2;
    var y = point.y - target.offsetHeight / 2;
    // TODO: calc(point.x - 50%) doesn't work?
    var value = [{t: 'translate', d: [x, y]}];
    if (this.rotate) {
      // Super hacks
      var lastPoint = this._path.getPointAtLength(timeFraction * length - 0.01);
      var dx = point.x - lastPoint.x;
      var dy = point.y - lastPoint.y;
      var rotation = Math.atan2(dy, dx);
      value.push({t:'rotate', d: rotation / 2 / Math.PI * 360});
    }
    compositor.setAnimatedValue(target, '-webkit-transform',
        new AnimatedResult(value, this.operation, timeFraction));
    compositor.setAnimatedValue(target, 'transform',
        new AnimatedResult(value, this.operation, timeFraction));
  },
  clone: function() {
    return new PathAnimationFunction(this._path.getAttribute('d'));
  }
});

PathAnimationFunction.prototype.__defineSetter__('segments', function(segments) {
  // TODO: moving the path segments is not entirely correct, but we can't
  // assign the list to the path.
  var targetSegments = this._path.pathSegList;
  targetSegments.clear();
  for (var i = 0; i < segments.numberOfItems; i++) {
    this._path.pathSegList.appendItem(segments.getItem(i));
  }
});

PathAnimationFunction.prototype.__defineGetter__('segments', function() {
  return this._path.pathSegList;
});

/** @constructor */
var KeyframesAnimationFunction =
    function(property, operation, accumulateOperation) {
  KeyframesAnimationFunction.$super.call(this, operation, accumulateOperation);
  this.property = property;
  this.frames = new KeyframeList();
};

inherits(KeyframesAnimationFunction, AnimationFunction);
mixin(KeyframesAnimationFunction.prototype, {
  sample: function(timeFraction, currentIteration, target) {
    var frames = this.frames._sorted();
    if (frames.length == 0) {
      return;
    }
    var afterFrameNum = null;
    var beforeFrameNum = null;
    var i = 0;
    while (i < frames.length) {
      if (frames[i].offset == timeFraction) {
        // TODO: This should probably call fromCssValue and toCssValue for
        // cases where we have to massage the data before setting e.g.
        // 'rotate(45deg)' is valid, but for UAs that don't support CSS
        // Transforms syntax on SVG content we have to convert that to
        // 'rotate(45)' before setting.
        this.ensureRawValue(frames[i]);
        compositor.setAnimatedValue(target, this.property,
            new AnimatedResult(frames[i].rawValue, this.operation,
            timeFraction));
        return;
      }
      if (frames[i].offset > timeFraction) {
        afterFrameNum = i;
        break;
      }
      i++;
    }
    if (afterFrameNum == 0) {
      // In the case where we have a negative time fraction and a keyframe at
      // offset 0, the expected behavior is to extrapolate the interval that
      // starts at 0, rather than to use the base value.
      if (frames[0].offset === 0) {
        afterFrameNum = frames.length > 1 ? 1 : frames.length;
        beforeFrameNum = 0;
      } else {
        beforeFrameNum = -1;
      }
    } else if (afterFrameNum == null) {
      // In the case where we have a time fraction greater than 1 and a
      // keyframe at 1, the expected behavior is to extrapolate the interval
      // that ends at 1, rather than to use the base value.
      if (frames[frames.length-1].offset === 1) {
        afterFrameNum = frames.length - 1;
        beforeFrameNum = frames.length > 1 ? frames.length - 2 : -1;
      } else {
        beforeFrameNum = frames.length - 1;
        afterFrameNum = frames.length;
      }
    } else {
      beforeFrameNum = afterFrameNum - 1;
    }
    if (beforeFrameNum == -1) {
      beforeFrame = {
        rawValue: zero(this.property, frames[afterFrameNum].value),
        offset: 0
      };
    } else {
      beforeFrame = frames[beforeFrameNum];
      this.ensureRawValue(beforeFrame);
    }

    if (afterFrameNum == frames.length) {
      afterFrame = {
        rawValue: zero(this.property, frames[beforeFrameNum].value),
        offset: 1
      };
    } else {
      afterFrame = frames[afterFrameNum];
      this.ensureRawValue(afterFrame);
    }
    // TODO: apply time function
    var localTimeFraction = (timeFraction - beforeFrame.offset) /
        (afterFrame.offset - beforeFrame.offset);
    // TODO: property-based interpolation for things that aren't simple
    var animationValue = interpolate(this.property, beforeFrame.rawValue,
        afterFrame.rawValue, localTimeFraction);
    compositor.setAnimatedValue(target, this.property,
        new AnimatedResult(animationValue, this.operation, timeFraction));
  },
  getValue: function(target) {
    return getValue(target, this.property);
  },
  clone: function() {
    var result = new KeyframesAnimationFunction(
        this.property, this.operation, this.accumulateOperation);
    result.frames = this.frames.clone();
    return result;
  },
  ensureRawValue: function(frame) {
    if (isDefinedAndNotNull(frame.rawValue)) {
      return;
    }
    frame.rawValue = fromCssValue(this.property, frame.value);
  },
  toString: function() {
    return this.property;
  }
});

/** @constructor */
var Keyframe = function(value, offset, timingFunction) {
  this.value = value;
  this.rawValue = null;
  this.offset = offset;
  this.timingFunction = timingFunction;
};

/** @constructor */
var KeyframeList = function() {
  this.frames = [];
  this._isSorted = true;
};

mixin(KeyframeList.prototype, {
  _sorted: function() {
    if (!this._isSorted) {
      this.frames.sort(function(a, b) {
        if (a.offset < b.offset) {
          return -1;
        }
        if (a.offset > b.offset) {
          return 1;
        }
        return 0;
      });
      this._isSorted = true;
    }
    return this.frames;
  },
  item: function(index) {
    if (index >= this.length || index < 0) {
      return null;
    }
    return this.frames[index];
  },
  add: function(frame) {
    this.frames.push(frame);
    this._isSorted = false;
    return frame;
  },
  remove: function(frame) {
    var index = this.frames.indexOf(frame);
    if (index == -1) {
      return undefined;
    }
    this.frames.splice(index, 1);
    return frame;
  },
  clone: function() {
    var result = new KeyframeList();
    for (var i = 0; i < this.frames.length; i++) {
      result.add(new Keyframe(this.frames[i].value, this.frames[i].offset,
          this.frames[i].timingFunction));
    }
    return result;
  }
});

KeyframeList.prototype.__defineGetter__('length', function() {
  return this.frames.length;
});

var presetTimings = {
  'ease': [0.25, 0.1, 0.25, 1.0],
  'linear': [0.0, 0.0, 1.0, 1.0],
  'ease-in': [0.42, 0, 1.0, 1.0],
  'ease-out': [0, 0, 0.58, 1.0],
  'ease-in-out': [0.42, 0, 0.58, 1.0]
};

/** @constructor */
var TimingFunction = function(spec) {
  if (!Array.isArray(spec)) {
    return TimingFunction.createFromString(spec);
  }
  this.params = spec;
  this.map = []
  for (var ii = 0; ii <= 100; ii += 1) {
    var i = ii / 100;
    this.map.push([
      3*i*(1-i)*(1-i)*this.params[0] + 3*i*i*(1-i)*this.params[2] + i*i*i,
      3*i*(1-i)*(1-i)*this.params[1] + 3*i*i*(1-i)*this.params[3] + i*i*i
    ]);
  }
};

mixin(TimingFunction.prototype, {
  scaleTime: function(fraction) {
    var fst = 0;
    while (fst != 100 && fraction > this.map[fst][0]) {
      fst += 1;
    }
    if (fraction == this.map[fst][0] || fst == 0) {
      return this.map[fst][1];
    }
    var yDiff = this.map[fst][1] - this.map[fst - 1][1];
    var xDiff = this.map[fst][0] - this.map[fst - 1][0];
    var p = (fraction - this.map[fst - 1][0]) / xDiff;
    return this.map[fst - 1][1] + p * yDiff;
  },
  clone: function() {
    return new TimingFunction(this.params);
  }
});

TimingFunction.createFromString = function(spec) {
  var preset = presetTimings[spec];
  if (preset) {
    return new TimingFunction(presetTimings[spec]);
  }
  var stepMatch = /steps\(\s*(\d+)\s*,\s*(start|end|middle)\s*\)/.exec(spec);
  if (stepMatch) {
    return new StepTimingFunction(Number(stepMatch[1]), stepMatch[2]);
  }
  var bezierMatch =
      /cubic-bezier\(([^,]*),([^,]*),([^,]*),([^)]*)\)/.exec(spec);
  if (bezierMatch) {
    return new TimingFunction([
        Number(bezierMatch[1]),
        Number(bezierMatch[2]),
        Number(bezierMatch[3]),
        Number(bezierMatch[4])]);
  }
  throw 'not a timing function: ' + spec;
};

/** @constructor */
var StepTimingFunction = function(numSteps, position) {
  this.numSteps = numSteps;
  this.position = position || 'end';
}

inherits(StepTimingFunction, TimingFunction);
mixin(StepTimingFunction.prototype, {
  scaleTime: function(fraction) {
    if (fraction >= 1)
      return 1;
    var stepSize = 1 / this.numSteps;
    if (this.position == 'start') {
      fraction += stepSize;
    } else if (this.position == 'middle') {
      fraction += stepSize / 2;
    }
    return fraction - fraction % stepSize;
  },
  clone: function() {
    return new StepTimingFunction(this.numSteps, this.position);
  }
});

var interp = function(from, to, f, type) {
  if (Array.isArray(from) || Array.isArray(to)) {
    return interpArray(from, to, f, type);
  }
  var zero = type == 'scale' ? 1.0 : 0.0;
  to   = isDefinedAndNotNull(to) ? to : zero;
  from = isDefinedAndNotNull(from) ? from : zero;

  return to * f + from * (1 - f);
};

var interpArray = function(from, to, f, type) {
  console.assert(Array.isArray(from) || from === null,
      'From is not an array or null');
  console.assert(Array.isArray(to) || to === null,
      'To is not an array or null');
  console.assert(from === null || to === null || from.length === to.length,
      'Arrays differ in length');
  var length = from ? from.length : to.length;

  var result = [];
  for (var i = 0; i < length; i++) {
    result[i] = interp(from ? from[i] : null, to ? to[i] : null, f, type);
  }
  return result;
};

var numberType = {
  zero: function() { return 0; },
  add: function(base, delta) { return base + delta; },
  interpolate: interp,
  toCssValue: function(value) { return value + ''; },
  fromCssValue: function(value) { return value !== '' ? Number(value): null; }
};

var integerType = {
  interpolate: function(from, to, f) { return Math.floor(interp(from, to, f)); }
};
integerType.__proto__ = numberType;

var fontWeightType = {
  zero: function() { return 0; },
  add: function(base, delta) { return base + delta; },
  interpolate: function(from, to, f) {
    return interp(from, to, f);
  },
  toCssValue: function(value) {
      value = Math.round(value / 100) * 100
      value = Math.min(900, Math.max(100, value));
      return String(value);
  },
  fromCssValue: function(value) {
    if (value == 'normal') {
      return 400;
    }
    if (value == 'bold') {
      return 700;
    }
    // TODO: support lighter / darker ?
    return Number(value);
  }
};

var outerCalcRE = /-webkit-calc\s*\(\s*([^)]*)\)/;
var valueRE = /\s*([0-9.]*)([a-zA-Z%]*)/;
var operatorRE = /\s*([+-])/;
var percentLengthType = {
  zero: function() { return {}; },
  add: function(base, delta) {
    var out = {};
    for (value in base) {
      out[value] = base[value] + (delta[value] || 0);
    }
    for (value in delta) {
      if (value in base) {
        continue;
      }
      out[value] = delta[value];
    }
    return out;
  },
  interpolate: function(from, to, f) {
    var out = {};
    for (var value in from) {
      out[value] = interp(from[value], to[value], f);
    }
    for (var value in to) {
      if (value in out) {
        continue;
      }
      out[value] = interp(0, to[value], f);
    }
    return out;
  },
  toCssValue: function(value) {
    var s = '';
    var single_value = true;
    for (var item in value) {
      if (s === '') {
        s = value[item] + item;
      } else if (single_value) {
        s = '-webkit-calc(' + s + ' + ' + value[item] + item + ')';
        single_value = false;
      } else {
        s = s.substring(0, s.length - 1) + ' + ' + value[item] + item + ')';
      }
    }
    return s;
  },
  fromCssValue: function(value) {
    var out = {}
    var innards = outerCalcRE.exec(value);
    if (!innards) {
      var singleValue = valueRE.exec(value);
      if (singleValue && (singleValue.length == 3)) {
        out[singleValue[2]] = Number(singleValue[1]);
        return out;
      }
      return {};
    }
    innards = innards[1];
    var first_time = true;
    while (true) {
      var reversed = false;
      if (first_time) {
        first_time = false;
      } else {
        var op = operatorRE.exec(innards);
        if (!op) {
          return {};
        }
        if (op[1] == '-') {
          reversed = true;
        }
        innards = innards.substring(op[0].length);
      }
      value = valueRE.exec(innards);
      if (!value) {
        return {};
      }
      if (!isDefinedAndNotNull(out[value[2]])) {
        out[value[2]] = 0;
      }
      if (reversed) {
        out[value[2]] -= Number(value[1]);
      } else {
        out[value[2]] += Number(value[1]);
      }
      innards = innards.substring(value[0].length);
      if (/\s*/.exec(innards)[0].length == innards.length) {
        return out;
      }
    }
  }
};

var rectangleRE = /rect\(([^,]+),([^,]+),([^,]+),([^)]+)\)/;
var rectangleType = {
  zero: function() {
    return {
      top: percentLengthType.zero(),
      right: percentLengthType.zero(),
      bottom: percentLengthType.zero(),
      left: percentLengthType.zero()
    };
  },
  add: function(base, delta) {
    return {
      top: percentLengthType.add(base.top, delta.top),
      right: percentLengthType.add(base.right, delta.right),
      bottom: percentLengthType.add(base.bottom, delta.bottom),
      left: percentLengthType.add(base.left, delta.left)
    };
  },
  interpolate: function(from, to, f) {
    return {
      top: percentLengthType.interpolate(from.top, to.top, f),
      right: percentLengthType.interpolate(from.right, to.right, f),
      bottom: percentLengthType.interpolate(from.bottom, to.bottom, f),
      left: percentLengthType.interpolate(from.left, to.left, f)
    };
  },
  toCssValue: function(value) {
    return 'rect(' +
        percentLengthType.toCssValue(value.top) + ',' +
        percentLengthType.toCssValue(value.right) + ',' +
        percentLengthType.toCssValue(value.bottom) + ',' +
        percentLengthType.toCssValue(value.left) + ')';
  },
  fromCssValue: function(value) {
    var match = rectangleRE.exec(value);
    return {
      top: percentLengthType.fromCssValue(match[1]),
      right: percentLengthType.fromCssValue(match[2]),
      bottom: percentLengthType.fromCssValue(match[3]),
      left: percentLengthType.fromCssValue(match[4])
    };
  }
};

var shadowType = {
  zero: function() {
      return [];
  },
  _addSingle: function(base, delta) {
    if (base && delta && base.inset != delta.inset) {
      return delta;
    }
    var result = {
      inset: base ? base.inset : delta.inset,
      hOffset: lengthType.add(
          base ? base.hOffset : lengthType.zero(),
          delta ? delta.hOffset : lengthType.zero()),
      vOffset: lengthType.add(
          base ? base.vOffset : lengthType.zero(),
          delta ? delta.vOffset : lengthType.zero()),
      blur: lengthType.add(
          base && base.blur || lengthType.zero(),
          delta && delta.blur || lengthType.zero()),
    };
    if (base && base.spread || delta && delta.spread) {
      result.spread = lengthType.add(
          base && base.spread || lengthType.zero(),
          delta && delta.spread || lengthType.zero());
    }
    if (base && base.color || delta && delta.color) {
      result.color = colorType.add(
          base && base.color || colorType.zero(),
          delta && delta.color || colorType.zero());
    }
    return result;
  },
  add: function(base, delta) {
    var result = [];
    for (var i = 0; i < base.length || i < delta.length; i++) {
      result.push(this._addSingle(base[i], delta[i]));
    }
    return result;
  },
  _interpolateSingle: function(from, to, f) {
    if (from && to && from.inset != to.inset) {
      return f < 0.5 ? from : to;
    }
    var result = {
      inset: from ? from.inset : to.inset,
      hOffset: lengthType.interpolate(
          from ? from.hOffset : lengthType.zero(),
          to ? to.hOffset : lengthType.zero(), f),
      vOffset: lengthType.interpolate(
          from ? from.vOffset : lengthType.zero(),
          to ? to.vOffset : lengthType.zero(), f),
      blur: lengthType.interpolate(
          from && from.blur || lengthType.zero(),
          to && to.blur || lengthType.zero(), f),
    };
    if (from && from.spread || to && to.spread) {
      result.spread = lengthType.interpolate(
          from && from.spread || lengthType.zero(),
          to && to.spread || lengthType.zero(), f);
    }
    if (from && from.color || to && to.color) {
      result.color = colorType.interpolate(
          from && from.color || colorType.zero(),
          to && to.color || colorType.zero(), f);
    }
    return result;
  },
  interpolate: function(from, to, f) {
    var result = [];
    for (var i = 0; i < from.length || i < to.length; i++) {
      result.push(this._interpolateSingle(from[i], to[i], f));
    }
    return result;
  },
  _toCssValueSingle: function(value) {
    return (value.inset ? 'inset ' : '') +
        lengthType.toCssValue(value.hOffset) + ' ' +
        lengthType.toCssValue(value.vOffset) + ' ' +
        lengthType.toCssValue(value.blur) +
        (value.spread ? ' ' + lengthType.toCssValue(value.spread) : '') +
        (value.color ? ' ' + colorType.toCssValue(value.color) : '');
  },
  toCssValue: function(value) {
    return value.map(this._toCssValueSingle).join(', ');
  },
  fromCssValue: function(value) {
    var shadows = value.split(/\s*,\s*/);
    var result = shadows.map(function(value) {
      value = value.replace(/^\s+|\s+$/g, '');
      var parts = value.split(/\s+/);
      if (parts.length < 2 || parts.length > 6) {
        return undefined;
      }
      var result = {
        inset: false
      };
      if (parts[0] == 'inset') {
        parts.shift();
        result.inset = true;
      }
      var color;
      var lengths = [];
      while (parts.length) {
        var part = parts.shift();
        // TODO: what's the contract for fromCssValue, assuming it returns
        // undefined if it cannot parse the value (colorType behaves this way)
        color = colorType.fromCssValue(part);
        if (color) {
          result.color = color;
          if (parts.length) {
            return undefined;
          }
          break;
        }
        var length = lengthType.fromCssValue(part);
        lengths.push(length);
      }
      if (lengths.length < 2 || lengths.length > 4) {
        return undefined;
      }
      result.hOffset = lengths[0];
      result.vOffset = lengths[1];
      if (lengths.length > 2) {
        result.blur = lengths[2];
      }
      if (lengths.length > 3) {
        result.spread = lengths[3];
      }
      if (color) {
        result.color = color;
      }
      return result;
    });
    return result.every(isDefined) ? result : [];
  }
};

var nonNumericType = {
  zero: function() {
    return undefined;
  },
  add: function(base, delta) {
    return isDefined(delta) ? delta : base;
  },
  interpolate: function(from, to, f) {
    return f < 0.5 ? from : to;
  },
  toCssValue: function(value) {
    return value;
  },
  fromCssValue: function(value) {
    return value;
  }
};

var visibilityType = {
  interpolate: function(from, to, f) {
    if (from != 'visible' && to != 'visible') {
      return nonNumericType.interpolate(from, to, f);
    }
    if (f <= 0) {
      return from;
    }
    if (f >= 1) {
      return to;
    }
    return 'visible';
  },
};
visibilityType.__proto__ = nonNumericType;

var lengthType = percentLengthType;

var rgbRE = /^\s*rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/;
var rgbaRE =
    /^\s*rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+|\d*\.\d+)\s*\)/;

var namedColors = {
  aliceblue: [240, 248, 255, 1], antiquewhite: [250, 235, 215, 1],
  aqua: [0, 255, 255, 1], aquamarine: [127, 255, 212, 1],
  azure: [240, 255, 255, 1], beige: [245, 245, 220, 1],
  bisque: [255, 228, 196, 1], black: [0, 0, 0, 1],
  blanchedalmond: [255, 235, 205, 1], blue: [0, 0, 255, 1],
  blueviolet: [138, 43, 226, 1], brown: [165, 42, 42, 1],
  burlywood: [222, 184, 135, 1], cadetblue: [95, 158, 160, 1],
  chartreuse: [127, 255, 0, 1], chocolate: [210, 105, 30, 1],
  coral: [255, 127, 80, 1], cornflowerblue: [100, 149, 237, 1],
  cornsilk: [255, 248, 220, 1], crimson: [220, 20, 60, 1],
  cyan: [0, 255, 255, 1], darkblue: [0, 0, 139, 1],
  darkcyan: [0, 139, 139, 1], darkgoldenrod: [184, 134, 11, 1],
  darkgray: [169, 169, 169, 1], darkgreen: [0, 100, 0, 1],
  darkgrey: [169, 169, 169, 1], darkkhaki: [189, 183, 107, 1],
  darkmagenta: [139, 0, 139, 1], darkolivegreen: [85, 107, 47, 1],
  darkorange: [255, 140, 0, 1], darkorchid: [153, 50, 204, 1],
  darkred: [139, 0, 0, 1], darksalmon: [233, 150, 122, 1],
  darkseagreen: [143, 188, 143, 1], darkslateblue: [72, 61, 139, 1],
  darkslategray: [47, 79, 79, 1], darkslategrey: [47, 79, 79, 1],
  darkturquoise: [0, 206, 209, 1], darkviolet: [148, 0, 211, 1],
  deeppink: [255, 20, 147, 1], deepskyblue: [0, 191, 255, 1],
  dimgray: [105, 105, 105, 1], dimgrey: [105, 105, 105, 1],
  dodgerblue: [30, 144, 255, 1], firebrick: [178, 34, 34, 1],
  floralwhite: [255, 250, 240, 1], forestgreen: [34, 139, 34, 1],
  fuchsia: [255, 0, 255, 1], gainsboro: [220, 220, 220, 1],
  ghostwhite: [248, 248, 255, 1], gold: [255, 215, 0, 1],
  goldenrod: [218, 165, 32, 1], gray: [128, 128, 128, 1],
  green: [0, 128, 0, 1], greenyellow: [173, 255, 47, 1],
  grey: [128, 128, 128, 1], honeydew: [240, 255, 240, 1],
  hotpink: [255, 105, 180, 1], indianred: [205, 92, 92, 1],
  indigo: [75, 0, 130, 1], ivory: [255, 255, 240, 1],
  khaki: [240, 230, 140, 1], lavender: [230, 230, 250, 1],
  lavenderblush: [255, 240, 245, 1], lawngreen: [124, 252, 0, 1],
  lemonchiffon: [255, 250, 205, 1], lightblue: [173, 216, 230, 1],
  lightcoral: [240, 128, 128, 1], lightcyan: [224, 255, 255, 1],
  lightgoldenrodyellow: [250, 250, 210, 1], lightgray: [211, 211, 211, 1],
  lightgreen: [144, 238, 144, 1], lightgrey: [211, 211, 211, 1],
  lightpink: [255, 182, 193, 1], lightsalmon: [255, 160, 122, 1],
  lightseagreen: [32, 178, 170, 1], lightskyblue: [135, 206, 250, 1],
  lightslategray: [119, 136, 153, 1], lightslategrey: [119, 136, 153, 1],
  lightsteelblue: [176, 196, 222, 1], lightyellow: [255, 255, 224, 1],
  lime: [0, 255, 0, 1], limegreen: [50, 205, 50, 1],
  linen: [250, 240, 230, 1], magenta: [255, 0, 255, 1],
  maroon: [128, 0, 0, 1], mediumaquamarine: [102, 205, 170, 1],
  mediumblue: [0, 0, 205, 1], mediumorchid: [186, 85, 211, 1],
  mediumpurple: [147, 112, 219, 1], mediumseagreen: [60, 179, 113, 1],
  mediumslateblue: [123, 104, 238, 1], mediumspringgreen: [0, 250, 154, 1],
  mediumturquoise: [72, 209, 204, 1], mediumvioletred: [199, 21, 133, 1],
  midnightblue: [25, 25, 112, 1], mintcream: [245, 255, 250, 1],
  mistyrose: [255, 228, 225, 1], moccasin: [255, 228, 181, 1],
  navajowhite: [255, 222, 173, 1], navy: [0, 0, 128, 1],
  oldlace: [253, 245, 230, 1], olive: [128, 128, 0, 1],
  olivedrab: [107, 142, 35, 1], orange: [255, 165, 0, 1],
  orangered: [255, 69, 0, 1], orchid: [218, 112, 214, 1],
  palegoldenrod: [238, 232, 170, 1], palegreen: [152, 251, 152, 1],
  paleturquoise: [175, 238, 238, 1], palevioletred: [219, 112, 147, 1],
  papayawhip: [255, 239, 213, 1], peachpuff: [255, 218, 185, 1],
  peru: [205, 133, 63, 1], pink: [255, 192, 203, 1],
  plum: [221, 160, 221, 1], powderblue: [176, 224, 230, 1],
  purple: [128, 0, 128, 1], red: [255, 0, 0, 1],
  rosybrown: [188, 143, 143, 1], royalblue: [65, 105, 225, 1],
  saddlebrown: [139, 69, 19, 1], salmon: [250, 128, 114, 1],
  sandybrown: [244, 164, 96, 1], seagreen: [46, 139, 87, 1],
  seashell: [255, 245, 238, 1], sienna: [160, 82, 45, 1],
  silver: [192, 192, 192, 1], skyblue: [135, 206, 235, 1],
  slateblue: [106, 90, 205, 1], slategray: [112, 128, 144, 1],
  slategrey: [112, 128, 144, 1], snow: [255, 250, 250, 1],
  springgreen: [0, 255, 127, 1], steelblue: [70, 130, 180, 1],
  tan: [210, 180, 140, 1], teal: [0, 128, 128, 1],
  thistle: [216, 191, 216, 1], tomato: [255, 99, 71, 1],
  turquoise: [64, 224, 208, 1], violet: [238, 130, 238, 1],
  wheat: [245, 222, 179, 1], white: [255, 255, 255, 1],
  whitesmoke: [245, 245, 245, 1], yellow: [255, 255, 0, 1],
  yellowgreen: [154, 205, 50, 1]
};

var colorType = {
  zero: function() { return [0,0,0,0]; },
  add: function(base, delta) {
    return [base[0] + delta[0], base[1] + delta[1],
            base[2] + delta[2], base[3] + delta[3]];
  },
  interpolate: function(from, to, f) {
    return [interp(from[0], to[0], f), interp(from[1], to[1], f),
            interp(from[2], to[2], f), interp(from[3], to[3], f)];
  },
  toCssValue: function(value) {
    return 'rgba(' + Math.round(value[0]) + ', ' + Math.round(value[1]) +
              ', ' + Math.round(value[2]) + ', ' + value[3] + ')';
  },
  fromCssValue: function(value) {
    var r = rgbRE.exec(value);
    if (r) {
      return [Number(r[1]), Number(r[2]), Number(r[3]), 1];
    }
    r = rgbaRE.exec(value);
    if (r) {
      return [Number(r[1]), Number(r[2]), Number(r[3]), Number(r[4])];
    }
    return namedColors[value];
  }
};

var extractDeg = function(deg) {
  var num  = Number(deg[1]);
  switch (deg[2]) {
  case 'grad':
    return num / 400 * 360;
  case 'rad':
    return num / 2 / Math.PI * 360;
  case 'turn':
    return num * 360;
  default:
    return num;
  }
};

var extractTranslationValues = function(lengths) {
  // TODO: Assuming all lengths are px for now
  var length1 = Number(lengths[1]);
  var length2 = lengths[3] ? Number(lengths[3]) : 0;
  return [length1, length2];
};

var extractTranslateValue = function(length) {
  // TODO: Assuming px for now
  return Number(length[1]);
};

var extractScaleValues = function(scales) {
  var scaleX = Number(scales[1]);
  var scaleY = scales[2] ? Number(scales[2]) : scaleX;
  return [scaleX, scaleY];
};

var transformREs = [
  [/^\s*rotate\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)?\)/,
      extractDeg, 'rotate'],
  [/^\s*rotateY\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)\)/,
      extractDeg, 'rotateY'],
  [/^\s*translateZ\(([+-]?(?:\d+|\d*\.\d+))(px)?\)/,
      extractTranslateValue, 'translateZ'],
  [/^\s*translate\(([+-]?(?:\d+|\d*\.\d+))(px)?(?:\s*,\s*([+-]?(?:\d+|\d*\.\d+))(px)?)?\)/,
      extractTranslationValues, 'translate'],
  [/^\s*scale\((\d+|\d*\.\d+)(?:\s*,\s*(\d+|\d*.\d+))?\)/,
      extractScaleValues, 'scale']
];

var transformType = {
  zero: function(t) { throw 'UNIMPLEMENTED'; },
  add: function(base, delta) { return base.concat(delta); },
  interpolate: function(from, to, f) {
    while (from.length < to.length) {
      from.push({t: null, d: null});
    }
    while (to.length < from.length) {
      to.push({t: null, d: null});
    }
    var out = []
    for (var i = 0; i < from.length; i++) {
      console.assert(from[i].t === to[i].t || from[i].t === null ||
        to[i].t === null,
        'Transform types should match or one should be the underlying value');
      var type = from[i].t ? from[i].t : to[i].t;
      out.push({t: type, d:interp(from[i].d, to[i].d, f, type)});
    }
    return out;
  },
  toCssValue: function(value, svgMode) {
    // TODO: fix this :)
    var out = ''
    for (var i = 0; i < value.length; i++) {
      console.assert(value[i].t, 'transform type should be resolved by now');
      switch (value[i].t) {
        case 'rotate':
        case 'rotateY':
          var unit = svgMode ? '' : 'deg';
          out += value[i].t + '(' + value[i].d + unit + ') ';
          break;
        case 'translateZ':
          out += value[i].t + '(' + value[i].d + 'px' + ') ';
          break;
        case 'translate':
          var unit = svgMode ? '' : 'px';
          if (value[i].d[1] === 0) {
            out += value[i].t + '(' + value[i].d[0] + unit + ') ';
          } else {
            out += value[i].t + '(' + value[i].d[0] + unit + ', ' +
                  value[i].d[1] + unit + ') ';
          }
          break;
        case 'scale':
          if (value[i].d[0] === value[i].d[1]) {
            out += value[i].t + '(' + value[i].d[0] + ') ';
          } else {
            out += value[i].t + '(' + value[i].d[0] + ', ' + value[i].d[1] +
                ') ';
          }
          break;
      }
    }
    return out.substring(0, out.length - 1);
  },
  fromCssValue: function(value) {
    // TODO: fix this :)
    var result = []
    while (value.length > 0) {
      var r = undefined;
      for (var i = 0; i < transformREs.length; i++) {
        var reSpec = transformREs[i];
        r = reSpec[0].exec(value);
        if (r) {
          result.push({t: reSpec[2], d: reSpec[1](r)});
          value = value.substring(r[0].length);
          break;
        }
      }
      if (r === undefined)
        return result;
    }
    return result;
  }
};

var propertyTypes = {
  'background-color': colorType,
  'background-position': percentLengthType,
  'border-bottom-color': colorType,
  'border-bottom-width': lengthType,
  'border-left-color': colorType,
  'border-left-width': lengthType,
  'border-right-color': colorType,
  'border-right-width': lengthType,
  'border-spacing': lengthType,
  'border-top-color': colorType,
  'border-top-width': lengthType,
  'bottom': percentLengthType,
  'clip': rectangleType,
  'color': colorType,
  'crop': rectangleType,
  'cx': lengthType,
  'font-size': percentLengthType,
  'font-weight': fontWeightType,
  'height': percentLengthType,
  'left': percentLengthType,
  'letter-spacing': lengthType,
  // TODO: should be both number and percent-length
  'line-height': percentLengthType,
  'margin-bottom': lengthType,
  'margin-left': lengthType,
  'margin-right': lengthType,
  'margin-top': lengthType,
  'max-height': percentLengthType,
  'max-width': percentLengthType,
  'min-height': percentLengthType,
  'min-width': percentLengthType,
  'opacity': numberType,
  'outline-color': colorType,
  // TODO: not clear why this is an integer in the transitions spec
  'outline-offset': integerType,
  'outline-width': lengthType,
  'padding-bottom': lengthType,
  'padding-left': lengthType,
  'padding-right': lengthType,
  'padding-top': lengthType,
  'right': percentLengthType,
  'text-indent': percentLengthType,
  'text-shadow': shadowType,
  'top': percentLengthType,
  'transform': transformType,
  '-webkit-transform': transformType,
  'vertical-align': percentLengthType,
  'visibility': visibilityType,
  'width': percentLengthType,
  'word-spacing': percentLengthType,
  'x': lengthType,
  'y': lengthType,
  'z-index': integerType,
};

var svgProperties = {
  // TODO: For browsers that support transform as a style attribute on SVG we
  // can delete this.
  'transform': 1,
  'cx': 1,
  'width': 1,
  'x': 1,
  'y': 1,
};


var propertyIsSVGAttrib = function(property, target) {
  return target.namespaceURI == 'http://www.w3.org/2000/svg' &&
      property in svgProperties;
};

var getType = function(property) {
  return propertyTypes[property] || nonNumericType;
}

var zero = function(property, value) {
  return getType(property).zero(value);
};

var add = function(property, base, delta) {
  return getType(property).add(base, delta);
}

/**
 * Interpolate the given property name (f*100)% of the way from 'from' to 'to'.
 * 'from' and 'to' are both CSS value strings. Requires the target element to
 * be able to determine whether the given property is an SVG attribute or not,
 * as this impacts the conversion of the interpolated value back into a CSS
 * value string for transform translations.
 *
 * e.g. interpolate('transform', elem, 'rotate(40deg)', 'rotate(50deg)', 0.3);
 *   will return 'rotate(43deg)'.
 */
var interpolate = function(property, from, to, f) {
  return getType(property).interpolate(from, to, f);
}

/**
 * Convert the provided interpolable value for the provided property to a CSS
 * value string. Note that SVG transforms do not require units for translate
 * or rotate values while CSS properties require 'px' or 'deg' units.
 */
var toCssValue = function(property, value, svgMode) {
  return getType(property).toCssValue(value, svgMode);
}

var fromCssValue = function(property, value) {
  return getType(property).fromCssValue(value);
}

/** @constructor */
var AnimatedResult = function(value, operation, fraction) {
  this.value = value;
  this.operation = operation;
  this.fraction = fraction;
};

/** @constructor */
var CompositedPropertyMap = function(target) {
  this.properties = {};
  this.target = target;
};

mixin(CompositedPropertyMap.prototype, {
  addValue: function(property, animValue) {
    if (!(property in this.properties)) {
      this.properties[property] = [];
    }
    if (!(animValue instanceof AnimatedResult)) {
      throw new TypeError('expected AnimatedResult');
    }
    this.properties[property].push(animValue);
  },
  applyAnimatedValues: function() {
    for (var property in this.properties) {
      var resultList = this.properties[property];
      if (resultList.length > 0) {
        var i;
        for (i = resultList.length - 1; i >= 0; i--) {
          if (resultList[i].operation == 'replace') {
            break;
          }
        }
        // the baseValue will either be retrieved after clearing the value or
        // will be overwritten by a 'replace'.
        var baseValue = undefined;
        if (i == -1) {
          clearValue(this.target, property);
          baseValue = fromCssValue(property, getValue(this.target, property));
          i = 0;
        }
        for ( ; i < resultList.length; i++) {
          var inValue = resultList[i].value;
          switch (resultList[i].operation) {
          case 'replace':
            baseValue = inValue;
            continue;
          case 'add':
            baseValue = add(property, baseValue, inValue);
            continue;
          case 'merge':
            baseValue = interpolate(property, baseValue, inValue,
                resultList[i].fraction);
            continue;
          }
        }
        var svgMode = propertyIsSVGAttrib(property, this.target);
        setValue(this.target, property, toCssValue(property, baseValue,
            svgMode));
        this.properties[property] = [];
      } else {
        // property has previously been set but no value was accumulated
        // in this animation iteration. Reset value and stop tracking.
        clearValue(this.target, property);
        delete this.properties[property];
      }
    }
  }
});

/** @constructor */
var Compositor = function() {
  this.targets = []
};

mixin(Compositor.prototype, {
  setAnimatedValue: function(target, property, animValue) {
    if (target._anim_properties === undefined) {
      target._anim_properties = new CompositedPropertyMap(target);
      this.targets.push(target);
    }
    target._anim_properties.addValue(property, animValue);
  },
  applyAnimatedValues: function() {
    for (var i = 0; i < this.targets.length; i++) {
      var target = this.targets[i];
      target._anim_properties.applyAnimatedValues();
    }
  }
});

var initializeIfSVGAndUninitialized = function(property, target) {
  if (propertyIsSVGAttrib(property, target)) {
    if (!isDefinedAndNotNull(target._actuals)) {
      target._actuals = {};
      target._bases = {};
      target.actuals = {};
      target._getAttribute = target.getAttribute;
      target._setAttribute = target.setAttribute;
      target.getAttribute = function(name) {
        if (isDefinedAndNotNull(target._bases[name])) {
          return target._bases[name];
        }
        return target._getAttribute(name);
      };
      target.setAttribute = function(name, value) {
        if (isDefinedAndNotNull(target._actuals[name])) {
          target._bases[name] = value;
        } else {
          target._setAttribute(name, value);
        }
      };
    }
    if(!isDefinedAndNotNull(target._actuals[property])) {
      var baseVal = target.getAttribute(property);
      target._actuals[property] = 0;
      target._bases[property] = baseVal;
      target.actuals.__defineSetter__(property, function(value) {
        if (value == null) {
          target._actuals[property] = target._bases[property];
          target._setAttribute(property, target._bases[property]);
        } else {
          target._actuals[property] = value;
          target._setAttribute(property, value)
        }
      });
      target.actuals.__defineGetter__(property, function() {
        return target._actuals[property];
      });
    }
  }
}

var setValue = function(target, property, value) {
  initializeIfSVGAndUninitialized(property, target);
  if (propertyIsSVGAttrib(property, target)) {
    target.actuals[property] = value;
  } else {
    target.style[property] = value;
  }
}

var clearValue = function(target, property) {
  initializeIfSVGAndUninitialized(property, target);
  if (propertyIsSVGAttrib(property, target)) {
    target.actuals[property] = null;
  } else {
    target.style[property] = null;
  }
}

var getValue = function(target, property) {
  initializeIfSVGAndUninitialized(property, target);
  if (propertyIsSVGAttrib(property, target)) {
    return target.actuals[property];
  } else {
    return getComputedStyle(target)[property];
  }
}

var rAFNo = undefined;

// Pass null for the parent, as TimedItem uses the default group, (ie this
// object) as the parent if no value is provided.
var DEFAULT_GROUP = new ParGroup([], {name: 'DEFAULT'}, null);

var compositor = new Compositor();

DEFAULT_GROUP._tick = function(parentTime) {
  this._updateTimeMarkers(parentTime);

  // Get animations for this sample
  // TODO: Consider reverting to direct application of values and sorting
  // inside the compositor.
  var animations = [];
  var allFinished = true;
  this.children.forEach(function(child) {
    animations = animations.concat(child._getItemsInEffect());
    allFinished &= parentTime > child.endTime;
  }.bind(this));

  // Apply animations in order
  animations.sort(function(funcA, funcB) {
    return funcA._sortOrder < funcB._sortOrder ?
        -1 :
        funcA._sortOrder === funcB._sortOrder ? 0 : 1;
  });
  for (var i = 0; i < animations.length; i++) {
    animations[i]._sample();
  }

  // Composite animated values into element styles
  compositor.applyAnimatedValues();

  if (window.webAnimVisUpdateAnims) {
    webAnimVisUpdateAnims();
  }

  return !allFinished;
}

// If requestAnimationFrame is unprefixed then it uses high-res time.
var useHighResTime = 'requestAnimationFrame' in window;
var requestAnimationFrame = window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame || // 80 wrap is so 80s
    window.mozRequestAnimationFrame || window.msRequestAnimationFrame;
var timeNow = undefined;
var timeZero = useHighResTime ? 0 : Date.now();

// Massive hack to allow things to be added to the parent group and start
// playing. Maybe this is right though?
DEFAULT_GROUP.__defineGetter__('iterationTime', function() {
  if (!isDefinedAndNotNull(timeNow)) {
    timeNow = useHighResTime ? performance.now() : Date.now() - timeZero;
    setTimeout(function() { timeNow = undefined; }, 0);
  }
  return timeNow / 1000;
});

var ticker = function(frameTime) {
  timeNow = frameTime - timeZero;
  if (DEFAULT_GROUP._tick(timeNow / 1000)) {
    rAFNo = requestAnimationFrame(ticker);
  } else {
    rAFNo = undefined;
  }
  timeNow = undefined;
};

var maybeRestartAnimation = function() {
  if (isDefinedAndNotNull(rAFNo)) {
    return;
  }
  rAFNo = requestAnimationFrame(ticker);
};

document.__defineGetter__('animationTimeline', function() {
  return DEFAULT_GROUP;
});
window.Animation = Animation;
window.Timing = Timing;
// TODO: this is not in the spec
window.TimingFunction = TimingFunction;
window.TimedItem = TimedItem;
// TODO: SplineTimingFunction ?
window.StepTimingFunction = StepTimingFunction;
// TODO: SmoothTimingFunction ?
window.AnimationGroup = AnimationGroup;
window.ParGroup = ParGroup;
window.SeqGroup = SeqGroup;
window.KeyframesAnimationFunction = KeyframesAnimationFunction;
window.Keyframe = Keyframe;
window.PathAnimationFunction = PathAnimationFunction;
window.GroupedAnimationFunction = GroupedAnimationFunction;

})();
