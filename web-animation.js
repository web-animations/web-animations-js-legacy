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
var webAnimVisUpdateAnims = undefined;

var Timing = Class.create({
	initialize: function(timingDict) {
		this.startDelay = timingDict.startDelay || 0.0;
		this.duration = timingDict.duration;
		this.iterationCount = timingDict.iterationCount || 1.0;
		this.iterationStart = timingDict.iterationStart || 0.0;
		this.playbackRate = exists(timingDict.playbackRate) ? timingDict.playbackRate : 1.0;
		//this.playbackRate = timingDict.playbackRate || 1.0;
		this.direction = timingDict.direction || "normal";
		if (typeof timingDict.timingFunc === "string") {
			// TODO: Write createFromString
			throw "createFromString not implemented";
			this.timingFunc = TimingFunc.createFromString(timingDict.timingFunc);
		} else {
			this.timingFunc = timingDict.timingFunc;
		}
		this.fill = timingDict.fill || "forwards";
	},
	clone: function() {
		return new Timing(
			{ startDelay: this.startDelay,
				duration: this.duration,
				iterationCount: this.iterationCount,
				iterationStart: this.iterationStart,
				playbackRate: this.playbackRate,
				direction: this.direction,
				timingFunc: this.timingFunc ? this.timingFunc.clone() : null,
				fill: this.fill
			});
	},
})

function ImmutableTimingProxy(timing) {
	return new TimingProxy(timing, function(v) { throw "can't modify timing properties of templated Animation Instances"});
}

var TimingProxy = Class.create({
	initialize: function(timing, setter) {
		this.timing = timing;
		["startDelay", "duration", "iterationCount", "iterationStart", "playbackRate", "direction", "timingFunc", "fill"].forEach(function(s) {
			this.__defineGetter__(s, function() { return timing[s]; });
			this.__defineSetter__(s, function(v) { var old = timing[s]; timing[s] = v; try { setter(v); } catch (e) { timing[s] = old; throw e;}});			
		}.bind(this));
	},
	extractMutableTiming: function() {
		return new Timing(
			{ startDelay: this.timing.startDelay,
				duration: this.timing.duration,
				iterationCount: this.timing.iterationCount,
				iterationStart: this.timing.iterationStart,
				playbackRate: this.timing.playbackRate,
				direction: this.timing.direction,
				timingFunc: this.timing.timingFunc ?
				            this.timing.timingFunc.clone() : null,
				fill: this.timing.fill
			});
	},
	clone: function() {
		return this.timing.clone();
	}
})

var TimedTemplate = Class.create({
	initialize: function(timing) {
		this.timing = new TimingProxy(timing || new Timing({}), function() { this.updateTiming()}.bind(this));
		this.linkedAnims = [];
	},
	addLinkedAnim: function(anim) {
		this.linkedAnims.push(anim);
	},
	removeLinkedAnim: function(anim) {
		var i = this.linkedAnims.indexOf(anim);
		if (i >= 0) {
			this.linkedAnims.splice(i, 1);
		}
	},
	updateTiming: function() {
		this.linkedAnims.forEach(function(a) { a.updateIterationDuration(); });
	},
	_animate: function(isLive, targets, parentGroup, startTime) {
		if (!Array.isArray(targets) && !(targets instanceof NodeList)) {
			return this.__animate(isLive, [targets], parentGroup, startTime)[0];
		}
		return this.__animate(isLive, targets, parentGroup, startTime);
	},
	__animate: function(isLive, targets, parentGroup, startTime) {
		return undefined; // TimedTemplates don't actually work by themselves.
	},
	animate: function(targets, startTime) {
		return this._animate(false, targets, DEFAULT_GROUP, startTime);
	},
	animateWithParent: function(targets, parent, startTime) {
		return this._animate(false, targets, parent, startTime);
	},
	animateLive: function(targets, startTime) {
		return this._animate(true, targets, DEFAULT_GROUP, startTime);
	},
	animateLiveWithParent: function(targets, parent, startTime) {
		return this._animate(true, targets, parent, startTime);
	}
});

function exists(val) {
	return val != undefined;
}

var ST_MANUAL = 0;
var ST_AUTO = 1;
var ST_FORCED = 2;

var TimedItem = Class.create({
	initialize: function(timing, startTime, parentGroup) {
		this.timing = new TimingProxy(timing, function() {this.updateIterationDuration()}.bind(this));
		this._startTime = startTime;
		this.updateIterationDuration();
		this.currentIteration = null;
		this.iterationTime = null;
		this.animationTime = null;
		this._reversing = false;

		if (typeof parentGroup == "undefined") {
			this.parentGroup = DEFAULT_GROUP;
		} else if (parentGroup instanceof TimedItem) {
			this.parentGroup = parentGroup;
		} else {
			throw new TypeError("parentGroup is not a TimedItem");
		}

		if (typeof startTime == "undefined") {
			this._startTimeMode = ST_AUTO;
			if (this.parentGroup) {
				this._startTime = this.parentGroup.iterationTime || 0;
			} else {
				this._startTime = 0;
			}
		} else {
			this._startTimeMode = ST_MANUAL;
			this._startTime = startTime;
		}
		this.endTime = this._startTime + this.animationDuration + this.timing.startDelay;
		if (this.parentGroup) {
			this.parentGroup._addChild(this);
		}
		this.paused = false;
		this.timeDrift = 0;
		this.__defineGetter__("_effectiveParentTime", function() {
			return this.parentGroup && this.parentGroup.iterationTime
			  ? this.parentGroup.iterationTime
			  : 0;
		});
		this.__defineGetter__("currentTime", function() {
			return this._effectiveParentTime - this._startTime - this.timeDrift;
		});
		this.__defineSetter__("currentTime", function(seekTime) {
			this.timeDrift = this._effectiveParentTime - this._startTime - seekTime;
			this.updateTimeMarkers();
			if (this.parentGroup) {
				this.parentGroup._childrenStateModified();
			}
		});
		this.__defineGetter__("startTime", function() {
			return this._startTime;
		});
		this.__defineSetter__("startTime", function(newStartTime) {
			if (this.parentGroup && this.parentGroup.type === "seq") {
				throw new Error("NoModificationAllowedError");
			}
			this._startTime = newStartTime;
			this._startTimeMode = ST_MANUAL;
			this.updateTimeMarkers();
			if (this.parentGroup) {
				this.parentGroup._childrenStateModified();
			}
		});
	},
	reparent: function(parentGroup) {
		if (this.parentGroup) {
			this.parentGroup.remove(this.parentGroup.indexOf(this), 1);
		}
		this.parentGroup = parentGroup;
		this.timeDrift = 0;
		if (this._startTimeMode == ST_FORCED &&
			  (!parentGroup || parentGroup != "seq")) {
			this._startTime = this._stashedStartTime;
			this._startTimeMode = this._stashedStartTimeMode;
		}
		if (this._startTimeMode == ST_AUTO) {
			this._startTime = this.parentGroup.iterationTime || 0;
		}
		this.updateTimeMarkers();
	},
	// TODO: take timing.iterationStart into account. Spec needs to as well.
	updateIterationDuration: function() {
		if (exists(this.timing.duration) && this.timing.duration >= 0) {
			this.duration = this.timing.duration;
		} else {
			this.duration = this.intrinsicDuration();
		}
		// Section 6.10: Calculating the intrinsic animation duration
		var repeatedDuration = this.duration * this.timing.iterationCount;
		this.animationDuration = repeatedDuration / Math.abs(this.timing.playbackRate);
		this.updateTimeMarkers();
		if (this.parentGroup) {
			this.parentGroup._childrenStateModified();
		}
	},
	updateTimeMarkers: function(parentTime) {
		this.endTime = this._startTime + this.animationDuration + this.timing.startDelay + this.timeDrift;
		if (this.parentGroup && this.parentGroup.iterationTime) {
			this.itemTime = this.parentGroup.iterationTime - this._startTime - this.timeDrift;
		} else if (typeof parentTime !== "undefined") {
			this.itemTime = parentTime;
		} else {
			this.itemTime = null;
		}
		//console.log(this.name + ": endTime, itemTime", this.endTime, this.itemTime);
		if (this.itemTime !== null) {
			if (this.itemTime < this.timing.startDelay) {
				if (((this.timing.fill == "backwards") && (this._reversing == false)) 
					|| this.timing.fill == "both" 
					|| ((this.timing.fill == "forwards") && this._reversing)) {
					this.animationTime = 0;
				} else {
					this.animationTime = null;
				}
			} else if (this.itemTime < this.timing.startDelay + this.animationDuration) {
				this.animationTime = this.itemTime - this.timing.startDelay;
			} else {
				if (((this.timing.fill == "forwards") && (this._reversing == false))
					|| this.timing.fill == "both" 
					|| ((this.timing.fill == "backwards") && this._reversing)) {
					this.animationTime = this.animationDuration;
				} else {
					this.animationTime = null;
				}
			}
			if (this.animationTime === null) {
				var adjustedAnimationTime = null;
				this.iterationTime = null;
				this.currentIteration = null;
				this._timeFraction = null;
			} else {
				var iterationStart = Math.max(0, Math.min(this.timing.iterationStart, this.timing.iterationCount));
				var iterationCount = Math.max(0, this.timing.iterationCount);
				var startOffset = iterationStart * this.duration;
				var effectiveSpeed = this._reversing ? -this.timing.playbackRate : this.timing.playbackRate;
				if (effectiveSpeed < 0) {
					var adjustedAnimationTime = (this.animationTime - this.animationDuration) * effectiveSpeed + startOffset;
				} else {
					var adjustedAnimationTime = this.animationTime * effectiveSpeed + startOffset;
				}
				if (adjustedAnimationTime == 0) {
					this.currentIteration = 0;
				} else if (this.duration == 0) {
					this.currentIteration = Math.floor(iterationCount);
				} else {
					this.currentIteration = Math.floor(adjustedAnimationTime / this.duration);
				}
				if (this.duration == 0) {
					var unscaledIterationTime = 0;
				} else {
					var repeatedDuration = this.duration * this.timing.iterationCount;
					// TODO: ???
					if (adjustedAnimationTime - startOffset == repeatedDuration && (iterationCount - iterationStart) % 1 == 0) {
						var unscaledIterationTime = this.duration;
					} else {
						var unscaledIterationTime = adjustedAnimationTime % this.duration;
					}
				}
				var scaledIterationTime = unscaledIterationTime;
				if (this.timing.direction == "normal") {
					var currentDirection = 1;
				} else if (this.timing.direction == "reverse") {
					var currentDirection = -1;
				} else {
					var d = this.currentIteration;
					if (this.timing.direction == "alternate-reverse") {
						d += 1;
					}
					// TODO: 6.11.2 step 3. wtf?
					var currentDirection = d % 2 == 0 ? 1 : -1;
				}
				this.iterationTime = currentDirection == 1 ? scaledIterationTime : this.duration - scaledIterationTime;
				this._timeFraction = this.iterationTime / this.duration;
				if (this.timing.timingFunc) {
					this._timeFraction = this.timing.timingFunc.scaleTime(this._timeFraction);
					this.iterationTime = this._timeFraction * this.duration;
				}
			}
		} else {
			this.animationTime = null;
			this.iterationTime = null;
			this.currentIteration = null;
			this._timeFraction = null;
		}
		if (webAnimVisUpdateAnims) {
			webAnimVisUpdateAnims();
		}
		var chillen = (!this.children) || this.children.length == 0 ? "NONE" : this.children.map(function(a) { return a.name; }).reduce(function(a, b) { return a + ", " + b});
		//console.log("name parent children start end item anim iter currentIter tf:", this.name, this.parentGroup ? this.parentGroup.name : "NONE", chillen, this.startTime, this.endTime, this.itemTime, this.animationTime, this.iterationTime, this.currentIteration, this._timeFraction);
	},
	pause: function() {
		this.paused = true;
		// TODO: update timing parameters
	},
	unpause: function() {
		this.paused = false;
	},
	getPauseState: function() {
		return this.paused;
	},
	isPaused: function() {
		return getPauseState() || this.parentGroup.isPaused();
	},
	seek: function(itemTime) {
		// TODO
	},
	changePlaybackRate: function(playbackRate) {
		timing.playbackRate = playbackRate;
		// TODO: perform compensatory seek
	},
	reverse: function() {
		if (this.currentTime === null) {
			var seekTime = 0;
		} else if (this.currentTime < this.timing.startDelay) {
			var seekTime = this.timing.startDelay + this.animationDuration;
		} else if (this.currentTime > this.timing.startDelay + this.animationDuration) {
			var seekTime = this.timing.startDelay;
		} else {
			var seekTime = this.timing.startDelay + this.animationDuration - this.currentTime;
		}

		this.currentTime = seekTime;
		this._reversing = !(this._reversing);
	},
	cancel: function() {
		if (this.parentGroup) {
			this.parentGroup.remove(this.parentGroup.indexOf(this), 1);
		}
		// TODO: Throw an exception if we're part of a template group?
		// How this should work is still unresolved in the spec
	},
	play: function() {
		// TODO: This should unpause as well
		if (this.currentTime > this.animationDuration + this.timing.startDelay && this.timing.playbackRate >= 0) {
			this.currentTime = this.timing.startDelay;
		}
	},
	_parentToGlobalTime: function(parentTime) {
	  if (!this.parentGroup)
			return parentTime;
		return parentTime + DEFAULT_GROUP.currentTime -
												this.parentGroup.iterationTime;
	},
});

function keyframesFor(property, startVal, endVal) {
	var animFun = new KeyframeAnimFunc(property);
	if (startVal) {
		animFun.frames.add(new Keyframe(startVal, 0));
	}
	animFun.frames.add(new Keyframe(endVal, 1));
	return animFun;
}

function keyframesForValues(property, values) {
	var animFun = new KeyframeAnimFunc(property);
	for (var i = 0; i < values.length; i++) {
		animFun.frames.add(new Keyframe(values[i], i / (values.length - 1)));
	}
	return animFun;
}

function _interpretAnimFunc(animFunc) {
	if (animFunc instanceof AnimFunc) {
		return animFunc;
	} else if (typeof(animFunc) === "object") {
		// Test if the object is actually a CustomAnimFunc
		// (how does WebIDL actually differentiate different callback interfaces?)
		if (animFunc.hasOwnProperty("sample") &&
				typeof(animFunc.sample) === "function") {
			return animFunc;
		} else {
			return AnimFunc.createFromProperties(animFunc);
		}
	} else {
		try {
			throw new Error("TypeError");
		} catch (e) { console.log(e.stack); throw e; }
	}
}

function _interpretTimingParam(timing) {
	if (typeof(timing) === "undefined" || timing === null) {
		return new Timing({});
	}
	if (timing instanceof Timing || timing instanceof TimingProxy) {
		return timing;
	}
	if (typeof(timing) === "number") {
		return new Timing({duration: timing});
	}
	if (typeof(timing) === "object") {
		return new Timing(timing);
	}
	throw new TypeError("timing parameters must be undefined, Timing objects, numbers, or timing dictionaries; not \"" + timing + "\"");
}

// -----------
// Anim Object
// -----------

function LinkedAnim(target, template, parentGroup, startTime) {
	var anim = new Anim(target, template.animFunc,
	                    new ImmutableTimingProxy(template.timing),
	                    parentGroup, startTime);
	anim.template = template;
	template.addLinkedAnim(anim);
	return anim;
}

function ClonedAnim(target, cloneSource, parentGroup, startTime) {
	var anim = new Anim(target, cloneSource.timing.clone(),
	                    cloneSource.animFunc.clone(), parentGroup, startTime);
}

var Anim = Class.create(TimedItem, {
	initialize: function($super, target, animFunc, timing, parentGroup, startTime) {
		this.animFunc = _interpretAnimFunc(animFunc);
		this.timing = _interpretTimingParam(timing);

		$super(this.timing, startTime, parentGroup);

		// TODO: correctly extract the underlying value from the element
		this.underlyingValue = null;
		if (target && this.animFunc instanceof AnimFunc) {
			this.underlyingValue = this.animFunc.getValue(target);
		}
		this.template = null;
		this.targetElement = target;
		this.name = this.animFunc instanceof KeyframeAnimFunc
		          ? this.animFunc.property
		          : "<anon>";
	},
	unlink: function() {
		var result = this.template;
		if (result) {
			this.timing = this.timing.extractMutableTiming();
			// TODO: Does animFunc need to have a FuncProxy too?
			this.animFunc = this.animFunc.clone();
			this.template.removeLinkedAnim(this);
		}
		this.template = null;
		return result;
	},
	templatize: function() {
		if (this.template) {
			return this.template;
		}
		// TODO: What resolution strategy, if any, should be employed here?
		var animFunc = this.animFunc
			? this.animFunc.hasOwnProperty('clone')
				? this.animFunc.clone() : this.animFunc
			: null;
		var template = new AnimTemplate(animFunc, this.timing.clone());
		this.template = template;
		this.animFunc = template.animFunc;
		this.timing = new ImmutableTimingProxy(template.timing);
		this.template.addLinkedAnim(this);
		return template;
	},
	intrinsicDuration: function() {
		// section 6.6
		return Infinity;
	},
	_zero: function() {
	  if (this.animFunc instanceof AnimFunc) {
			this.animFunc.zeroPoint(this.targetElement, this.underlyingValue);
		}
		//this.targetElement.innerHTML = "ZERO"
	},
	_getSampleFuncs: function() {
		var prevTimeFraction = this._timeFraction;
		this.updateTimeMarkers();

		if (this._timeFraction === null)
			return new Array();

		var rv = { startTime: this._parentToGlobalTime(this.startTime),
			target: this.targetElement,
			clearFunc: function() { this._zero(); }.bind(this),
			sampleFunc:
				function() {
					if (this.animFunc instanceof AnimFunc) {
						this.animFunc.sample(this._timeFraction,
							this.currentIteration, this.targetElement,
							this.underlyingValue);
					} else if (this.animFunc) {
						this.animFunc.sample.call(this.animFunc, this._timeFraction,
							this.currentIteration, this.targetElement);
					}
				}.bind(this)
		};
		return new Array(rv);
	},
	toString: function() {
		var funcDescr = this.animFunc instanceof AnimFunc
			? this.animFunc.toString()
			: "Custom scripted function";
		return "Anim " + this.startTime + "-" + this.endTime + " (" + this.timeDrift+ ") " + funcDescr;
	}
});

var AnimTemplate = Class.create(TimedTemplate, {
	initialize: function($super, animFunc, timing, resolutionStrategy) {
		this.animFunc = _interpretAnimFunc(animFunc);
		this.timing = _interpretTimingParam(timing);
		$super(this.timing);
		this.resolutionStrategy = resolutionStrategy;
		// TODO: incorporate name into spec?
		// this.name = properties.name;
	},
	reparent: function(parentGroup) {
		// TODO: does anything need to happen here?
	},
	__animate: function($super, isLive, targets, parentGroup, startTime) {
		if (this.resolutionStrategy) {
			strategy = this.resolutionStrategy.split(":").map(function(a) { return a.strip(); });
			var newTargets = [];
			switch (strategy[0]) {
				case "selector":
					[].forEach.call(targets, function(target) {
						var id;
						var removeId;
						if (target.id) {
							id = target.id;
							removeId = false;
						} else {
							id = "___special_id_for_resolution_0xd3adb33f";
							target.id = id;
							removeId = true;
						}
						selector = "#" + id + " " + strategy[1];
						var selectResult = document.querySelectorAll(selector);
						if (removeId) {
							target.id = undefined;
						}
						[].forEach.call(selectResult, function(newTarget) { newTargets.push(newTarget); });
					});
					break;
				case "target":
					newTargets = strategy[1].split(",").map(function(a) { return document.getElementById(a.strip()); });
					break;
				default:
					throw "Unknown resolutionStrategy " + strategy[0];
			}
			targets = newTargets;
		}

		var instances = [];
		[].forEach.call(targets, function(target) {
			var instance = LinkedAnim(target, this, parentGroup, startTime);
			if (!isLive) {
				instance.unlink();
			}
			instances.push(instance);
		}.bind(this));
		return instances;
	}
});

// To use this, need to have children and length member variables.
var AnimListMixin = {
	initListMixin: function(beforeListChange, onListChange) {
		this._clear();
		this.onListChange = onListChange;
		this.beforeListChange = beforeListChange;
	},
	clear: function() {
		this.beforeListChange();
		this._clear();
		this.onListChange();
	},
	_clear: function() {
		this.children = [];
		var oldLength = this.length;
		this.length = 0;
		this._deleteIdxAccessors(0, oldLength);
		// TODO: call cancel on children? Update timing?
	},
	_createIdxAccessors: function(start, end) {
		for (var i = start; i < end; i++) {
			this.__defineSetter__(i, function(x) { this.children[i] = x; });
			this.__defineGetter__(i, function() { return this.children[i]; });
		}
	},
	_deleteIdxAccessors: function(start, end) {
		for (var i = start; i < end; i++) {
			delete this[i];
		}
	},
	add: function() {
		var newItems = [];
		for (var i = 0; i < arguments.length; i++) {
			newItems.push(arguments[i]);
		}
		this.splice(this.length, 0, newItems);
		return newItems;
	},
	// Specialized add method so that templated groups can still have children added by the library.
	_addChild: function(child) {
		this.children.push(child);
		this._createIdxAccessors(this.length, this.length + 1);
		this.length = this.children.length;
		this.onListChange();
	},
	item: function(index) {
		return this.children[index];
	},
	indexOf: function(item) {
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i] === item) {
				return i;
			}
		}
		return -1;
	},
	splice: function() {
		this.beforeListChange();

		// Read params
		var start = arguments[0];
		var deleteCount = arguments[1];
		var newItems = [];
		if (Array.isArray(arguments[2])) {
			newItems = arguments[2];
		} else {
			for (var i = 2; i < arguments.length; i++) {
				newItems.push(arguments[i]);
			}
		}

		var removedItems = new Array();
		var len = this.length;

		// Interpret params
		var actualStart = start < 0
		                ? Math.max(len + start, 0)
		                : Math.min(start, len);
		var actualDeleteCount =
			Math.min(Math.max(deleteCount, 0), len - actualStart);

		// Reparent items
		for (var i = 0; i < newItems.length; i++) {
			newItems[i].reparent(this);
		}

		// Delete stage
		if (actualDeleteCount) {
			removedItems = this.children.splice(actualStart, actualDeleteCount);
			for (var i = 0; i < removedItems.length; i++) {
				removedItems[i].parentGroup = null;
			}
			this._deleteIdxAccessors(actualStart, actualStart + actualDeleteCount);
		}

		// Add stage
		if (newItems.length) {
			for (var i = 0; i < newItems.length; i++) {
				this.children.splice(actualStart+i, 0, newItems[i]);
			}
			this._createIdxAccessors(actualStart, actualStart + newItems.length);
		}

		this.length = this.children.length;
		this.onListChange();

		return removedItems;
	},
	remove: function(index, count) {
		if (typeof count === "undefined") {
			count = 1;
		}
		return this.splice(index, count);
	}
}

var AnimGroup = Class.create(TimedItem, AnimListMixin, {
	initialize: function($super, type, template, children, timing, startTime, parentGroup) {
		this.type = type || "par"; // used by TimedItem via intrinsicDuration(), so needs to be set before initializing super.
		this.initListMixin(this._assertNotLive, this._childrenStateModified);
		var completedTiming = _interpretTimingParam(timing);
		$super(completedTiming, startTime, parentGroup);
		this.template = template;
		if (template) {
			template.addLinkedAnim(this);
		}
		if (children && Array.isArray(children)) {
			for (var i = 0; i < children.length; i++) {
				this.add(children[i]);
			}
		}
		// TODO: Work out where to expose name in the API
		// this.name = properties.name || "<anon>";
	},
	_assertNotLive: function() {
		if (this.template) {
			throw "Can't modify tree of AnimGroupInstances with templates"
		}
	},
	templatize: function() {
		if (!this.template) {
			var timing = this.timing.clone();
			var template = this.type == "par"
				? new ParAnimGroupTemplate(null, timing)
				: new SeqAnimGroupTemplate(null, timing);
			this.timing = new ImmutableTimingProxy(template.timing);
			for (var i = 0; i < this.children.length; i++) {
				template.add(this.children[i].templatize());
			}
			this.template = template;
			this.template.addLinkedAnim(this);
		}
		return this.template;
	},
	_childrenStateModified: function() {
		this.updateIterationDuration();
		this._updateChildStartTimes();
		this.updateTimeMarkers();
		if (this.parentGroup) {
			this.parentGroup._childrenStateModified();
		} else {
			maybeRestartAnimation();
		}
	},
	_updateChildStartTimes: function() {
		if (this.type == "seq") {
			var cumulativeStartTime = 0;
			this.children.forEach(function(child) {
				if (child._startTimeMode != ST_FORCED) {
					child._stashedStartTime = child._startTime;
					child._stashedStartTimeMode = child._startTimeMode;
					child._startTimeMode = ST_FORCED;
				}
				child._startTime = cumulativeStartTime;
				child.updateTimeMarkers();
				cumulativeStartTime += Math.max(0, child.timing.startDelay + child.animationDuration);
			}.bind(this));
		}
	},
	unlink: function() {
		var acted = this.template != null;
		if (this.template) {
			this.template.removeLinkedAnim(this);
			this.timing = this.template.timing.clone();
		}
		this.template = null;
		return acted;
	},
	getActiveAnimations: function() {
		var result = [];
		if (this._timeFraction === null) {
			return result;
		}
		for (var i = 0; i < this.children.length; i++) {
			if (this.children[i]._timeFraction !== null) {
				if (this.children[i].getActiveAnimations) {
					result = result.concat(this.children[i].getActiveAnimations());
				} else {
					result.push(this.children[i]);
				}
			}
		}
		return result;
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
	intrinsicDuration: function() {
		if (this.type == "par") {
			var dur = Math.max.apply(undefined, this.children.map(function(a) { return a.endTime; }));
			return dur;
		} else if (this.type == "seq") {
			var result = 0;
			this.children.forEach(function(a) { result += a.animationDuration + a.timing.startDelay; });
			return result;
		} else {
			throw "Unsupported type " + this.type;
		}
	},
	_zero: function() {
		this.children.forEach(function(child) { child._zero(); });
	},
	_getSampleFuncs: function() {
		this.updateTimeMarkers();
		var sampleFuncs = [];
		this.children.forEach(function(child) {
			sampleFuncs = sampleFuncs.concat(child._getSampleFuncs());
		}.bind(this));
		return sampleFuncs;
	},
	toString: function() {
		return this.type + " " + this.startTime + "-" + this.endTime + " (" + this.timeDrift+ ") " + " [" + this.children.map(function(a) { return a.toString(); }) + "]"
	}
});

var ParAnimGroup = Class.create(AnimGroup, {
	initialize: function($super, children, timing, parentGroup, startTime) {
		$super("par", undefined, children, timing, startTime, parentGroup);
	}
});

var SeqAnimGroup = Class.create(AnimGroup, {
	initialize: function($super, children, timing, parentGroup, startTime) {
		$super("seq", undefined, children, timing, startTime, parentGroup);
	}
});

var AnimGroupTemplate = Class.create(TimedTemplate, AnimListMixin, {
	initialize: function($super, type, children, timing, resolutionStrategy) {
		$super(timing);
		this.type = type;
		this.resolutionStrategy = resolutionStrategy;
		this.initListMixin(function() {}, function() {});
		if (children && Array.isArray(children)) {
			for (var i = 0; i < children.length; i++) {
				this.add(children[i]);
			}
		}
	},
	reparent: function(parentGroup) {
		// TODO: does anything need to happen here?
	},
	__animate: function($super, isLive, targets, parentGroup, startTime) {
		var instances = [];
		for (var i = 0; i < targets.length; i++) {
			var instance = new AnimGroup(this.type, this, [], this.timing, startTime, parentGroup);
			if (!isLive) {
				instance.unlink();
			}
			for (var j = 0; j < this.length; j++) {
				if (isLive) {
					var childInstance = this.children[j].animateLiveWithParent(targets[i], instance, startTime);
				} else {
					var childInstance = this.children[j].animateWithParent(targets[i], instance, startTime);
				}
			}
			instances.push(instance);
		}
		return instances;
	}
});

var ParAnimGroupTemplate = Class.create(AnimGroupTemplate, {
	initialize: function($super, children, timing, resolutionStrategy) {
		$super("par", children, timing, resolutionStrategy);
	}
});

var SeqAnimGroupTemplate = Class.create(AnimGroupTemplate, {
	initialize: function($super, children, properties, resolutionStrategy) {
		$super("seq", children, properties, resolutionStrategy);
	}
});

var AnimFunc = Class.create({
	initialize: function(operation, accumulateOperation) {
		this.operation = operation | "replace";
		this.accumulateOperation = accumulateOperation | "replace";
	},
	sample: function(timeFraction, currentIteration, target, underlyingValue) {
		throw "Unimplemented sample function";
	},
	zeroPoint: function(target) {
		return;
	},
	getValue: function(target) {
		return;
	},
	clone: function() {
		throw "Unimplemented clone method"
	}
});

AnimFunc.createFromProperties = function(properties) {
	// Step 1 - determine set of animation properties
	var animProps = [];
	for (var candidate in properties) {
		if (supportedProperties.hasOwnProperty(candidate)) {
			animProps.push(candidate);
		}
	}

	// Step 2 - Create AnimFunc objects
	if (animProps.length === 0) {
		return null;
	} else if (animProps.length === 1) {
		return AnimFunc._createKeyframeFunc(animProps[0], properties[animProps[0]]);
	} else {
		// TODO: GroupAnimFunc
		try {
			throw new Error("UnsupportedError");
		} catch (e) { console.log(e.stack); throw e; }
	}
}

// Step 3 - Create a KeyframeAnimFunc object
AnimFunc._createKeyframeFunc = function(property, value) {
	var func = new KeyframeAnimFunc(property);

	if (typeof value === "string") {
		func.frames.add(new Keyframe(value, 1));
	} else if (Array.isArray(value)) {
		for (var i = 0; i < value.length; i++) {
			if (typeof value[i] !== "string") {
				try {
					throw new Error("TypeError");
				} catch (e) { console.log(e.stack); throw e; }
			}
			var offset = i / (value.length - 1);
			func.frames.add(new Keyframe(value[i], offset));
		}
	} else {
		try {
			throw new Error("TypeError");
		} catch (e) { console.log(e.stack); throw e; }
	}
	// TODO: Need to handle KeyframeDict objects once they're defined

	return func;
}

var KeyframeAnimFunc = Class.create(AnimFunc, {
	initialize: function($super, property, operation, accumulateOperation) {
		$super(operation, accumulateOperation);
		this.property = property;
		this.frames = new KeyframeList();
	},
	sortedFrames: function() {
		this.frames.frames.sort(function(a, b) {
			if (a.offset < b.offset) {
				return -1;
			}
			if (a.offset > b.offset) {
				return 1;
			}
			return 0;
		});
		return this.frames.frames;
	},
	sample: function(timeFraction, currentIteration, target, underlyingValue) {
		var frames = this.sortedFrames();
		if (frames.length == 0) {
			return;
		}
		var afterFrameNum = null;
		var beforeFrameNum = null;
		var i = 0;
		while (i < frames.length) {
			if (frames[i].offset == timeFraction) {
				// TODO: This should probably call fromCssValue and toCssValue for cases
				// where we have to massage the data before setting e.g. 'rotate(45deg)'
				// is valid, but for UAs that don't support CSS Transforms syntax on SVG
				// content we have to convert that to 'rotate(45)' before setting.
				setValue(target, this.property, frames[i].value);
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
			// starts at 0, rather than to use the underlying value.
			if (frames[0].offset === 0) {
				afterFrameNum = frames.length > 1 ? 1 : frames.length;
				beforeFrameNum = 0;
			} else {
				beforeFrameNum = -1;
			}
		} else if (afterFrameNum == null) {
			// In the case where we have a time fraction greater than 1 and a keyframe
			// at 1, the expected behavior is to extrapolate the interval that ends at
			// 1, rather than to use the underlying value.
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
			beforeFrame = {value: underlyingValue, offset: 0};
		} else {
			beforeFrame = frames[beforeFrameNum];
		}

		if (afterFrameNum == frames.length) {
			afterFrame = {value: underlyingValue, offset: 1};
		} else {
			afterFrame = frames[afterFrameNum];
		}
		// TODO: apply time function
		var localTimeFraction = (timeFraction - beforeFrame.offset) / (afterFrame.offset - beforeFrame.offset);
		// TODO: property-based interpolation for things that aren't simple
		var animationValue = interpolate(this.property, target, beforeFrame.value, afterFrame.value, localTimeFraction);
		setValue(target, this.property, animationValue);
	},
	zeroPoint: function(target, underlyingValue) {
		setValue(target, this.property, underlyingValue);
	},
	getValue: function(target) {
		return getValue(target, this.property);
	},
	clone: function() {
		var result = new KeyframeAnimFunc(this.property, this.operation, this.accumulateOperation);
		result.frames = this.frames.clone();
		return result;
	},
	toString: function() {
		return this.property;
	}
});

var Keyframe = Class.create({
	initialize: function(value, offset, timingFunc) {
		this.value = value;
		this.offset = offset;
		this.timingFunc = timingFunc;
	}
});

var KeyframeList = Class.create({
	initialize: function() {
		this.frames = [];
		this.__defineGetter__("length", function() {return this.frames.length; });
	},
	item: function(index) {
		if (index >= this.length || index < 0) {
			return null;
		}
		return this.frames[index];
	},
	add: function(frame) {
		this.frames.push(frame);
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
			result.add(new Keyframe(this.frames[i].value, this.frames[i].offset, this.frames[i].timingFunc));
		}
		return result;
	}
});

var presetTimings = {
	"ease-in" : [0.42, 0, 1.0, 1.0],
	"ease-out" : [0, 0, 0.58, 1.0]
}

var TimingFunc = Class.create({
	initialize: function(spec) {
		if (spec.length == 4) {
			this.params = spec;
		} else {
			this.params = presetTimings[spec];
		}
		this.map = []
		for (var ii = 0; ii <= 100; ii += 1) {
			var i = ii / 100;
			this.map.push([3*i*(1-i)*(1-i)*this.params[0] + 3*i*i*(1-i)*this.params[2] + i*i*i,
							 3*i*(1-i)*(1-i)*this.params[1] + 3*i*i*(1-i)*this.params[3] + i*i*i])
		}
	},
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
		return new TimingFunc(this.params);
  }
});

function _interp(from, to, f) {
	if (Array.isArray(from) || Array.isArray(to)) {
		return _interpArray(from, to, f);
	}
	to   = to   || 0.0;
	from = from || 0.0;
	return to * f + from * (1 - f);
}

function _interpArray(from, to, f) {
	console.assert(Array.isArray(from) || from === null,
		"From is not an array or null");
	console.assert(Array.isArray(to) || to === null,
		"To is not an array or null");
	console.assert(from === null || to === null || from.length === to.length,
		"Arrays differ in length");
	var length = from ? from.length : to.length;

	var result = [];
	for (var i = 0; i < length; i++) {
		result[i] = _interp(from ? from[i] : 0.0, to ? to[i] : 0.0, f);
	}
	return result;
}

var supportedProperties = new Array();
supportedProperties["opacity"] = { type: "number", isSVGAttrib: false };
supportedProperties["left"]    = { type: "length", isSVGAttrib: false };
supportedProperties["top"]     = { type: "length", isSVGAttrib: false };
supportedProperties["cx"]      = { type: "length", isSVGAttrib: true };

// For browsers that support transform as a style attribute on SVG we can
// set isSVGAttrib to false
supportedProperties["transform"] = { type: "transform", isSVGAttrib: true };
supportedProperties["-webkit-transform"] =
	{ type: "transform", isSVGAttrib: false };

function propertyIsNumber(property) {
	var propDetails = supportedProperties[property];
	return propDetails && propDetails.type === "number";
}

function propertyIsLength(property) {
	var propDetails = supportedProperties[property];
	return propDetails && propDetails.type === "length";
}

function propertyIsTransform(property) {
	var propDetails = supportedProperties[property];
	return propDetails && propDetails.type === "transform";
}

function propertyIsSVGAttrib(property, target) {
	if (target.namespaceURI !== "http://www.w3.org/2000/svg")
		return false;
	var propDetails = supportedProperties[property];
	return propDetails && propDetails.isSVGAttrib;
}

/**
 * Interpolate the given property name (f*100)% of the way from 'from' to 'to'.
 * 'from' and 'to' are both CSS value strings.
 * requires the target element to be able to determine whether the given property
 * is an SVG attribute or not, as this impacts the conversion of the interpolated
 * value back into a CSS value string for transform translations.
 * e.g. interpolate("transform", elem, "rotate(40deg)", "rotate(50deg)", 0.3);
 *   will return "rotate(43deg)".
 */
function interpolate(property, target, from, to, f) {
	var svgMode = propertyIsSVGAttrib(property, target);
	from = fromCssValue(property, from);
	to = fromCssValue(property, to);
	if (propertyIsNumber(property)) {
		return toCssValue(property, _interp(from, to, f), svgMode);
	} else if (propertyIsLength(property)) {
		return toCssValue(property, [_interp(from[0], to[0], f), "px"], svgMode);
	} else if (propertyIsTransform(property)) {
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
				"Transform types should match or one should be the underlying value");
			var type = from[i].t ? from[i].t : to[i].t;
			out.push({t: type, d:_interp(from[0].d, to[0].d, f)});
		}
		return toCssValue(property, out, svgMode);
	} else {
		throw "UnsupportedProperty";
	}
}

/**
 * Convert the provided interpolable value for the provided property to a CSS value
 * string. Note that SVG transforms do not require units for translate or rotate values
 * while CSS properties require 'px' or 'deg' units.
 */
function toCssValue(property, value, svgMode) {
	if (propertyIsNumber(property)) {
		return value + "";
	} else if (propertyIsLength(property)) {
		return value[0] + value[1];
	} else if (propertyIsTransform(property)) {
		// TODO: fix this :)
		console.assert(value[0].t, "transform type should be resolved by now");
		switch (value[0].t) {
			case "rotate":
			case "rotateY":
			{
				var unit = svgMode ? "" : "deg";
				return value[0].t + "(" + value[0].d + unit + ")";
			}
			case "translate":
			{
				var unit = svgMode ? "" : "px";
				if (value[0].d[1] === 0) {
					return value[0].t + "(" + value[0].d[0] + unit + ")";
				} else {
					return value[0].t + "(" + value[0].d[0] + unit + ", " +
								 value[0].d[1] + unit + ")";
				}
			}
			case "scale":
				if (value[0].d[0] === value[0].d[1]) {
					return value[0].t + "(" + value[0].d[0] + ")";
				} else {
					return value[0].t + "(" + value[0].d[0] + ", " + value[0].d[1] + ")";
				}
		}
	} else {
		throw "UnsupportedProperty";
	}
}

function extractDeg(deg) {
	var num  = Number(deg[1]);
	switch (deg[2]) {
	case "grad":
		return num / 400 * 360;
	case "rad":
		return num / 2 / Math.PI * 360;
	case "turn":
		return num * 360;
	default:
		return num;
	}
}

function extractTranslationValues(lengths) {
	// XXX Assuming all lengths are px for now
	var length1 = Number(lengths[1]);
	var length2 = lengths[3] ? Number(lengths[3]) : 0;
	return [length1, length2];
}

function extractScaleValues(scales) {
	var scaleX = Number(scales[1]);
	var scaleY = scales[2] ? Number(lengths[2]) : scaleX;
	return [scaleX, scaleY];
}

var transformREs =
	[
		[/^\s*rotate\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)?\)/, extractDeg, "rotate"],
		[/^\s*rotateY\(([+-]?(?:\d+|\d*\.\d+))(deg|grad|rad|turn)\)/, extractDeg, "rotateY"],
		[/^\s*translate\(([+-]?(?:\d+|\d*\.\d+))(px)?(?:\s*,\s*([+-]?(?:\d+|\d*\.\d+))(px)?)?\)/,
		 extractTranslationValues, "translate"],
		[/^\s*scale\((\d+|\d*\.\d+)(?:\s*,\s*(\d+|\d*.\d+))?\)/, extractScaleValues, "scale"]
	];

function fromCssValue(property, value) {
	if (propertyIsNumber(property)) {
		return value !== "" ? Number(value) : null;
	} else if (propertyIsLength(property)) {
		return value !== ""
		       ? [Number(value.substring(0, value.length - 2)), "px"]
		       : [null, null];
	} else if (propertyIsTransform(property)) {
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
	} else {
		throw "UnsupportedProperty";
	}
}

function setValue(target, property, value) {
	if (propertyIsSVGAttrib(property, target)) {
		target.setAttribute(property, value);
	} else {
		target.style[property] = value;
	}
}

function getValue(target, property) {
	if (propertyIsSVGAttrib(property, target)) {
		return target.getAttribute(property);
	} else {
		return window.getComputedStyle(target)[property];
	}
}

var rAFNo = undefined;

var DEFAULT_GROUP = new AnimGroup("par", null, [], {fill: "forwards", name: "DEFAULT"}, 0, undefined);

DEFAULT_GROUP.oldFuncs = new Array();

DEFAULT_GROUP._tick = function(parentTime) {
		this.updateTimeMarkers(parentTime);

		// Clear old effect in reverse
		for (var i = this.oldFuncs.length - 1; i >= 0; i--) {
			if (this.oldFuncs[i].hasOwnProperty('clearFunc')) {
				this.oldFuncs[i].clearFunc();
			}
		}

		// Get animations for this sample
		var funcs = new Array();
		var allFinished = true;
		this.children.forEach(function(child) {
			funcs = funcs.concat(child._getSampleFuncs());
			allFinished &= parentTime > child.endTime;
		}.bind(this));

		// Apply animations in order
		funcs.sort(function(funcA, funcB) {
			return funcA.startTime < funcB.startTime
				? -1
				: funcA.startTime === funcB.startTime ? 0 : 1;
		});
		for (var i = 0; i < funcs.length; i++) {
			if (funcs[i].hasOwnProperty('sampleFunc')) {
				funcs[i].sampleFunc();
			}
		}
		this.oldFuncs = funcs;

		return !allFinished;
}
DEFAULT_GROUP.currentState = function() {
	return this.iterationTime + " " + (rAFNo != undefined ? "ticking" : "stopped") + " " + this.toString();
}.bind(DEFAULT_GROUP);

var now = undefined;

// massive hack to allow things to be added to the parent group and start playing. Maybe this is right though?
DEFAULT_GROUP.__defineGetter__("iterationTime", function() {
	if (now == undefined) {
		now = Date.now();
		window.setTimeout(function() { now = undefined; }, 0);
	}
	return (now - _startTime) / 1000})

var _startTime = Date.now();

var requestAnimationFrame = window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.msRequestAnimationFrame

var ticker = function(_time) {
	var time = _time - _startTime;
	if (DEFAULT_GROUP._tick(time / 1000)) {
		rAFNo = requestAnimationFrame(ticker);
	} else {
		rAFNo = undefined;
	}
};

function maybeRestartAnimation() {
	if (rAFNo != undefined) {
		return;
	}
	rAFNo = requestAnimationFrame(ticker);
}
